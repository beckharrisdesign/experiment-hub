import { describe, it, expect } from "vitest";
import { convertSvg } from "@/lib/svg-to-stitch/convert";
import { decodeDst, decodeExp } from "@/lib/svg-to-stitch/read";
import { BRUSH_NAMES, BRUSHES } from "@/lib/svg-to-stitch/brush";
import type { StitchPlan } from "@/lib/svg-to-stitch/plan";

// 100 user units at 50 mm output → 2 units/mm in user space, and 1 mm =
// 10 machine units in the plan, so mm expectations read directly.
const OPTS = { targetWidthMm: 50, stitchLengthMm: 2.5 };

// DST's per-record limit: ±12.1 mm = 121 machine units.
const MACHINE_BOUND_UNITS = 121;

const LINE = (id: string) => `<svg xmlns="http://www.w3.org/2000/svg">
  <line id="${id}" x1="0" y1="50" x2="100" y2="50"
        stroke="#204080" stroke-width="0.5" />
</svg>`;

const VLINE = (id: string) => `<svg xmlns="http://www.w3.org/2000/svg">
  <line id="${id}" x1="50" y1="0" x2="50" y2="100"
        stroke="#204080" stroke-width="0.5" />
</svg>`;

const DIAGONAL = (id: string) => `<svg xmlns="http://www.w3.org/2000/svg">
  <line id="${id}" x1="0" y1="0" x2="100" y2="100"
        stroke="#204080" stroke-width="0.5" />
</svg>`;

const CURVE = (id: string) => `<svg xmlns="http://www.w3.org/2000/svg">
  <path id="${id}" d="M 0 100 Q 0 0 100 0"
        stroke="#204080" stroke-width="0.5" fill="none" />
</svg>`;

function stitchSegments(plan: StitchPlan): { dx: number; dy: number }[] {
  const segs: { dx: number; dy: number }[] = [];
  let prev: { x: number; y: number } | null = null;
  for (const e of plan.entries) {
    if (e.kind === "stitch") {
      if (prev) segs.push({ dx: e.x - prev.x, dy: e.y - prev.y });
      prev = e;
    } else {
      prev = null;
    }
  }
  return segs;
}

function maxSegment(plan: StitchPlan): number {
  return Math.max(
    0,
    ...stitchSegments(plan).map((s) => Math.hypot(s.dx, s.dy)),
  );
}

describe("brush engine — motifs follow the path frame", () => {
  // Bean's segments run along the path, so its stitch directions are a
  // direct readout of the frame's tangent.
  it("stamps rotate with the path direction", () => {
    const horizontal = convertSvg(LINE("st-brush-bean"), OPTS).plan;
    for (const s of stitchSegments(horizontal)) {
      expect(Math.abs(s.dy)).toBeLessThanOrEqual(1); // along x only
    }
    const vertical = convertSvg(VLINE("st-brush-bean"), OPTS).plan;
    for (const s of stitchSegments(vertical)) {
      expect(Math.abs(s.dx)).toBeLessThanOrEqual(1); // along y only
    }
    const diagonal = convertSvg(DIAGONAL("st-brush-bean"), OPTS).plan;
    for (const s of stitchSegments(diagonal)) {
      // 45° path: every bean segment stays on the diagonal.
      expect(Math.abs(Math.abs(s.dx) - Math.abs(s.dy))).toBeLessThanOrEqual(2);
    }
  });

  it("follows a curve with even, taper-free spacing", () => {
    const { plan } = convertSvg(CURVE("st-brush-bean_p25"), OPTS);
    // No chord across the bend may exceed the pitch by much — stamps track
    // the arc instead of shortcutting it.
    expect(maxSegment(plan)).toBeLessThanOrEqual(2.5 * 10 * 1.3);
    expect(plan.stats.brushRuns).toBe(1);
    expect(plan.stats.stitches).toBeGreaterThan(30);
  });
});

describe("brush engine — output stays within machine bounds", () => {
  it("every brush at min and max pitch sews verbatim within the bound", () => {
    for (const name of BRUSH_NAMES) {
      for (const pitchToken of ["p10", "p100"]) {
        const { plan, dst, exp } = convertSvg(
          LINE(`st-brush-${name}_${pitchToken}`),
          OPTS,
        );
        expect(plan.stats.brushRuns).toBe(1);
        expect(maxSegment(plan)).toBeLessThanOrEqual(MACHINE_BOUND_UNITS);
        expect(dst.length).toBeGreaterThan(512);
        expect(exp.length).toBeGreaterThan(0);
        // Round trip: the encoders accept the plan unchanged and the
        // decoders see every penetration again.
        expect(decodeDst(dst).plan.stats.stitches).toBe(plan.stats.stitches);
        expect(decodeExp(exp).plan.stats.stitches).toBe(plan.stats.stitches);
      }
    }
  });

  it("penetrations are exact — never resampled to stitch length", () => {
    // Cross at 10 mm pitch on a 50 mm line: 6 stamps × 6 penetrations,
    // minus the 5 stamp joints where one stamp's on-path exit is the next
    // stamp's entry. Stitch-length resampling would multiply the count
    // and break the X.
    const { plan } = convertSvg(LINE("st-brush-cross_p100"), OPTS);
    expect(plan.stats.stitches).toBe(31);
  });

  it("decoded machine files report zero brush runs", () => {
    const { dst } = convertSvg(LINE("st-brush-cross"), OPTS);
    const decoded = decodeDst(dst);
    expect(decoded.plan.stats.brushRuns).toBe(0);
    expect(decoded.plan.colorStats).toBeUndefined();
  });
});

describe("brush engine — unknown brush errors loudly", () => {
  it("names the layer and the bad brush", () => {
    expect(() => convertSvg(LINE("wave_st-brush-zigzag"), OPTS)).toThrow(
      /wave st-brush-zigzag.*st-brush-zigzag.*isn't in the library/,
    );
  });

  it("rejects out-of-range pitches with the layer name", () => {
    expect(() => convertSvg(LINE("edge_st-brush-cross_p5"), OPTS)).toThrow(
      /edge st-brush-cross p5.*0\.5 mm.*1 to 10 mm/,
    );
    expect(() => convertSvg(LINE("edge_st-brush-cross_p200"), OPTS)).toThrow(
      /20 mm/,
    );
  });

  it("rejects a brush tag on a filled shape", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect id="patch_st-brush-cross" x="10" y="10" width="80" height="80"
            fill="#b91c1c" />
    </svg>`;
    expect(() => convertSvg(svg, OPTS)).toThrow(/not fills/);
  });
});

describe("brush library — six motifs sew on straight and curved paths", () => {
  const PENETRATIONS_PER_STAMP: Record<string, number> = {
    cross: 6,
    tick: 4,
    chain: 9,
    dot: 6,
    bird: 5,
    bean: 4,
  };

  for (const name of BRUSH_NAMES) {
    it(`st-brush-${name} stamps its motif on a line and a curve`, () => {
      const perStamp = PENETRATIONS_PER_STAMP[name];
      const pitch = BRUSHES[name].defaultPitchMm;
      const straight = convertSvg(LINE(`st-brush-${name}`), OPTS).plan;
      expect(straight.stats.brushRuns).toBe(1);
      // ~50 mm of path at the default pitch, several penetrations each —
      // allow for stamp-boundary dedupes (bean chains end-to-end).
      const stamps = Math.round(50 / pitch) + 1;
      expect(straight.stats.stitches).toBeGreaterThanOrEqual(
        stamps * (perStamp - 1),
      );
      const curved = convertSvg(CURVE(`st-brush-${name}`), OPTS).plan;
      expect(curved.stats.brushRuns).toBe(1);
      expect(curved.stats.stitches).toBeGreaterThan(stamps);
      expect(maxSegment(curved)).toBeLessThanOrEqual(MACHINE_BOUND_UNITS);
    });
  }
});

describe("brush library — tag routing with pitch and readout", () => {
  it("a group tag routes every child; children may override", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g id="tracks_st-brush-dot_p30" stroke="#204080" stroke-width="0.5">
        <line x1="0" y1="20" x2="100" y2="20" />
        <line x1="0" y1="50" x2="100" y2="50" />
        <line id="baseline_st-run" x1="0" y1="80" x2="100" y2="80" />
      </g>
    </svg>`;
    const { plan } = convertSvg(svg, OPTS);
    expect(plan.stats.brushRuns).toBe(2);
    // The declared 3 mm pitch, not the default 2 mm: ~17 stamps × 4
    // penetrations per tagged line.
    expect(plan.stats.stitches).toBeGreaterThan(2 * 17 * 3);
  });

  it("the sew-order composition names the motifs per thread color", () => {
    const { plan } = convertSvg(LINE("st-brush-cross"), OPTS);
    expect(plan.colorStats).toHaveLength(1);
    expect(plan.colorStats![0].brushes).toEqual([{ name: "cross", runs: 1 }]);
    expect(plan.colorStats![0].stitches).toBe(plan.stats.stitches);
  });
});

describe("redwork line-only patterns render end to end", () => {
  it("a multi-path line-only design sews every path as its motif", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g id="redwork_st-brush-bean" stroke="#b91c1c" stroke-width="0.5"
         fill="none">
        <path d="M 0 100 Q 0 0 100 0" />
        <path d="M 0 0 Q 100 0 100 100" />
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="50" y1="0" x2="50" y2="100" />
      </g>
    </svg>`;
    const { plan, dst } = convertSvg(svg, OPTS);
    expect(plan.stats.brushRuns).toBe(4);
    expect(plan.stats.stitches).toBeGreaterThan(100);
    expect(maxSegment(plan)).toBeLessThanOrEqual(MACHINE_BOUND_UNITS);
    expect(plan.colorStats![0].brushes).toEqual([{ name: "bean", runs: 4 }]);
    expect(decodeDst(dst).plan.stats.stitches).toBe(plan.stats.stitches);
  });
});
