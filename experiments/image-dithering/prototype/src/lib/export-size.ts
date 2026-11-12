import { lockAspect, mmToPx } from "../engine/size";

/**
 * Largest side a download may have. A canvas this size is ~400 MB of RGBA at 10,000 × 10,000;
 * beyond it phones (and some desktops) fail to allocate. 10,000 px is 846 mm at 300 DPI, far past
 * a hobby laser's bed. Review queue #50: a product default, adjustable.
 */
export const MAX_SIDE_PX = 10_000;

export const clampWidthMm = (v: number): number => (Number.isFinite(v) ? Math.min(2000, Math.max(1, v)) : 100);
export const clampWidthPx = (v: number): number => (Number.isFinite(v) ? Math.min(8000, Math.max(16, Math.round(v))) : 800);

export type ExportSizeInput = { exportFor: "screen" | "laser"; widthMm: number; widthPx: number; dpi: number; srcW: number; srcH: number };

/** The download's pixel size. Too large → refused (never silently shrunk: a laser file must be the size asked for). */
export function exportPixels(o: ExportSizeInput): { w: number; h: number; heightMm: number; tooLarge: boolean } {
  if (o.exportFor === "laser") {
    const { heightMm } = lockAspect(o.srcW, o.srcH, { widthMm: o.widthMm });
    const w = mmToPx(o.widthMm, o.dpi), h = mmToPx(heightMm, o.dpi);
    return { w, h, heightMm, tooLarge: Math.max(w, h) > MAX_SIDE_PX };
  }
  const w = o.widthPx, h = Math.max(1, Math.round((o.widthPx * o.srcH) / o.srcW));
  return { w, h, heightMm: 0, tooLarge: Math.max(w, h) > MAX_SIDE_PX };
}
