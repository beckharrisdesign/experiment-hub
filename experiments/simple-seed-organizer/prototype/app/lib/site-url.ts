/**
 * The one public origin for indexable URLs (sitemap, robots, canonicals,
 * metadataBase).
 *
 * The same pages are served on simple-seed-organizer.vercel.app and
 * simpleseedorganizer.app, and production's NEXT_PUBLIC_SITE_URL was set to
 * `http://simpleseedorganizer.app`, so the sitemap advertised http URLs.
 * This normalizes whatever the env holds: https (except localhost), no
 * trailing slash, and the custom domain when unset or invalid.
 *
 * Auth redirects (lib/auth-actions.ts) deliberately do not use this: their
 * URLs must match Supabase's redirect allowlist exactly.
 */
export const CANONICAL_SITE_URL = "https://simpleseedorganizer.app";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function getSiteUrl(
  value: string | undefined = process.env.NEXT_PUBLIC_SITE_URL
): string {
  if (!value) return CANONICAL_SITE_URL;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return CANONICAL_SITE_URL;
  }

  // mailto:, data:, file: etc. parse fine but their origin is the string
  // "null", which would break `new URL(siteUrl)` for metadataBase.
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return CANONICAL_SITE_URL;
  }

  if (url.protocol === "http:" && !LOCAL_HOSTS.has(url.hostname)) {
    url.protocol = "https:";
  }

  return url.origin;
}
