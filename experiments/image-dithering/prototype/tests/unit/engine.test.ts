import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mmToPx, lockAspect } from "../../src/engine/size";
import { ALGORITHMS, ERROR_DIFFUSION, dither } from "../../src/engine/dither";
import { adjustTone, processImage, DEFAULT_SETTINGS } from "../../src/engine/pipeline";
import { flat, horizontalGradient, photoLike, whiteShare } from "./fixtures";

const hash = (data: Uint8ClampedArray) => createHash("sha256").update(data).digest("hex");

// Literal lists from the brief, so the per-algorithm tests exist even before the engine does.
const EIGHT = [
  "floyd-steinberg",
  "atkinson",
  "jarvis",
  "stucki",
  "sierra-lite",
  "bayer-4",
  "bayer-8",
  "threshold",
] as const;
const DIFFUSION = ["floyd-steinberg", "atkinson", "jarvis", "stucki", "sierra-lite"] as const;

describe("size", () => {
  // Test 1
  it("converts mm to px at a DPI", () => {
    expect(mmToPx(100, 300)).toBe(1181);
    expect(mmToPx(25.4, 300)).toBe(300);
  });

  // Test 2
  it("locks aspect: 4000×3000 at 100 mm wide is 75 mm tall", () => {
    expect(lockAspect(4000, 3000, { widthMm: 100 })).toEqual({ widthMm: 100, heightMm: 75 });
  });
});

describe("dither", () => {
  // Test 3
  it("threshold at 128 maps [0, 127, 128, 255] to [0, 0, 255, 255]", () => {
    const g = { width: 4, height: 1, data: new Uint8ClampedArray([0, 127, 128, 255]) };
    expect(Array.from(dither(g, "threshold").data)).toEqual([0, 0, 255, 255]);
  });

  it("offers exactly the eight algorithms in the brief, five of them error diffusion", () => {
    expect([...ALGORITHMS].sort()).toEqual([...EIGHT].sort());
    expect([...ERROR_DIFFUSION].sort()).toEqual([...DIFFUSION].sort());
  });

  // Test 4
  it.each(EIGHT)("%s outputs only 0 and 255", (algorithm) => {
    const out = dither(photoLike(48, 32), algorithm);
    for (const v of out.data) expect(v === 0 || v === 255).toBe(true);
  });

  // Test 5
  describe.each(DIFFUSION)("%s preserves tone on flat gray", (algorithm) => {
    it("50% gray → 50% ± 2% white", () => {
      expect(Math.abs(whiteShare(dither(flat(64, 64, 128), algorithm)) - 0.5)).toBeLessThanOrEqual(0.02);
    });
    // Atkinson diffuses only 6/8 of each pixel's error by design, so it pushes tones toward
    // the extremes. Measured 2026-11-11 on flat 25% gray (value 64): 17.5% white at 64×64 and
    // 17.7% at 256×256, the same at both sizes, so this comes from the algorithm, not the edges.
    // Its tolerance is set explicitly at ±8% here (the brief allows this); every other kernel
    // stays at ±2%. At 50% gray Atkinson is held to ±2% like the rest.
    const tolerance25 = algorithm === "atkinson" ? 0.08 : 0.02;
    it(`25% gray → 25% ± ${tolerance25 * 100}% white`, () => {
      expect(Math.abs(whiteShare(dither(flat(64, 64, 64), algorithm)) - 0.25)).toBeLessThanOrEqual(tolerance25);
    });
  });

  // Test 6
  it("Bayer 4×4 on flat 50% gray is exactly 50% white", () => {
    expect(whiteShare(dither(flat(64, 64, 128), "bayer-4"))).toBe(0.5);
  });

  // Test 11
  it("serpentine ON and OFF differ on a horizontal gradient", () => {
    const g = horizontalGradient(64, 16);
    const on = dither(g, "floyd-steinberg", { serpentine: true });
    const off = dither(g, "floyd-steinberg", { serpentine: false });
    expect(hash(on.data)).not.toBe(hash(off.data));
  });
});

describe("pipeline", () => {
  // Test 7
  it.each(EIGHT)("%s is deterministic", (algorithm) => {
    const settings = { ...DEFAULT_SETTINGS, algorithm, widthPx: 40, heightPx: 30 };
    const a = processImage(photoLike(80, 60), settings);
    const b = processImage(photoLike(80, 60), settings);
    expect(hash(a.data)).toBe(hash(b.data));
  });

  // Test 8
  it("gamma 1, brightness 0, contrast 0 leave the grayscale input unchanged", () => {
    const g = photoLike(32, 32);
    const out = adjustTone(g, { brightness: 0, contrast: 0, gamma: 1 });
    expect(Array.from(out.data)).toEqual(Array.from(g.data));
  });

  // Test 9
  it("invert ON turns flat 25% gray into 75% ± 2% white after Floyd–Steinberg", () => {
    const out = processImage(flat(64, 64, 64), {
      ...DEFAULT_SETTINGS,
      algorithm: "floyd-steinberg",
      invert: true,
      widthPx: 64,
      heightPx: 64,
    });
    expect(Math.abs(whiteShare(out) - 0.75)).toBeLessThanOrEqual(0.02);
  });

  // Test 10 — checked on every pixel, not only column 0, and for every algorithm.
  it.each(EIGHT)("%s: mirrored output is the unmirrored output flipped", (algorithm) => {
    const src = photoLike(50, 20);
    const base = { ...DEFAULT_SETTINGS, algorithm, widthPx: 50, heightPx: 20 };
    const plain = processImage(src, { ...base, mirror: false });
    const mirrored = processImage(src, { ...base, mirror: true });
    const w = plain.width;
    for (let y = 0; y < plain.height; y++) {
      expect(mirrored.data[y * w + 0]).toBe(plain.data[y * w + (w - 1)]);
      for (let x = 0; x < w; x++) {
        expect(mirrored.data[y * w + x]).toBe(plain.data[y * w + (w - 1 - x)]);
      }
    }
  });

  it("resamples to the requested pixel size", () => {
    const out = processImage(photoLike(80, 60), { ...DEFAULT_SETTINGS, widthPx: 33, heightPx: 17 });
    expect([out.width, out.height, out.data.length]).toEqual([33, 17, 33 * 17]);
  });
});
