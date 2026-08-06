/**
 * Google OAuth handshake and Drive grant storage.
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D5, D9.
 *
 * One client, one consent. Identity (`openid email profile`) and Drive access
 * (`drive.file`) are requested together, so "sign in" and "connect Drive" are a
 * single approval rather than two. The identity half becomes a signed session
 * cookie; the Drive half becomes a row in `pdf_drive_grant` that never leaves
 * the server.
 */
import { getPdfAdminClient } from "@/lib/pdf-documents";

/**
 * Exactly the four scopes registered on the consent screen, all non-sensitive.
 * Adding a restricted Drive scope here would pull in Google's CASA security
 * assessment and the seven-day refresh-token expiry of Testing status — the two
 * things D9 exists to avoid. Confirmed non-sensitive in the Console 2026-08-06.
 */
export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.file",
] as const;

export const OAUTH_STATE_COOKIE = "pdf-oauth-state";

/**
 * Carries the refused account's `sub` to the sign-in page so the allowlist can
 * be bootstrapped without reading server logs. Whoever sees it just proved they
 * control that account, so it reveals nothing they could not decode from their
 * own id_token.
 */
export const REFUSED_SUB_COOKIE = "pdf-refused-sub";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export interface GoogleIdentity {
  sub?: string;
  email?: string;
  email_verified?: boolean;
}

export interface DriveGrant {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
  googleAccountEmail: string | null;
}

function requireConfig() {
  const clientId = process.env.PDF_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.PDF_GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.PDF_GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "PDF_GOOGLE_CLIENT_ID, PDF_GOOGLE_CLIENT_SECRET and PDF_GOOGLE_REDIRECT_URI must be set",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/** Random, unguessable value tying a callback to the request that started it. */
export function newOAuthState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = requireConfig();
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("state", state);
  // offline + consent: without both, Google returns a refresh token only on the
  // very first authorization, so a re-consent would silently leave the grant
  // unable to outlive its access token.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  return url.toString();
}

/**
 * Read the claims out of an `id_token` without verifying its signature.
 *
 * Safe specifically here, and only here: this token came from a direct
 * server-to-server HTTPS call to Google's token endpoint in exchange for a code
 * we issued, so there is no untrusted party in the path. An `id_token` arriving
 * from a browser would need full JWKS verification.
 */
export function readIdTokenClaims(idToken: string): GoogleIdentity | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return JSON.parse(json) as GoogleIdentity;
  } catch {
    return null;
  }
}

export interface TokenExchange {
  identity: GoogleIdentity | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<TokenExchange> {
  const { clientId, clientSecret, redirectUri } = requireConfig();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    // Google's body echoes the client_id; keep it out of logs and responses.
    throw new Error(`Token exchange failed (${response.status})`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    id_token?: string;
  };

  return {
    identity: data.id_token ? readIdTokenClaims(data.id_token) : null,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
    scope: data.scope ?? null,
  };
}

// --- grant storage ----------------------------------------------------------

/** Singleton row: single tenancy enforced by the table, not by convention. */
export async function storeDriveGrant(input: {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
  email: string | null;
  sub: string | null;
}): Promise<void> {
  const { error } = await getPdfAdminClient().from("pdf_drive_grant").upsert(
    {
      id: true,
      access_token: input.accessToken,
      // A re-consent that returns no refresh token must not erase the one held.
      ...(input.refreshToken ? { refresh_token: input.refreshToken } : {}),
      expires_at: input.expiresAt,
      scope: input.scope,
      google_account_email: input.email,
      google_sub: input.sub,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`Failed to store Drive grant: ${error.message}`);
}

export async function readDriveGrant(): Promise<DriveGrant | null> {
  const { data, error } = await getPdfAdminClient()
    .from("pdf_drive_grant")
    .select("access_token, refresh_token, expires_at, scope, google_account_email")
    .maybeSingle();

  if (error) throw new Error(`Failed to read Drive grant: ${error.message}`);
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    accessToken: String(row.access_token ?? ""),
    refreshToken: (row.refresh_token as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    scope: (row.scope as string) ?? null,
    googleAccountEmail: (row.google_account_email as string) ?? null,
  };
}

export interface DriveFile {
  id: string;
  name: string;
  headRevisionId: string | null;
  /** The file's own metadata as Drive reports it — the D8 merge baseline. */
  snapshot: Record<string, unknown>;
}

/**
 * List the PDFs in a granted folder.
 *
 * Under `drive.file` this only returns files the grant covers, which is exactly
 * how the "documents need access" gap in task 5.5 becomes detectable: Drive can
 * report a folder containing more than this returns.
 */
export async function listPdfsInFolder(
  accessToken: string,
  folderId: string,
): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set(
      "q",
      `'${folderId.replace(/'/g, "\\'")}' in parents and mimeType='application/pdf' and trashed=false`,
    );
    url.searchParams.set(
      "fields",
      "nextPageToken, files(id,name,headRevisionId,modifiedTime,size,properties,description)",
    );
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401 || response.status === 403) {
      throw new DriveReauthorizationRequired(
        "Drive refused the request; the grant may have been revoked",
      );
    }
    if (!response.ok) {
      throw new Error(`Drive list failed (${response.status})`);
    }

    const data = (await response.json()) as {
      nextPageToken?: string;
      files?: Array<Record<string, unknown>>;
    };

    for (const f of data.files ?? []) {
      if (typeof f.id !== "string" || typeof f.name !== "string") continue;
      files.push({
        id: f.id,
        name: f.name,
        headRevisionId: (f.headRevisionId as string) ?? null,
        snapshot: {
          name: f.name,
          modifiedTime: f.modifiedTime ?? null,
          size: f.size ?? null,
          description: f.description ?? null,
        },
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

/**
 * Connection state for display, carrying no tokens.
 *
 * Separate from `readDriveGrant` on purpose: a page component has no business
 * holding an access token, and the easiest way to guarantee that is to give it
 * a shape that cannot contain one.
 */
export async function getDriveConnection(): Promise<{
  connected: boolean;
  email: string | null;
  hasRefreshToken: boolean;
}> {
  const grant = await readDriveGrant();
  if (!grant?.accessToken) {
    return { connected: false, email: null, hasRefreshToken: false };
  }
  return {
    connected: true,
    email: grant.googleAccountEmail,
    hasRefreshToken: Boolean(grant.refreshToken),
  };
}

/** Distinguishes "you never connected" from "your grant stopped working". */
export class DriveReauthorizationRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveReauthorizationRequired";
  }
}

/** A minute of slack, so a token does not expire mid-request. */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Current access token, refreshed if needed. Never prompts: a refresh that
 * Google rejects means the grant was revoked, which is a different situation
 * from a missing document and is surfaced as such.
 */
export async function getValidAccessToken(): Promise<string> {
  const grant = await readDriveGrant();
  if (!grant) {
    throw new DriveReauthorizationRequired("Google Drive is not connected");
  }

  const expiresAt = grant.expiresAt ? Date.parse(grant.expiresAt) : 0;
  if (expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    return grant.accessToken;
  }

  if (!grant.refreshToken) {
    throw new DriveReauthorizationRequired(
      "Drive access expired and no refresh token is held",
    );
  }

  const { clientId, clientSecret } = requireConfig();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: grant.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    // invalid_grant here means revoked or expired — not a transient failure.
    throw new DriveReauthorizationRequired(
      "Drive authorization was revoked or is no longer valid",
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    scope?: string;
  };

  await storeDriveGrant({
    accessToken: data.access_token,
    refreshToken: null, // a refresh response carries no new refresh token
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
    scope: data.scope ?? grant.scope,
    email: grant.googleAccountEmail,
    sub: null,
  });

  return data.access_token;
}
