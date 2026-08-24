/**
 * Access control for a single-user tool.
 *
 * There are no accounts here — the brief rules them out and one person does not
 * need a login. What the API does need is to not be a public write endpoint,
 * because anyone who can POST can put fabricated points on the trend charts,
 * which is the one thing that would make the whole record worthless.
 *
 * So: one shared secret. The daily email link carries it, the page keeps it,
 * and every API call presents it. Set EFA_ACCESS_KEY to a long random string.
 */

import { timingSafeEqual } from "node:crypto";

export const ACCESS_HEADER = "x-efa-key";
export const ACCESS_QUERY_PARAM = "k";

/** Constant-time compare, so a wrong key leaks nothing through response timing. */
export function keyMatches(candidate: string | null | undefined): boolean {
  const expected = process.env.EFA_ACCESS_KEY;
  if (!expected || !candidate) return false;

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

/** True when no key is configured at all — the tool then runs local-only. */
export function isAccessConfigured(): boolean {
  return Boolean(process.env.EFA_ACCESS_KEY);
}

/** Pull the key off a request, from either the header or the link query. */
export function readKey(request: Request): string | null {
  const header = request.headers.get(ACCESS_HEADER);
  if (header) return header;
  return new URL(request.url).searchParams.get(ACCESS_QUERY_PARAM);
}
