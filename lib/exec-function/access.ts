/**
 * Access control for a single-user tool.
 *
 * No accounts — the brief rules them out and one person does not need a login.
 * What the API does need is to not be a public write endpoint: anyone who can
 * POST can put fabricated points on the trend charts, which is the one thing
 * that would make the whole record worthless, and anyone who can GET can read
 * a personal cognitive-assessment history.
 *
 * Two ways in, in this order:
 *
 *   1. The hub's existing admin cookie. If the browser is already signed in at
 *      /admin/login, it is already trusted with more than this, so nothing new
 *      needs provisioning and no key ever appears in a URL. This is the path
 *      for using the tool on a device you sit at.
 *
 *   2. A bearer key, for the daily email link and the cron, which have no
 *      cookie jar. It is DERIVED from SUPABASE_SERVICE_ROLE_KEY, never sent
 *      raw, and grants strictly less than its root — see effectiveKey below.
 *      A link is a leakier place than a cookie (email, browser history,
 *      localStorage), so it must not carry a secret that opens anything else.
 *
 * Set EFA_ACCESS_KEY to use a dedicated key instead; it is then used as-is,
 * because a purpose-made key is already scoped.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCESS_HEADER = "x-efa-key";
export const ACCESS_QUERY_PARAM = "k";
export const ADMIN_COOKIE = "hub-edit";

/** Domain separation: this token must not be valid anywhere else. */
const DERIVATION_LABEL = "exec-function-assessment/access/v1";

/**
 * The bearer key this deployment expects.
 *
 * Derived from SUPABASE_SERVICE_ROLE_KEY, for two reasons.
 *
 * Security: the derived token grants strictly LESS than the secret it comes
 * from. Anyone holding the service-role key can already read and write this
 * table directly, so a leaked link escalates to nothing. Deriving from
 * ADMIN_SECRET instead would mint a token for one thing (assessment data) out
 * of a secret for another (editing the whole hub) — a worse trade.
 *
 * Practical: both environments that need it already have it, from the vault,
 * tracked by scripts/sync-secrets.sh. Vercel gets it for the API routes and
 * GitHub Actions gets it for the cron, so the daily email needs no new secret
 * anywhere. ADMIN_SECRET is in neither the vault nor GitHub — it is a hand-set
 * Vercel value — so deriving from it would have meant provisioning it twice.
 *
 * Rotating the service-role key rotates this too, invalidating old email
 * links. Correct, if occasionally surprising.
 */
export function effectiveKey(): string | null {
  const dedicated = process.env.EFA_ACCESS_KEY;
  if (dedicated) return dedicated;

  const root = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!root) return null;

  return createHmac("sha256", root).update(DERIVATION_LABEL).digest("hex");
}

/** False when no bearer key can be formed — the tool then runs local-only. */
export function isAccessConfigured(): boolean {
  return effectiveKey() !== null;
}

/** Constant-time compare, so a wrong key leaks nothing through response timing. */
function secretEquals(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(expected, "utf8");
  // timingSafeEqual throws on a length mismatch, which would itself be a
  // timing signal — compare padded buffers and fold length into the result.
  const length = Math.max(a.length, b.length);
  const padA = Buffer.alloc(length);
  const padB = Buffer.alloc(length);
  a.copy(padA);
  b.copy(padB);
  return timingSafeEqual(padA, padB) && a.length === b.length;
}

/** The bearer key on a request, from either the header or the link query. */
export function readKey(request: Request): string | null {
  const header = request.headers.get(ACCESS_HEADER);
  if (header) return header;
  return new URL(request.url).searchParams.get(ACCESS_QUERY_PARAM);
}

/** Whether the browser is already signed in to the hub's admin area. */
function hasAdminCookie(request: Request): boolean {
  const admin = process.env.ADMIN_SECRET;
  if (!admin) return false;

  const header = request.headers.get("cookie");
  if (!header) return false;

  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_COOKIE) {
      return secretEquals(decodeURIComponent(rest.join("=")), admin);
    }
  }
  return false;
}

/** True when the request may read and write the session log. */
export function isAuthorized(request: Request): boolean {
  if (hasAdminCookie(request)) return true;

  const expected = effectiveKey();
  const candidate = readKey(request);
  if (!expected || !candidate) return false;
  return secretEquals(candidate, expected);
}
