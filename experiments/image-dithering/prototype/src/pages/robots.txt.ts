import type { APIRoute } from "astro";
import { fileUrl, pageUrl } from "../lib/site";

// Crawlers only read /robots.txt at a host's root. Under a base path (e.g. /dither on the hub's
// domain) this file is served at /dither/robots.txt, and the host's own robots.txt has to list
// the sitemap instead (review queue #42).
export const GET: APIRoute = ({ site }) => {
  const page = pageUrl(site, import.meta.env.BASE_URL);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${fileUrl(page, "sitemap.xml")}\n`, { headers: { "Content-Type": "text/plain" } });
};
