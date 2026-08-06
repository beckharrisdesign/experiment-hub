/**
 * Session and allowlist for the hosted pdf-metadata-viewer.
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D5.
 *
 * Two constraints shape this file:
 *
 * 1. **The spec requires refusal before any storage, database, or third-party
 *    call.** The gate therefore runs in middleware, which is the edge runtime —
 *    so this uses Web Crypto (`crypto.subtle`), never `node:crypto`, and the
 *    session is stateless. A database-backed session would forfeit exactly the
 *    property the requirement exists for.
 *
 * 2. **The cookie must never be a credential.** The hub's existing admin gate
 *    stores `ADMIN_SECRET` itself in the cookie, so one captured browser jar
 *    yields permanent access on every device. Here the cookie is a signed,
 *    expiring assertion about an identity Google vouched for; capturing it buys
 *    one bounded session and nothing else.
 */

export interface PdfSession {
  /** Google `sub` — stable per account. The allowlist key. */
  sub: string;
  /** Carried for display only. Never used for authorization: emails are reassignable. */
  email: string;
  /** Unix seconds. */
  exp: number;
}

export const PDF_SESSION_COOKIE = "pdf-session";

/** Eight hours, matching the hub's existing admin cookie lifetime. */
export const PDF_SESSION_TTL_SECONDS = 60 * 60 * 8;

// --- encoding ---------------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Returns a view over a plain ArrayBuffer, not ArrayBufferLike: `crypto.subtle`
// takes BufferSource, which excludes a SharedArrayBuffer-backed view.
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// --- session ----------------------------------------------------------------

/**
 * Produce `<payload>.<signature>`, both base64url. The payload is readable by
 * anyone holding the cookie — that is fine, it asserts nothing secret. The
 * signature is what makes it unforgeable.
 */
export async function signSession(
  session: PdfSession,
  secret: string,
): Promise<string> {
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(session)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verify signature and expiry. Returns null for anything that is not a valid,
 * unexpired session — a caller cannot distinguish a forged token from an
 * expired one from a malformed one, which is deliberate.
 *
 * Uses `crypto.subtle.verify` rather than comparing strings, so the comparison
 * is not variable-time over the signature.
 */
export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<PdfSession | null> {
  if (!token || !secret) return null;

  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64Url(signature),
      new TextEncoder().encode(payload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  let session: PdfSession;
  try {
    session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
  } catch {
    return null;
  }

  if (typeof session?.sub !== "string" || !session.sub) return null;
  if (typeof session?.exp !== "number") return null;
  if (session.exp <= Math.floor(Date.now() / 1000)) return null;

  return session;
}

// --- allowlist --------------------------------------------------------------

/**
 * Accounts permitted to sign in, as Google `sub` claims.
 *
 * Keyed on `sub` and never on email: emails are reassignable, particularly in
 * Workspace, so an allowlist keyed on one would hand access to whoever inherits
 * an address. Single-tenancy is this list holding one entry — enforced, not
 * merely implied by the absence of a sign-up form.
 */
export function allowedSubs(env: Record<string, string | undefined>): string[] {
  return (env.PDF_ALLOWED_GOOGLE_SUBS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Fails closed: an unset or empty allowlist admits nobody. */
export function isAllowedAccount(
  sub: string | undefined,
  env: Record<string, string | undefined>,
): boolean {
  if (!sub) return false;
  const allowed = allowedSubs(env);
  return allowed.length > 0 && allowed.includes(sub);
}

/**
 * Gate an identity returned by Google's token endpoint.
 *
 * `email_verified` is checked because an unverified address means Google has
 * not established the holder controls it, and an allowlisted account paired
 * with an unverified email is a route in worth closing.
 */
export function acceptGoogleIdentity(
  claims: { sub?: string; email?: string; email_verified?: boolean },
  env: Record<string, string | undefined>,
): PdfSession | null {
  if (!claims?.sub) return null;
  if (claims.email_verified !== true) return null;
  if (!isAllowedAccount(claims.sub, env)) return null;

  return {
    sub: claims.sub,
    email: claims.email ?? "",
    exp: Math.floor(Date.now() / 1000) + PDF_SESSION_TTL_SECONDS,
  };
}

// --- route matching ---------------------------------------------------------

/** Every surface the gate covers. */
const GATED_PREFIXES = [
  "/api/pdf-documents",
  "/api/pdf-drive",
  "/pdf-metadata-viewer",
];

/** The sign-in handshake itself cannot require a session. */
const OPEN_PREFIXES = [
  "/api/pdf-drive/connect",
  "/api/pdf-drive/callback",
  "/pdf-metadata-viewer/sign-in",
];

export function isGatedPath(pathname: string): boolean {
  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return GATED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
