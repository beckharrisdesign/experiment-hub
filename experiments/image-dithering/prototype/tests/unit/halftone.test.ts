import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DOT_SHAPES, SCREENS, halftone } from "../../src/engine/halftone";
import { DEFAULT_SETTINGS, prepareGray, processImage } from "../../src/engine/pipeline";
import { angleDiff, dominantDirection } from "./fft";
import { flat, photoLike } from "./fixtures";

const inkShare = (data: Uint8ClampedArray) => {
  let ink = 0;
  for (const v of data) if (v === 0) ink++;
  return ink / data.length;
};
const hash = (data: Uint8ClampedArray) => createHash("sha256").update(data).digest("hex");
// 10 px cells: 30 LPI at 300 DPI.
const BASE = { lpi: 30, dpi: 300 } as const;

describe("halftone", () => {
  it("offers dot, line and cross screens, and round, square, ellipse and diamond dots", () => {
    expect([...SCREENS].sort()).toEqual(["cross", "dot", "line"]);
    expect([...DOT_SHAPES].sort()).toEqual(["diamond", "ellipse", "round", "square"]);
  });

  // Brief: flat 50% gray at 45° with round dots → 50% ± 3% ink coverage.
  it("flat 50% gray, 45°, round dots → 50% ± 3% ink", () => {
    const out = halftone(flat(200, 200, 128), { ...BASE, screen: "dot", angle: 45, dotShape: "round" });
    expect(Math.abs(inkShare(out.data) - 0.5)).toBeLessThanOrEqual(0.03);
  });

  // Same tolerance across every screen and shape, and at 25% / 75%, so tone holds whatever
  // the settings, not only in the one case the brief names.
  describe.each(["dot", "line", "cross"] as const)("%s screen keeps tone", (screen) => {
    it.each([
      [64, 0.75],
      [128, 0.5],
      [191, 0.25],
    ])("gray %i → %f ± 3% ink", (gray, ink) => {
      const out = halftone(flat(200, 200, gray), { ...BASE, screen, angle: 30, dotShape: "round" });
      expect(Math.abs(inkShare(out.data) - ink)).toBeLessThanOrEqual(0.03);
    });
  });

  it.each(["round", "square", "ellipse", "diamond"] as const)("%s dots keep 50% gray at 50% ± 3% ink", (dotShape) => {
    const out = halftone(flat(200, 200, 128), { ...BASE, screen: "dot", angle: 45, dotShape });
    expect(Math.abs(inkShare(out.data) - 0.5)).toBeLessThanOrEqual(0.03);
  });

  // Brief: output is strictly 0/255.
  it("outputs only 0 and 255 for every screen and dot shape", () => {
    // Literal lists, so this can't pass by looping over an empty export.
    for (const screen of ["dot", "line", "cross"] as const) {
      for (const dotShape of ["round", "square", "ellipse", "diamond"] as const) {
        const out = halftone(photoLike(96, 64), { ...BASE, screen, angle: 22.5, dotShape });
        for (const v of out.data) expect(v === 0 || v === 255).toBe(true);
      }
    }
  });

  // Brief: the angle rotates the screen. A line screen's strongest frequency points across
  // the lines, at angle + 90°; checked modulo 180°.
  it.each([0, 15, 45, 75])("line screen at %i° has its dominant frequency at angle + 90°", (angle) => {
    const out = halftone(flat(256, 256, 160), { ...BASE, lpi: 37.5, screen: "line", angle, dotShape: "round" });
    expect(angleDiff(dominantDirection(out.data, 256), angle + 90, 180)).toBeLessThanOrEqual(3);
  });

  // A dot screen is a square lattice, so its direction is only defined modulo 90°.
  it.each([15, 45])("dot screen at %i° has its dominant frequency at the screen angle (mod 90°)", (angle) => {
    const out = halftone(flat(256, 256, 191), { ...BASE, lpi: 37.5, screen: "dot", angle, dotShape: "round" });
    expect(angleDiff(dominantDirection(out.data, 256), angle, 90)).toBeLessThanOrEqual(3);
  });

  it("a different angle gives a different screen", () => {
    const g = flat(128, 128, 128);
    const a = halftone(g, { ...BASE, screen: "dot", angle: 0, dotShape: "round" });
    const b = halftone(g, { ...BASE, screen: "dot", angle: 45, dotShape: "round" });
    expect(hash(a.data)).not.toBe(hash(b.data));
  });

  it("a higher LPI gives smaller cells (more, finer dots)", () => {
    // Count ink/paper transitions along every row: more cells → more transitions. (A single
    // row can fall in the paper gap between dot rows at 0°, which said nothing about LPI.)
    const transitions = (lpi: number) => {
      const out = halftone(flat(200, 200, 128), { ...BASE, lpi, screen: "dot", angle: 0, dotShape: "round" });
      let n = 0;
      for (let y = 0; y < 200; y++) {
        for (let x = 1; x < 200; x++) if (out.data[y * 200 + x] !== out.data[y * 200 + x - 1]) n++;
      }
      return n;
    };
    expect(transitions(60)).toBeGreaterThan(transitions(20));
  });
});

describe("halftone in the pipeline", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    mode: "halftone" as const,
    halftone: { screen: "dot" as const, angle: 45, lpi: 30, dotShape: "round" as const },
    dpi: 300,
    widthPx: 80,
    heightPx: 60,
  };

  // Guards the tests below: without it, a pipeline that ignores `mode` and dithers would pass
  // determinism, mirror and invert vacuously.
  it("halftone mode runs the halftone screen on the resampled image", () => {
    const src = photoLike(120, 90);
    const viaPipeline = processImage(src, settings);
    const resampled = processImage(src, { ...settings, mode: "dither", algorithm: "threshold" });
    expect(viaPipeline.width).toBe(80);
    expect(hash(viaPipeline.data)).not.toBe(hash(resampled.data));
    const direct = halftone(
      { width: 80, height: 60, data: prepareGray(src, settings).data },
      { ...settings.halftone, dpi: settings.dpi },
    );
    expect(hash(viaPipeline.data)).toBe(hash(direct.data));
  });

  it("is deterministic", () => {
    expect(hash(processImage(photoLike(120, 90), settings).data)).toBe(hash(processImage(photoLike(120, 90), settings).data));
  });

  it("mirrored output is the unmirrored output flipped", () => {
    const plain = processImage(photoLike(120, 90), { ...settings, mirror: false });
    const mirrored = processImage(photoLike(120, 90), { ...settings, mirror: true });
    const w = plain.width;
    for (let y = 0; y < plain.height; y++) {
      for (let x = 0; x < w; x++) expect(mirrored.data[y * w + x]).toBe(plain.data[y * w + (w - 1 - x)]);
    }
  });

  it("invert ON turns flat 25% gray into 25% ± 3% ink", () => {
    const out = processImage(flat(100, 100, 64), { ...settings, invert: true, widthPx: 100, heightPx: 100 });
    expect(Math.abs(inkShare(out.data) - 0.25)).toBeLessThanOrEqual(0.03);
  });

  it("dither mode is unchanged by the halftone settings", () => {
    const d = { ...DEFAULT_SETTINGS, widthPx: 80, heightPx: 60 };
    expect(hash(processImage(photoLike(120, 90), { ...d, mode: "dither", halftone: settings.halftone }).data)).toBe(
      hash(processImage(photoLike(120, 90), d).data),
    );
  });
});
