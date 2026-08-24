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
 *      cookie jar. The key is DERIVED from ADMIN_SECRET rather than being it:
 *      lib/pdf-auth.ts already records why the raw secret in a cookie is a
 *      weak spot ("one captured browser jar yields permanent access"), and a
 *      link is worse than a cookie — it lands in email, browser history and
 *      localStorage. The derived value grants this table and nothing else.
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
 * Deriving rather than reusing means a leaked link cannot be replayed against
 * /admin. Rotating ADMIN_SECRET rotates this too, which invalidates old email
 * links — correct, if occasionally surprising.
 */
export function effectiveKey(): string | null {
  const dedicated = process.env.EFA_ACCESS_KEY;
  if (dedicated) return dedicated;

  const admin = process.env.ADMIN_SECRET;
  if (!admin) return null;

  return createHmac("sha256", admin).update(DERIVATION_LABEL).digest("hex");
}

/** False when neither a dedicated key nor ADMIN_SECRET exists — local-only. */
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
