import { describe, it, expect } from "vitest";
import { hatchFill } from "@/lib/svg-to-stitch/fill";
import { convertSvg } from "@/lib/svg-to-stitch/convert";

const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number }[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
  { x, y },
];

describe("hatchFill", () => {
  it("covers a rectangle with rows at the requested spacing", () => {
    const runs = hatchFill([rect(0, 0, 100, 10)], {
      angleDeg: 0,
      spacing: 1,
      stitchLength: 5,
    });
    expect(runs).toHaveLength(1); // one serpentine column
    const ys = new Set(runs[0].map((p) => Math.round(p.y * 100) / 100));
    expect(ys.size).toBe(10); // 10 rows across a height of 10 at spacing 1
    for (const p of runs[0]) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-6);
      expect(p.x).toBeLessThanOrEqual(100 + 1e-6);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(10);
    }
  });

  it("serpentines: consecutive rows run in opposite directions", () => {
    const runs = hatchFill([rect(0, 0, 100, 4)], {
      angleDeg: 0,
      spacing: 1,
      stitchLength: 200, // no interior points — endpoints only
    });
    const pts = runs[0];
    // Rows of 2 points each: L→R, R→L, L→R, ...
    expect(pts[0].x).toBeLessThan(pts[1].x);
    expect(pts[2].x).toBeGreaterThan(pts[3].x);
    // Row transitions are short hops, not full-width jumps back.
    expect(Math.abs(pts[1].x - pts[2].x)).toBeLessThan(1e-6);
  });

  it("staggers needle points between adjacent rows (tatami)", () => {
    const runs = hatchFill([rect(0, 0, 100, 3)], {
      angleDeg: 0,
      spacing: 1,
      stitchLength: 8,
    });
    const rows = new Map<number, number[]>();
    for (const p of runs[0]) {
      const key = Math.round(p.y * 1000);
      rows.set(key, [...(rows.get(key) ?? []), p.x]);
    }
    const [r0, r1] = [...rows.values()];
    const interior = (xs: number[]) =>
      xs.filter((x) => x > 1e-6 && x < 100 - 1e-6).map((x) => x % 8);
    // Phases differ row to row, so penetration points don't align.
    expect(interior(r0)[0]).not.toBeCloseTo(interior(r1)[0], 5);
  });

  it("leaves holes unstitched (even-odd rule)", () => {
    const runs = hatchFill([rect(0, 0, 30, 30), rect(10, 10, 10, 10)], {
      angleDeg: 0,
      spacing: 1,
      stitchLength: 2,
    });
    for (const run of runs) {
      for (const p of run) {
        const inHole =
          p.x > 10 + 1e-6 &&
          p.x < 20 - 1e-6 &&
          p.y > 10 + 1e-6 &&
          p.y < 20 - 1e-6;
        expect(inHole).toBe(false);
      }
    }
    // The hole splits the middle band into left and right columns.
    expect(runs.length).toBeGreaterThanOrEqual(2);
  });

  it("hatches at the requested angle", () => {
    const runs = hatchFill([rect(0, 0, 20, 20)], {
      angleDeg: 90,
      spacing: 1,
      stitchLength: 2,
    });
    // 90° rows are vertical: consecutive same-row points share x.
    const pts = runs[0];
    expect(Math.abs(pts[0].x - pts[1].x)).toBeLessThan(1e-6);
    expect(Math.abs(pts[0].y - pts[1].y)).toBeGreaterThan(0.1);
  });

  it("returns nothing for degenerate rings", () => {
    expect(
      hatchFill(
        [
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
        ],
        {
          angleDeg: 0,
          spacing: 1,
          stitchLength: 2,
        },
      ),
    ).toEqual([]);
  });
});

describe("convertSvg fill mode", () => {
  const FILLED_SQUARE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="10" y="10" width="80" height="80" fill="#e11d48"/>
  </svg>`;

  it("fills a filled shape instead of just outlining it", () => {
    const fill = convertSvg(FILLED_SQUARE, {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
    });
    const outline = convertSvg(FILLED_SQUARE, {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
      fillMode: "outline",
    });
    // An 80mm square at 0.4mm spacing needs ~200 rows of ~80mm — thousands
    // of stitches, versus ~130 for the boundary alone.
    expect(fill.plan.stats.stitches).toBeGreaterThan(
      outline.plan.stats.stitches * 20,
    );
    expect(fill.plan.colors).toEqual(["#e11d48"]);
  });

  it("outline mode reproduces the original outline-only behavior", () => {
    const outline = convertSvg(FILLED_SQUARE, {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
      fillMode: "outline",
    });
    // Boundary of an 80mm square at 2.5mm — a couple hundred stitches at
    // most (resampling keeps corners), and no fill rows.
    expect(outline.plan.stats.stitches).toBeLessThan(250);
  });

  it("underlay adds a sparse pass beneath the fill", () => {
    const base = {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
      fillUnderlay: false,
    };
    const bare = convertSvg(FILLED_SQUARE, base);
    const withUnderlay = convertSvg(FILLED_SQUARE, {
      ...base,
      fillUnderlay: true,
    });
    const extra = withUnderlay.plan.stats.stitches - bare.plan.stats.stitches;
    expect(extra).toBeGreaterThan(100); // underlay exists
    // ...but is far sparser than the top fill itself.
    expect(extra).toBeLessThan(bare.plan.stats.stitches / 2);
  });

  it("stitches stroke and fill of one shape as separate colors", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="10" y="10" width="80" height="80" fill="#e11d48" stroke="#000000"/>
    </svg>`;
    const result = convertSvg(svg, {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
    });
    expect(new Set(result.plan.colors)).toEqual(
      new Set(["#e11d48", "#000000"]),
    );
  });

  it("keeps holes empty end to end", () => {
    const donut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M10 10 H90 V90 H10 Z M35 35 H65 V65 H35 Z" fill="#2563eb"/>
    </svg>`;
    const result = convertSvg(donut, {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
    });
    // Machine units: 100mm design centered at origin → the hole spans
    // ±150 units around the center. Leave a margin for the hole's own
    // boundary run, then require emptiness strictly inside it.
    for (const entry of result.plan.entries) {
      if (entry.kind !== "stitch") continue;
      const inHole = Math.abs(entry.x) < 130 && Math.abs(entry.y) < 130;
      expect(inHole).toBe(false);
    }
  });

  it("rejects out-of-range fill options", () => {
    expect(() =>
      convertSvg(FILLED_SQUARE, {
        targetWidthMm: 100,
        stitchLengthMm: 2.5,
        fillSpacingMm: 0.05,
      }),
    ).toThrow(/fill spacing/);
    expect(() =>
      convertSvg(FILLED_SQUARE, {
        targetWidthMm: 100,
        stitchLengthMm: 2.5,
        fillAngleDeg: Number.NaN,
      }),
    ).toThrow(/fill angle/);
  });

  it("DST stitch count in the header matches the filled plan", () => {
    const result = convertSvg(FILLED_SQUARE, {
      targetWidthMm: 60,
      stitchLengthMm: 3,
    });
    const header = new TextDecoder("ascii").decode(result.dst.slice(0, 512));
    const st = header.match(/ST:\s*(\d+)/);
    expect(st).not.toBeNull();
    // ST counts records: every stitch plus jump records (a long jump splits
    // into several). It can never undercount the plan's stitches.
    const records = Number(st![1]);
    expect(records).toBeGreaterThanOrEqual(result.plan.stats.stitches);
    expect(records).toBeLessThanOrEqual(
      result.plan.stats.stitches + result.plan.stats.jumps * 8,
    );
  });
});
