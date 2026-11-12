import type { APIRoute } from "astro";
import { pageUrl } from "../lib/site";

export const GET: APIRoute = ({ site }) => {
  const url = pageUrl(site, import.meta.env.BASE_URL);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}</loc></url>\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
