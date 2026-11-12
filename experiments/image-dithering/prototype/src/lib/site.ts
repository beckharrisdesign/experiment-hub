/** Absolute URLs for the page and its files, from `site` + the configurable base path. */
export function pageUrl(site: URL | undefined, base: string): string {
  const b = base.endsWith("/") ? base : `${base}/`;
  return new URL(b, site ?? "https://image-dithering.vercel.app").href;
}
export const fileUrl = (page: string, file: string) => new URL(file, page).href;
