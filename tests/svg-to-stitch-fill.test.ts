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

  it("never stitches a connector across a hole that opens between rows", () => {
    // Outer 30×30 square; hole spanning x 8..22 that starts mid-row-gap, so
    // one full-width row is followed by a split row. A naive column match
    // would serpentine from the full row's end straight across the hole.
    const runs = hatchFill([rect(0, 0, 30, 30), rect(8, 10.5, 14, 9)], {
      angleDeg: 0,
      spacing: 2,
      stitchLength: 1.5,
    });
    for (const run of runs) {
      for (let i = 1; i < run.length; i++) {
        const mid = {
          x: (run[i - 1].x + run[i].x) / 2,
          y: (run[i - 1].y + run[i].y) / 2,
        };
        const inHole =
          mid.x > 8 + 1e-6 &&
          mid.x < 22 - 1e-6 &&
          mid.y > 10.5 + 1e-6 &&
          mid.y < 19.5 - 1e-6;
        expect(inHole).toBe(false);
      }
    }
  });

  it("breaks the run instead of stitching across a fast taper", () => {
    // Right triangle: each row is ~10 shorter than the last, so the
    // serpentine's return connector would otherwise cross empty fabric
    // beside the hypotenuse (the "threads into empty space" artifact on
    // letter-shaped fills).
    const triangle = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 0, y: 3 },
      { x: 0, y: 0 },
    ];
    const runs = hatchFill([triangle], {
      angleDeg: 0,
      spacing: 1,
      stitchLength: 2,
    });
    // The taper must actually split into separate runs (the plan jumps
    // between them) — short intermediate stitches along the same bad
    // connector would satisfy the length check alone.
    expect(runs.length).toBeGreaterThan(1);
    const limit = Math.hypot(2, 1) + 1e-6; // one stitch + one row of travel
    for (const run of runs) {
      for (let i = 1; i < run.length; i++) {
        const d = Math.hypot(run[i].x - run[i - 1].x, run[i].y - run[i - 1].y);
        expect(d).toBeLessThanOrEqual(limit);
      }
    }
  });

  it("keeps every stitched segment short on glyph-like geometry", () => {
    // A letter "A": two diagonal legs, a crossbar, and a counter (hole).
    const letterA = [
      [
        { x: 0, y: 60 },
        { x: 20, y: 0 },
        { x: 30, y: 0 },
        { x: 50, y: 60 },
        { x: 40, y: 60 },
        { x: 36, y: 48 },
        { x: 14, y: 48 },
        { x: 10, y: 60 },
        { x: 0, y: 60 },
      ],
      [
        { x: 17, y: 38 },
        { x: 33, y: 38 },
        { x: 25, y: 14 },
        { x: 17, y: 38 },
      ],
    ];
    for (const angle of [0, 45, 90]) {
      const runs = hatchFill(letterA, {
        angleDeg: angle,
        spacing: 1,
        stitchLength: 2.5,
      });
      // The glyph must actually produce fill coverage at every angle —
      // an empty result would make the invariant loop below vacuous.
      expect(runs.length).toBeGreaterThan(0);
      expect(runs.flat().length).toBeGreaterThan(50);
      const limit = Math.hypot(2.5, 1) + 1e-6;
      for (const run of runs) {
        for (let i = 1; i < run.length; i++) {
          const d = Math.hypot(
            run[i].x - run[i - 1].x,
            run[i].y - run[i - 1].y,
          );
          expect(d).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  it("culls sliver segments and single-poke runs", () => {
    // A region far narrower than half the stitch geometry produces only
    // needle-poke slivers — the optimizer drops them entirely (the shape's
    // boundary run still sews it).
    expect(
      hatchFill([rect(0, 0, 0.2, 10)], {
        angleDeg: 0,
        spacing: 1,
        stitchLength: 2,
      }),
    ).toEqual([]);
  });

  it("orders runs nearest-neighbor instead of scanline discovery order", () => {
    // Outer strips span the full height; the middle strip starts lower, so
    // scanline discovery finds left, right, middle — a naive order that
    // hops across the middle. Nearest-neighbor must sew left, middle,
    // right (gaps stay jumps: out of region).
    const strips = [rect(0, 0, 4, 20), rect(10, 10, 4, 10), rect(20, 0, 4, 20)];
    const runs = hatchFill(strips, {
      angleDeg: 0,
      spacing: 2,
      stitchLength: 3,
    });
    expect(runs.length).toBe(3);
    const centroids = runs.map(
      (run) => run.reduce((s, p) => s + p.x, 0) / run.length,
    );
    expect(centroids[0]).toBeLessThan(centroids[1]);
    expect(centroids[1]).toBeLessThan(centroids[2]);
  });

  it("culls a single-run region shorter than one stitch", () => {
    // One row, 1.2 units of thread — passes the scan-time sliver filter
    // but is still a lone needle poke, so the post-merge cull drops it
    // even though there is nothing to order or merge.
    expect(
      hatchFill([rect(0, 0, 1.2, 0.9)], {
        angleDeg: 0,
        spacing: 1,
        stitchLength: 2,
      }),
    ).toEqual([]);
  });

  it("merges runs across short in-region gaps instead of jumping", () => {
    // U shape: the bottom band connects to each arm inside the region, so
    // the arms chain onto it with stitched connectors; only the wide gap
    // across the top of the U stays a separate run.
    const u = [
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 32 },
        { x: 20, y: 32 },
        { x: 20, y: 8 },
        { x: 10, y: 8 },
        { x: 10, y: 32 },
        { x: 0, y: 32 },
        { x: 0, y: 0 },
      ],
    ];
    const runs = hatchFill(u, { angleDeg: 0, spacing: 4, stitchLength: 4 });
    // Bottom band chains onto the left arm with a stitched connector at the
    // corner; the right arm stays a separate run (the gap across the U's
    // mouth is out of region).
    expect(runs.length).toBe(2);
    // Nothing may cross the notch (x 10..20, y 8..32).
    for (const run of runs) {
      for (let i = 1; i < run.length; i++) {
        const mid = {
          x: (run[i - 1].x + run[i].x) / 2,
          y: (run[i - 1].y + run[i].y) / 2,
        };
        const inNotch =
          mid.x > 10 + 1e-6 &&
          mid.x < 20 - 1e-6 &&
          mid.y > 8 + 1e-6 &&
          mid.y < 32 - 1e-6;
        expect(inNotch).toBe(false);
      }
    }
  });

  it("rejects non-positive spacing and stitch length instead of hanging", () => {
    const rings = [rect(0, 0, 10, 10)];
    expect(() =>
      hatchFill(rings, { angleDeg: 0, spacing: 0, stitchLength: 2 }),
    ).toThrow(/spacing/);
    expect(() =>
      hatchFill(rings, { angleDeg: 0, spacing: 1, stitchLength: -1 }),
    ).toThrow(/stitch length/);
    expect(() =>
      hatchFill(rings, { angleDeg: Number.NaN, spacing: 1, stitchLength: 2 }),
    ).toThrow(/angle/);
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

  it("hatches a filled shape rather than tracing its boundary", () => {
    const fill = convertSvg(FILLED_SQUARE, {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
    });
    // An 80mm square at 0.4mm spacing needs ~200 rows of ~80mm — thousands
    // of stitches, versus ~130 for the boundary alone.
    expect(fill.plan.stats.stitches).toBeGreaterThan(2000);
    expect(fill.plan.colors).toEqual(["#e11d48"]);
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
    // Fill first, stroke after — the border must sew on top of the fill.
    expect(result.plan.colors).toEqual(["#e11d48", "#000000"]);
  });

  it("defaults to the 2.5 in patch size when no options are passed", () => {
    const result = convertSvg(FILLED_SQUARE);
    expect(result.plan.stats.widthMm).toBeCloseTo(63.5, 0);
  });

  it("drops zero-area fills", () => {
    const degenerate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
      <path d="M2 2 L18 18" fill="#e11d48"/>
    </svg>`;
    expect(() =>
      convertSvg(degenerate, { targetWidthMm: 100, stitchLengthMm: 2.5 }),
    ).toThrow(/no stitchable/i);
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

  it("flags underlay stitches in the plan for recessed preview rendering", () => {
    const withUnderlay = convertSvg(FILLED_SQUARE, {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
      fillUnderlay: true,
    });
    const kinds = new Set(
      withUnderlay.plan.entries
        .filter((e) => e.kind === "stitch")
        .map((e) => e.underlay ?? false),
    );
    expect(kinds).toEqual(new Set([true, false]));

    const without = convertSvg(FILLED_SQUARE, {
      targetWidthMm: 100,
      stitchLengthMm: 2.5,
      fillUnderlay: false,
    });
    expect(
      without.plan.entries.some((e) => e.kind === "stitch" && e.underlay),
    ).toBe(false);
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
