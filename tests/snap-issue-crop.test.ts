import { describe, it, expect } from "vitest";
import { cssRectToBitmapRect } from "../experiments/snap-issue/extension/crop.js";

describe("snap-issue crop math", () => {
  it("maps CSS viewport rect to bitmap space using capture dimensions", () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 };
    const viewportCss = { width: 400, height: 300 };
    const imageWidth = 800;
    const imageHeight = 600;
    const out = cssRectToBitmapRect(rect, viewportCss, imageWidth, imageHeight);
    expect(out).toEqual({ sx: 200, sy: 100, sw: 400, sh: 200 });
  });

  it("handles fractional scale (simulated fractional DPR)", () => {
    const rect = { left: 1, top: 1, width: 10, height: 10 };
    const viewportCss = { width: 100, height: 100 };
    const imageWidth = 125;
    const imageHeight = 125;
    const out = cssRectToBitmapRect(rect, viewportCss, imageWidth, imageHeight);
    expect(out.sx).toBe(1);
    expect(out.sy).toBe(1);
    expect(out.sw).toBe(13);
    expect(out.sh).toBe(13);
  });
});
