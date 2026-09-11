import { describe, it, expect } from "vitest";
import { parsePathData } from "@/lib/svg-to-stitch/path-data";
import {
  extractPolylines,
  normalizeColor,
  parseTransform,
} from "@/lib/svg-to-stitch/svg-parse";
import { buildPlan, groupByColor, resample } from "@/lib/svg-to-stitch/plan";
import { encodeDst, encodeRecord } from "@/lib/svg-to-stitch/dst";
import { encodeExp } from "@/lib/svg-to-stitch/exp";
import { convertSvg } from "@/lib/svg-to-stitch/convert";

function parseSvg(text: string): Document {
  return new DOMParser().parseFromString(text, "image/svg+xml");
}

// ---------------------------------------------------------------------------
// Path data parsing
// ---------------------------------------------------------------------------

describe("parsePathData", () => {
  it("parses absolute and relative line commands", () => {
    const [line] = parsePathData("M 10 10 L 20 10 l 0 10 H 40 V 40", 0.1);
    expect(line).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 40 },
    ]);
  });

  it("closes subpaths back to their start", () => {
    const [tri] = parsePathData("M 0 0 L 10 0 L 10 10 Z", 0.1);
    expect(tri[0]).toEqual({ x: 0, y: 0 });
    expect(tri[tri.length - 1]).toEqual({ x: 0, y: 0 });
  });

  it("splits multiple subpaths", () => {
    const subpaths = parsePathData("M 0 0 L 5 0 M 10 10 L 15 10", 0.1);
    expect(subpaths).toHaveLength(2);
  });

  it("flattens cubic curves within tolerance", () => {
    const [curve] = parsePathData("M 0 0 C 0 10 10 10 10 0", 0.05);
    expect(curve.length).toBeGreaterThan(4);
    // The curve's midpoint should be near (5, 7.5) for this symmetric cubic.
    const mid = curve[Math.floor(curve.length / 2)];
    expect(mid.x).toBeCloseTo(5, 0);
    expect(mid.y).toBeCloseTo(7.5, 0);
  });

  it("handles arcs by conversion to cubics", () => {
    const [arc] = parsePathData("M 0 0 A 5 5 0 0 1 10 0", 0.05);
    expect(arc[arc.length - 1].x).toBeCloseTo(10, 5);
    expect(arc[arc.length - 1].y).toBeCloseTo(0, 5);
    // Semicircle apex.
    const apexY = Math.max(...arc.map((p) => Math.abs(p.y)));
    expect(apexY).toBeCloseTo(5, 1);
  });

  it("supports implicit lineto after moveto", () => {
    const [poly] = parsePathData("M 0 0 10 0 10 10", 0.1);
    expect(poly).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// SVG document extraction
// ---------------------------------------------------------------------------

describe("extractPolylines", () => {
  it("extracts basic shapes with transforms applied", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(10, 20)">
          <rect x="0" y="0" width="10" height="5" />
        </g>
      </svg>`,
    );
    const [rect] = extractPolylines(doc, 0.1);
    expect(rect.points[0]).toEqual({ x: 10, y: 20 });
    expect(rect.points[2]).toEqual({ x: 20, y: 25 });
  });

  it("prefers stroke color over fill and normalizes it", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="5" y2="0" stroke="#F00" fill="blue" />
      </svg>`,
    );
    expect(extractPolylines(doc, 0.1)[0].color).toBe("#ff0000");
  });

  it("defaults unstyled shapes to black", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L5 5" /></svg>`,
    );
    expect(extractPolylines(doc, 0.1)[0].color).toBe("#000000");
  });

  it("skips invisible and defs geometry", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <defs><circle cx="0" cy="0" r="5" /></defs>
        <path d="M0 0 L5 5" fill="none" />
        <path d="M0 0 L5 5" style="display:none" fill="red" />
      </svg>`,
    );
    expect(extractPolylines(doc, 0.1)).toHaveLength(0);
  });

  it("approximates circles as closed polylines", () => {
    const doc = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5" fill="red"/></svg>`,
    );
    const [circle] = extractPolylines(doc, 0.05);
    const first = circle.points[0];
    const last = circle.points[circle.points.length - 1];
    expect(first.x).toBeCloseTo(last.x, 6);
    expect(first.y).toBeCloseTo(last.y, 6);
    for (const p of circle.points) {
      expect(Math.hypot(p.x - 10, p.y - 10)).toBeCloseTo(5, 1);
    }
  });
});

describe("parseTransform / normalizeColor", () => {
  it("composes transform lists left to right", () => {
    const m = parseTransform("translate(10, 0) scale(2)");
    // (1,1) -> scale -> (2,2) -> translate -> (12,2)
    expect(m[0]).toBe(2);
    expect(m[4]).toBe(10);
  });

  it("normalizes color syntaxes", () => {
    expect(normalizeColor("#ABC")).toBe("#aabbcc");
    expect(normalizeColor("rgb(255, 0, 128)")).toBe("#ff0080");
    expect(normalizeColor("navy")).toBe("#000080");
  });
});

// ---------------------------------------------------------------------------
// Stitch planning
// ---------------------------------------------------------------------------

describe("stitch planning", () => {
  it("resamples long segments and keeps vertices", () => {
    const points = resample(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 3 },
      ],
      2.5,
    );
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points).toContainEqual({ x: 10, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 10, y: 3 });
    for (let i = 1; i < points.length; i++) {
      const step = Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y,
      );
      expect(step).toBeLessThanOrEqual(2.5 + 1e-9);
    }
  });

  it("groups repeats of a color into one block", () => {
    const blocks = groupByColor([
      { color: "#ff0000", points: [{ x: 0, y: 0 }] },
      { color: "#0000ff", points: [{ x: 1, y: 1 }] },
      { color: "#ff0000", points: [{ x: 2, y: 2 }] },
    ]);
    expect(blocks.map((b) => b.color)).toEqual(["#ff0000", "#0000ff"]);
    expect(blocks[0].polylines).toHaveLength(2);
  });

  it("scales the larger side to the target width and flips y", () => {
    const plan = buildPlan(
      [
        {
          color: "#000000",
          polylines: [
            [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 50 },
            ],
          ],
        },
      ],
      { targetWidthMm: 100, stitchLengthMm: 2.5 },
    );
    expect(plan.stats.widthMm).toBeCloseTo(100, 5);
    expect(plan.stats.heightMm).toBeCloseTo(50, 5);
    const stitches = plan.entries.filter((e) => e.kind === "stitch");
    // First stitch at SVG top-left → machine (-500, +250): y-up flip.
    expect(stitches[0]).toMatchObject({ x: -500, y: 250 });
    // Spacing respects the stitch length in 0.1mm units.
    for (let i = 1; i < stitches.length; i++) {
      const step = Math.hypot(
        stitches[i].x - stitches[i - 1].x,
        stitches[i].y - stitches[i - 1].y,
      );
      expect(step).toBeLessThanOrEqual(26);
    }
  });

  it("emits jumps between runs and color changes between blocks", () => {
    const plan = buildPlan(
      [
        {
          color: "#ff0000",
          polylines: [
            [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
            ],
          ],
        },
        {
          color: "#0000ff",
          polylines: [
            [
              { x: 0, y: 10 },
              { x: 10, y: 10 },
            ],
          ],
        },
      ],
      { targetWidthMm: 50, stitchLengthMm: 2.5 },
    );
    expect(plan.colors).toEqual(["#ff0000", "#0000ff"]);
    expect(plan.stats.colorChanges).toBe(1);
    expect(plan.stats.jumps).toBeGreaterThanOrEqual(2);
    expect(plan.entries[plan.entries.length - 1].kind).toBe("end");
  });

  it("rejects empty geometry", () => {
    expect(() =>
      buildPlan([], { targetWidthMm: 100, stitchLengthMm: 2.5 }),
    ).toThrow(/no stitchable geometry/);
  });
});

// ---------------------------------------------------------------------------
// DST encoding
// ---------------------------------------------------------------------------

/** Decode a DST stitch record back to dx/dy — inverse of encodeRecord. */
function decodeRecord(
  b0: number,
  b1: number,
  b2: number,
): {
  dx: number;
  dy: number;
  jump: boolean;
  color: boolean;
} {
  let dx = 0;
  let dy = 0;
  if (b0 & 0b00000001) dx += 1;
  if (b0 & 0b00000010) dx -= 1;
  if (b0 & 0b00000100) dx += 9;
  if (b0 & 0b00001000) dx -= 9;
  if (b0 & 0b10000000) dy += 1;
  if (b0 & 0b01000000) dy -= 1;
  if (b0 & 0b00100000) dy += 9;
  if (b0 & 0b00010000) dy -= 9;
  if (b1 & 0b00000001) dx += 3;
  if (b1 & 0b00000010) dx -= 3;
  if (b1 & 0b00000100) dx += 27;
  if (b1 & 0b00001000) dx -= 27;
  if (b1 & 0b10000000) dy += 3;
  if (b1 & 0b01000000) dy -= 3;
  if (b1 & 0b00100000) dy += 27;
  if (b1 & 0b00010000) dy -= 27;
  if (b2 & 0b00000100) dx += 81;
  if (b2 & 0b00001000) dx -= 81;
  if (b2 & 0b00100000) dy += 81;
  if (b2 & 0b00010000) dy -= 81;
  return {
    dx,
    dy,
    jump: (b2 & 0b10000000) !== 0 && (b2 & 0b01000000) === 0,
    color: (b2 & 0b11000000) === 0b11000000,
  };
}

describe("DST encoding", () => {
  it("round-trips every delta in range through encodeRecord", () => {
    for (let dx = -121; dx <= 121; dx += 7) {
      for (let dy = -121; dy <= 121; dy += 7) {
        const [b0, b1, b2] = encodeRecord(dx, dy, "stitch");
        const decoded = decodeRecord(b0, b1, b2);
        expect({ dx: decoded.dx, dy: decoded.dy }).toEqual({ dx, dy });
      }
    }
  });

  it("writes a 512-byte header with stitch count and extents", () => {
    const plan = buildPlan(
      [
        {
          color: "#000000",
          polylines: [
            [
              { x: 0, y: 0 },
              { x: 40, y: 0 },
            ],
          ],
        },
      ],
      { targetWidthMm: 40, stitchLengthMm: 2 },
    );
    const dst = encodeDst(plan, "TESTDESIGN");
    const header = new TextDecoder("ascii").decode(dst.slice(0, 512));
    expect(header.startsWith("LA:TESTDESIGN")).toBe(true);
    expect(header).toMatch(/ST:\s*\d+\r/);
    expect(header).toMatch(/CO:\s*0\r/);
    expect(header).toMatch(/\+X:\s*200\r/);
    expect(header).toMatch(/-X:\s*200\r/);
    expect(dst[512 - 1]).toBe(0x20);
    // File ends with the DST end record.
    expect(Array.from(dst.slice(-3))).toEqual([0x00, 0x00, 0xf3]);
  });

  it("decoded stitch positions match the plan", () => {
    const plan = buildPlan(
      [
        {
          color: "#ff0000",
          polylines: [
            [
              { x: 0, y: 0 },
              { x: 30, y: 20 },
            ],
          ],
        },
        {
          color: "#0000ff",
          polylines: [
            [
              { x: 30, y: 0 },
              { x: 0, y: 20 },
            ],
          ],
        },
      ],
      { targetWidthMm: 90, stitchLengthMm: 2.5 },
    );
    const dst = encodeDst(plan, "T");
    let x = 0;
    let y = 0;
    let colorChanges = 0;
    const visited: Array<{ x: number; y: number }> = [];
    for (let i = 512; i + 2 < dst.length; i += 3) {
      if (dst[i] === 0 && dst[i + 1] === 0 && dst[i + 2] === 0xf3) break;
      const rec = decodeRecord(dst[i], dst[i + 1], dst[i + 2]);
      if (rec.color) {
        colorChanges++;
        continue;
      }
      x += rec.dx;
      y += rec.dy;
      if (!rec.jump) visited.push({ x, y });
    }
    expect(colorChanges).toBe(1);
    // Every planned stitch position appears in the decoded needle path.
    for (const entry of plan.entries) {
      if (entry.kind !== "stitch") continue;
      expect(visited).toContainEqual({ x: entry.x, y: entry.y });
    }
  });

  it("splits moves larger than ±121 across records", () => {
    const plan = buildPlan(
      [
        {
          color: "#000000",
          polylines: [
            [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
            [
              { x: 350, y: 0 },
              { x: 351, y: 0 },
            ],
          ],
        },
      ],
      { targetWidthMm: 350, stitchLengthMm: 2.5 },
    );
    // The jump between runs is ~349mm-wide design → far beyond one record.
    expect(() => encodeDst(plan, "WIDE")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// EXP encoding
// ---------------------------------------------------------------------------

describe("EXP encoding", () => {
  it("writes signed byte pairs, jump prefixes, and color stops", () => {
    const plan = buildPlan(
      [
        {
          color: "#ff0000",
          polylines: [
            [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
            ],
          ],
        },
        {
          color: "#0000ff",
          polylines: [
            [
              { x: 0, y: 5 },
              { x: 10, y: 5 },
            ],
          ],
        },
      ],
      { targetWidthMm: 20, stitchLengthMm: 2 },
    );
    const exp = encodeExp(plan);
    const bytes = Array.from(exp);
    // Contains exactly one color stop sequence.
    let stops = 0;
    for (let i = 0; i + 3 < bytes.length; i++) {
      if (
        bytes[i] === 0x80 &&
        bytes[i + 1] === 0x01 &&
        bytes[i + 2] === 0x00 &&
        bytes[i + 3] === 0x00
      ) {
        stops++;
      }
    }
    expect(stops).toBe(1);
    // Decode and confirm the needle lands where the plan ends.
    let x = 0;
    let y = 0;
    for (let i = 0; i < bytes.length; ) {
      if (bytes[i] === 0x80) {
        if (bytes[i + 1] === 0x01) {
          i += 4;
          continue;
        }
        i += 2; // jump prefix; delta follows
        continue;
      }
      const sx = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
      const sy = bytes[i + 1] > 127 ? bytes[i + 1] - 256 : bytes[i + 1];
      x += sx;
      y += sy;
      i += 2;
    }
    const end = plan.entries[plan.entries.length - 1];
    expect({ x, y }).toEqual({ x: end.x, y: end.y });
  });
});

// ---------------------------------------------------------------------------
// End-to-end conversion
// ---------------------------------------------------------------------------

describe("convertSvg", () => {
  const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60">
    <rect x="5" y="5" width="90" height="50" fill="none" stroke="#1f6feb" />
    <circle cx="50" cy="30" r="20" fill="#f85149" />
    <path d="M 30 30 Q 50 5 70 30" stroke="#3fb950" fill="none" />
  </svg>`;

  it("produces a plan and both file formats", () => {
    const result = convertSvg(SAMPLE, {
      targetWidthMm: 120,
      stitchLengthMm: 2.5,
      designName: "SAMPLE",
    });
    expect(result.plan.colors).toEqual(["#1f6feb", "#f85149", "#3fb950"]);
    expect(result.plan.stats.colorChanges).toBe(2);
    expect(result.plan.stats.stitches).toBeGreaterThan(50);
    expect(result.plan.stats.widthMm).toBeCloseTo(120, 0);
    expect(result.dst.length).toBeGreaterThan(512);
    expect((result.dst.length - 512) % 3).toBe(0);
    expect(result.exp.length).toBeGreaterThan(0);
  });

  it("rejects invalid inputs", () => {
    expect(() => convertSvg("not xml at all <<<")).toThrow();
    expect(() =>
      convertSvg(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`),
    ).toThrow(/no stitchable geometry/);
    expect(() =>
      convertSvg(SAMPLE, { targetWidthMm: 5, stitchLengthMm: 2.5 }),
    ).toThrow(/target width/);
    expect(() =>
      convertSvg(SAMPLE, { targetWidthMm: 100, stitchLengthMm: 0.2 }),
    ).toThrow(/stitch length/);
  });
});
