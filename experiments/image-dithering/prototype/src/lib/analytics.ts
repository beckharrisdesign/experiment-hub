import { inject, track } from "@vercel/analytics";

/**
 * Cookieless Vercel Web Analytics: pageviews plus ONE custom event, `png_downloaded`.
 * Katy approved it on 2026-11-12 ("Yes, add it"). It only loads on the production host, so local
 * runs, tests and CI make no analytics requests. The event carries the choices only, never the
 * file name or any image data.
 */
const PRODUCTION_HOSTS = ["dither-halftone-generator.vercel.app"];

export const analyticsEnabledOn = (hostname: string): boolean => PRODUCTION_HOSTS.includes(hostname);

export type DownloadChoice = {
  mode: "dither" | "halftone";
  effectLabel: string;
  exportFor: "screen" | "laser";
  material: string | null;
  /** Accepted so callers can pass their state, and deliberately dropped. */
  sourceName?: string;
};

export function downloadEvent(c: DownloadChoice): { name: "png_downloaded"; data: Record<string, string> } {
  return {
    name: "png_downloaded",
    data: { mode: c.mode, effect: c.effectLabel, exportFor: c.exportFor, material: c.material ?? "none" },
  };
}

export function startAnalytics(): void {
  if (analyticsEnabledOn(location.hostname)) inject({ mode: "production", framework: "astro" });
}

export function trackDownload(c: DownloadChoice): void {
  if (!analyticsEnabledOn(location.hostname)) return;
  const e = downloadEvent(c);
  track(e.name, e.data);
}
