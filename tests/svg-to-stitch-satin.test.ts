import { describe, it, expect } from "vitest";
import { satinZigzag } from "@/lib/svg-to-stitch/satin";
import { extractGeometry } from "@/lib/svg-to-stitch/svg-parse";
import { convertSvg } from "@/lib/svg-to-stitch/convert";
import type { StitchPlan } from "@/lib/svg-to-stitch/plan";

function parseSvg(text: string): Document {
  return new DOMParser().parseFromString(text, "image/svg+xml");
}

/** Longest distance between consecutive stitch entries, in 0.1mm units. */
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

// ---------------------------------------------------------------------------
// satinZigzag geometry
// ---------------------------------------------------------------------------

describe("satinZigzag", () => {
  it("zigzags across a straight line, alternating rails at ±width/2", () => {
    const points = satinZigzag(
      [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
      ],
      { width: 6, density: 2 },
    );
    // 40 units at density 2 → 20 steps → 21 penetrations.
    expect(points).toHaveLength(21);
    for (let i = 0; i < points.length; i++) {
      expect(points[i].x).toBeCloseTo(i * 2, 6);
      expect(points[i].y).toBeCloseTo(i % 2 === 0 ? 3 : -3, 6);
    }
  });

  it("keeps every penetration at width/2 from the centerline on a diagonal", () => {
    const points = satinZigzag(
      [
        { x: 0, y: 0 },
        { x: 30, y: 30 },
      ],
      { width: 8, density: 3 },
    );
    // Distance from the line y = x is |y - x| / sqrt(2).
    for (const p of points) {
      expect(Math.abs(p.y - p.x) / Math.SQRT2).toBeCloseTo(4, 6);
    }
  });

  it("lands the final penetration exactly at the path end", () => {
    const points = satinZigzag(
      [
        { x: 0, y: 0 },
        { x: 17, y: 0 }, // not a multiple of density — steps stretch to fit
      ],
      { width: 4, density: 3 },
    );
    const last = points[points.length - 1];
    expect(last.x).toBeCloseTo(17, 6);
    expect(Math.abs(last.y)).toBeCloseTo(2, 6);
  });

  it("offsets perpendicular to each segment around a corner", () => {
    const points = satinZigzag(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      { width: 4, density: 1 },
    );
    for (const p of points) {
      // First leg offsets in y, second leg in x — every penetration sits
      // exactly half a width off one of the two legs.
      const offFirstLeg = Math.abs(Math.abs(p.y) - 2) < 1e-6 && p.x <= 10;
      const offSecondLeg = Math.abs(Math.abs(p.x - 10) - 2) < 1e-6;
      expect(offFirstLeg || offSecondLeg).toBe(true);
    }
  });

  it("returns [] for degenerate centerlines so callers can fall back", () => {
    expect(satinZigzag([{ x: 5, y: 5 }], { width: 4, density: 1 })).toEqual([]);
    expect(
      satinZigzag(
        [
          { x: 5, y: 5 },
          { x: 5, y: 5 },
        ],
        { width: 4, density: 1 },
      ),
    ).toEqual([]);
  });

  it("rejects non-positive width or density", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(() => satinZigzag(line, { width: 0, density: 1 })).toThrow();
    expect(() => satinZigzag(line, { width: 4, density: NaN })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// stroke-width extraction
// ---------------------------------------------------------------------------

describe("stroke width extraction", () => {
  it("captures stroke-width scaled by ancestor transforms", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <g transform="scale(2)" stroke="#ff0000" stroke-width="4">
          <line x1="0" y1="0" x2="10" y2="0" />
        </g>
      </svg>`,
    );
    const { strokes } = extractGeometry(doc, 0.1);
    expect(strokes).toHaveLength(1);
    expect(strokes[0].strokeWidth).toBeCloseTo(8, 6);
  });

  it("defaults an unset stroke-width to 1 user unit", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="10" y2="0" stroke="#000000" />
      </svg>`,
    );
    const { strokes } = extractGeometry(doc, 0.1);
    expect(strokes[0].strokeWidth).toBeCloseTo(1, 6);
  });

  it("resolves absolute CSS units at 96 px per inch", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="10" y2="0" stroke="#000" stroke-width="2mm" />
        <line x1="0" y1="5" x2="10" y2="5" stroke="#000" stroke-width="12pt" />
      </svg>`,
    );
    const { strokes } = extractGeometry(doc, 0.1);
    expect(strokes[0].strokeWidth).toBeCloseTo((2 * 96) / 25.4, 6);
    expect(strokes[1].strokeWidth).toBeCloseTo(16, 6);
  });

  it("treats percentages and malformed values as unset, not misread numbers", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="10" y2="0" stroke="#000" stroke-width="50%" />
        <line x1="0" y1="5" x2="10" y2="5" stroke="#000" stroke-width="4foo" />
      </svg>`,
    );
    const { strokes } = extractGeometry(doc, 0.1);
    // Both fall back to the SVG initial value of 1 user unit.
    expect(strokes[0].strokeWidth).toBeCloseTo(1, 6);
    expect(strokes[1].strokeWidth).toBeCloseTo(1, 6);
  });

  it("drops a stroke with stroke-width 0 — the spec paints nothing", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="10" height="10" fill="#112233"
              stroke="#000" stroke-width="0" />
      </svg>`,
    );
    const { strokes, fills } = extractGeometry(doc, 0.1);
    expect(strokes).toHaveLength(0);
    // With no visible stroke, the fill is not treated as stroke-covered.
    expect(fills[0].hasStroke).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// convertSvg integration
// ---------------------------------------------------------------------------

// 100-unit line sewn at 50 mm → 2 user units per mm. stroke-width 8 units is
// a 4 mm stroke: squarely in the satin range, and its 40-unit (machine)
// zigzag spans are longer than the 25-unit running-stitch resample cap — so
// long segments in the plan prove the satin survived unresampled.
const SATIN_LINE = `<svg xmlns="http://www.w3.org/2000/svg">
  <line x1="0" y1="50" x2="100" y2="50" stroke="#2244cc" stroke-width="8" />
</svg>`;

const OPTS = { targetWidthMm: 50, stitchLengthMm: 2.5 };

describe("convertSvg satin strokes", () => {
  it("sews a 1–10 mm stroke as a satin column with long zigzag stitches", () => {
    const { plan } = convertSvg(SATIN_LINE, OPTS);
    // Zigzag span ≈ hypot(40, density) ≥ 40 machine units, far above the
    // 25-unit cap resampling would impose.
    expect(maxStitchSegment(plan)).toBeGreaterThanOrEqual(38);
  });

  it("anchors the column with a center running-stitch underlay", () => {
    const { plan } = convertSvg(SATIN_LINE, OPTS);
    const underlay = plan.entries.filter(
      (e) => e.kind === "stitch" && e.underlay,
    );
    expect(underlay.length).toBeGreaterThan(5);
    // The underlay runs the centerline (y = 0 after centering), not a rail.
    for (const e of underlay) {
      expect(Math.abs(e.y)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps thin strokes as plain running stitch", () => {
    const thin = SATIN_LINE.replace('stroke-width="8"', 'stroke-width="1"');
    // 1 unit = 0.5 mm — under the satin minimum.
    const { plan } = convertSvg(thin, OPTS);
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(26);
  });

  it("falls back to running stitch above the 10 mm satin maximum", () => {
    const wide = SATIN_LINE.replace('stroke-width="8"', 'stroke-width="30"');
    const { plan } = convertSvg(wide, OPTS);
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(26);
  });

  it("honors satinStrokes: false", () => {
    const { plan } = convertSvg(SATIN_LINE, { ...OPTS, satinStrokes: false });
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(26);
  });

  it("validates satin density", () => {
    expect(() =>
      convertSvg(SATIN_LINE, { ...OPTS, satinDensityMm: 0.05 }),
    ).toThrow(/satin density/);
  });

  it("anchors mm scaling to the source geometry, letting satin borders overhang", () => {
    // Circle centerline diameter 100 units at 50 mm → 2 units per mm; the
    // 8-unit (4 mm) satin border pokes 2 mm past the artwork on each side.
    const badge = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="50" fill="none" stroke="#e8b73a" stroke-width="8" />
    </svg>`;
    const { plan } = convertSvg(badge, OPTS);
    // Anchored scale: the stitched design measures target + overhang (54 mm),
    // instead of the rails silently shrinking the whole design to 50 mm and
    // the satin below its chosen width with it.
    expect(plan.stats.widthMm).toBeCloseTo(54, 0);
    expect(plan.stats.heightMm).toBeCloseTo(54, 0);
    // And the zigzag spans stay a true 4 mm (40 machine units).
    expect(maxStitchSegment(plan)).toBeGreaterThanOrEqual(40);
    expect(maxStitchSegment(plan)).toBeLessThanOrEqual(45);
  });

  it("still encodes DST/EXP with satin stitches present", () => {
    const { dst, exp, plan } = convertSvg(SATIN_LINE, OPTS);
    expect(dst.length).toBeGreaterThan(512);
    expect(exp.length).toBeGreaterThan(0);
    expect(plan.stats.stitches).toBeGreaterThan(50);
  });
});
