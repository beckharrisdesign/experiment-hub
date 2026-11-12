import { inject, pageview, track } from "@vercel/analytics";

/**
 * Cookieless Vercel Web Analytics (Katy, 2026-11-12: "Yes, add it", then "Yes, do both").
 *
 * Every download is recorded two ways:
 *  1. Custom event `png_downloaded {exportFor, mode}`. Pro records custom events with at most
 *     2 properties, so the two kept are the ones that answer the experiment: designers (screen)
 *     vs laser makers, and dither vs halftone. Custom events stop if the plan reverts to Hobby.
 *  2. A page view of `/downloaded/<exportFor>-<mode>`. Page views work on Hobby, so the count
 *     survives the end of the Pro trial. Side effect: total page views include downloads.
 *
 * Loads only on the production host, so local runs, tests and CI send nothing. Never sends the
 * file name, image data, or free-text choices.
 */
const PRODUCTION_HOSTS = ["dither-halftone-generator.vercel.app"];

export const analyticsEnabledOn = (hostname: string): boolean => PRODUCTION_HOSTS.includes(hostname);

export type DownloadChoice = {
  mode: "dither" | "halftone";
  exportFor: "screen" | "laser";
  /** Accepted so callers can pass their state, and deliberately not sent. */
  effectLabel?: string;
  material?: string | null;
  sourceName?: string;
};

export function downloadEvent(c: DownloadChoice): { name: "png_downloaded"; data: { exportFor: string; mode: string } } {
  return { name: "png_downloaded", data: { exportFor: c.exportFor, mode: c.mode } };
}

export function downloadPageview(c: DownloadChoice): { route: string; path: string } {
  return { route: "/downloaded/[kind]", path: `/downloaded/${c.exportFor}-${c.mode}` };
}

export function startAnalytics(): void {
  if (analyticsEnabledOn(location.hostname)) inject({ mode: "production", framework: "astro" });
}

export function trackDownload(c: DownloadChoice): void {
  if (!analyticsEnabledOn(location.hostname)) return;
  const e = downloadEvent(c);
  track(e.name, e.data);
  pageview(downloadPageview(c));
}
