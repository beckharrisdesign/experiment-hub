import { describe, expect, it } from "vitest";
import { MAX_SIDE_PX, clampWidthMm, clampWidthPx, exportPixels } from "../../src/lib/export-size";

// Copilot review on PR #591: inputs weren't clamped, and 2,000 mm at 508 DPI is ~40,000 px per side.
describe("export size limits", () => {
  it("laser: 100 mm at 300 DPI for a 4:3 image is 1181 × 886, within limits", () => {
    expect(exportPixels({ exportFor: "laser", widthMm: 100, widthPx: 0, dpi: 300, srcW: 400, srcH: 300 })).toEqual({ w: 1181, h: 886, heightMm: 75, tooLarge: false });
  });

  it("laser: 2,000 mm at 508 DPI is refused as too large, never silently shrunk", () => {
    const r = exportPixels({ exportFor: "laser", widthMm: 2000, widthPx: 0, dpi: 508, srcW: 400, srcH: 300 });
    expect(r.tooLarge).toBe(true);
    expect(Math.max(r.w, r.h)).toBeGreaterThan(MAX_SIDE_PX);
  });

  it("screen: the height follows the image and a very tall result is refused", () => {
    expect(exportPixels({ exportFor: "screen", widthMm: 0, widthPx: 800, dpi: 300, srcW: 400, srcH: 300 })).toMatchObject({ w: 800, h: 600, tooLarge: false });
    expect(exportPixels({ exportFor: "screen", widthMm: 0, widthPx: 8000, dpi: 300, srcW: 100, srcH: 1000 }).tooLarge).toBe(true);
  });

  it("clamps typed sizes to the inputs' ranges", () => {
    expect(clampWidthMm(5000)).toBe(2000);
    expect(clampWidthMm(0)).toBe(1);
    expect(clampWidthMm(Number.NaN)).toBe(100);
    expect(clampWidthPx(99999)).toBe(8000);
    expect(clampWidthPx(3)).toBe(16);
    expect(clampWidthPx(640.6)).toBe(641);
  });
});
