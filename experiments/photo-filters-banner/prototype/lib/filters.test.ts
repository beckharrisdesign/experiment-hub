import { describe, expect, it } from "vitest";
import { applyFilterToImageData } from "./filters";

function mockImageData(width: number, height: number, rgba: number[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  data.set(rgba);
  return { width, height, data } as ImageData;
}

// ---------------------------------------------------------------------------
// Filter presets
// ---------------------------------------------------------------------------

describe("applyFilterToImageData", () => {
  it("leaves pixels unchanged for normal", () => {
    const imageData = mockImageData(2, 1, [
      100, 120, 140, 255, 10, 20, 30, 255,
    ]);
    applyFilterToImageData(imageData, "normal");
    expect(Array.from(imageData.data)).toEqual([
      100, 120, 140, 255, 10, 20, 30, 255,
    ]);
  });

  it("changes pixels for slate preset", () => {
    const imageData = mockImageData(1, 1, [200, 100, 50, 255]);
    applyFilterToImageData(imageData, "slate");
    expect(imageData.data[0]).not.toBe(200);
    expect(imageData.data[1]).not.toBe(100);
  });

  it("changes pixels for high-contrast preset", () => {
    const imageData = mockImageData(1, 1, [90, 110, 130, 255]);
    applyFilterToImageData(imageData, "high-contrast");
    expect(imageData.data[0]).not.toBe(90);
  });
});
