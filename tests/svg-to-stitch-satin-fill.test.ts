import { describe, it, expect } from "vitest";
import { satinFill } from "@/lib/svg-to-stitch/fill";
import { convertSvg } from "@/lib/svg-to-stitch/convert";
import type { StitchPlan } from "@/lib/svg-to-stitch/plan";
import type { Point } from "@/lib/svg-to-stitch/path-data";

// Options in plain mm so the geometry reads directly.
const OPTS = {
  spacing: 0.4,
  maxWidth: 10,
  minMedianWidth: 1,
  stitchLength: 2.5,
};

function rect(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
}

/** Lengths of the thread segments between consecutive penetrations. */
function spans(run: Point[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < run.length; i++) {
    out.push(Math.hypot(run[i].x - run[i - 1].x, run[i].y - run[i - 1].y));
  }
  return out;
}

function maxStitchSegment(plan: StitchPlan): number {
  let max = 0;
  let prev: { x: number; y: number } | null = null;
  for (const e of plan.entries) {
    if (e.kind === "stitch") {
      if (prev) max = Math.max(max, Math.hypot(e.x - prev.x, e.y - prev.y));
      prev = e;
    } else {
      prev = null;
    }
  }
  return max;
}

describe("satinFill", () => {
  it("sews a narrow vertical bar as full-width traverses", () => {
    const result = satinFill([rect(0, 0, 3, 30)], OPTS);
    expect(result).not.toBeNull();
    const { runs } = result!;
    expect(runs).toHaveLength(1);
    const run = runs[0];
    // ~75 rows at 0.4 mm pitch over 30 mm.
    expect(run.length).toBeGreaterThan(60);
    // Every traverse crosses the full 3 mm width (diagonally, so a touch
    // longer), and penetrations alternate rails.
    for (const s of spans(run)) {
      expect(s).toBeGreaterThan(2.9);
      expect(s).toBeLessThan(3.2);
    }
    const sides = run.map((p) => (p.x < 1.5 ? 0 : 1));
    for (let i = 1; i < sides.length; i++) {
      expect(sides[i]).not.toBe(sides[i - 1]);
    }
  });

  it("picks the axis that runs along the shape", () => {
    // Same bar lying down: rows must turn vertical, spans stay ~3 mm.
    const result = satinFill([rect(0, 0, 30, 3)], OPTS);
    expect(result).not.toBeNull();
    for (const s of spans(result!.runs[0])) {
      expect(s).toBeLessThan(3.2);
    }
  });

  it("tapers with the shape", () => {
    // A 25 mm wedge from a 6 mm base to a point.
    const wedge: Point[] = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 3, y: 25 },
      { x: 0, y: 0 },
    ];
    const result = satinFill([wedge], OPTS);
    expect(result).not.toBeNull();
    const all = result!.runs.flatMap(spans);
    expect(Math.max(...all)).toBeGreaterThan(4.5); // near the base
    expect(Math.min(...all)).toBeLessThan(1.5); // near the tip
  });

  it("returns null for a wide region so tatami takes over", () => {
    expect(satinFill([rect(0, 0, 20, 30)], OPTS)).toBeNull();
  });

  it("returns null for a hairline region below the median minimum", () => {
    // 0.3 mm is too thin even for the oblique-axis trick (a 0.5 mm bar
    // legitimately qualifies at a shallow axis, sewing ~1 mm slanted
    // traverses — better coverage than a single tatami dust row).
    expect(satinFill([rect(0, 0, 0.3, 30)], OPTS)).toBeNull();
  });

  it("splits around holes into separate columns and stays out of them", () => {
    // 8 mm square with a centered 3 mm hole — an "O". Sides are ~2.5 mm
    // columns; rows above and below the hole span the full 8 mm.
    const outer = rect(0, 0, 8, 8);
    const hole = rect(2.5, 2.5, 3, 3);
    const result = satinFill([outer, hole], OPTS);
    expect(result).not.toBeNull();
    const { runs } = result!;
    expect(runs.length).toBeGreaterThanOrEqual(3);
    // No penetration lands strictly inside the hole.
    for (const run of runs) {
      for (const p of run) {
        const inHole = p.x > 2.51 && p.x < 5.49 && p.y > 2.51 && p.y < 5.49;
        expect(inHole).toBe(false);
      }
    }
  });

  it("centerlines track the middle of the column", () => {
    const result = satinFill([rect(0, 0, 3, 30)], OPTS);
    for (const center of result!.centers) {
      for (const p of center) {
        expect(p.x).toBeCloseTo(1.5, 6);
      }
    }
  });
});

describe("convertSvg satin fills", () => {
  // 4-unit-wide bar in a 100-unit design at 50 mm → a 2 mm-wide fill.
  const BAR = `<svg xmlns="http://www.w3.org/2000/svg">
    <rect x="48" y="0" width="4" height="100" fill="#204080" />
  </svg>`;
  const CONVERT = { targetWidthMm: 50, stitchLengthMm: 2.5 };

  it("sews a narrow filled bar as satin traverses", () => {
    const { plan } = convertSvg(BAR, CONVERT);
    // 2 mm traverses = 20 machine units, unreachable by tatami stitches
    // after culling... but well above the fill row spacing; the giveaway
    // is that ~every stitch is a full-width traverse.
    expect(maxStitchSegment(plan)).toBeGreaterThanOrEqual(19);
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(23);
  });

  it("honors satinFills: false with tatami", () => {
    const { plan } = convertSvg(BAR, { ...CONVERT, satinFills: false });
    // Tatami rows run along the 2 mm bar: stitches capped at stitch length.
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(26);
  });

  it("keeps wide regions on tatami even with satin fills enabled", () => {
    const wide = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="100" height="60" fill="#204080" />
    </svg>`;
    const { plan } = convertSvg(wide, CONVERT);
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(26);
  });
});
