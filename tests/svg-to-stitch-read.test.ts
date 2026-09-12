import { describe, it, expect } from "vitest";
import { convertSvg } from "@/lib/svg-to-stitch/convert";
import { encodeDst } from "@/lib/svg-to-stitch/dst";
import { encodeExp } from "@/lib/svg-to-stitch/exp";
import {
  decodeDst,
  decodeExp,
  readMachineFile,
} from "@/lib/svg-to-stitch/read";
import type { StitchPlan } from "@/lib/svg-to-stitch/plan";

// Two colors, a fill, a satin border, long jumps — every record type the
// writers emit shows up in this design.
const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="40" height="30" fill="#1f6feb" />
  <line x1="0" y1="60" x2="100" y2="60" stroke="#f85149" stroke-width="6" />
</svg>`;

function samplePlan(): StitchPlan {
  return convertSvg(SAMPLE, { targetWidthMm: 50, stitchLengthMm: 2.5 }).plan;
}

/** A minimal valid DST: LA: header padded to 512 bytes, then raw records. */
function withDstHeader(records: number[]): Uint8Array {
  const bytes = new Uint8Array(512 + records.length);
  const header = "LA:FIXTURE         \r";
  for (let i = 0; i < header.length; i++) bytes[i] = header.charCodeAt(i);
  bytes.fill(0x20, header.length, 512);
  bytes.set(records, 512);
  return bytes;
}

function stitchPoints(plan: StitchPlan): Array<[number, number]> {
  // +0 folds IEEE −0 (from the y-flip in the plan's coordinate transform)
  // into +0 — the byte formats only carry deltas, so −0 cannot round-trip.
  return plan.entries
    .filter((e) => e.kind === "stitch")
    .map((e) => [e.x + 0, e.y + 0]);
}

describe("decodeDst", () => {
  it("round-trips a written DST exactly", () => {
    const plan = samplePlan();
    const decoded = decodeDst(encodeDst(plan, "SAMPLE")).plan;

    // Every stitch record encodes a full delta (all under ±121), so the
    // decoded penetrations match the plan's coordinates one for one.
    expect(stitchPoints(decoded)).toEqual(stitchPoints(plan));
    expect(decoded.stats.stitches).toBe(plan.stats.stitches);
    expect(decoded.stats.colorChanges).toBe(plan.stats.colorChanges);
    // Split jump records collapse back into one jump per relocation.
    expect(decoded.stats.jumps).toBe(plan.stats.jumps);
    expect(decoded.stats.widthMm).toBeCloseTo(plan.stats.widthMm, 1);
    expect(decoded.stats.heightMm).toBeCloseTo(plan.stats.heightMm, 1);
    expect(decoded.colors).toHaveLength(plan.colors.length);
  });

  it("reads the design name from the header", () => {
    const { designName } = decodeDst(encodeDst(samplePlan(), "FIRSTAID"));
    expect(designName).toBe("FIRSTAID");
  });

  it("rejects files too short to carry a DST header", () => {
    expect(() => decodeDst(new Uint8Array(100))).toThrow(/not a DST file/);
  });

  it("rejects a 512+ byte file whose header is not a DST header", () => {
    expect(() => decodeDst(new Uint8Array(600))).toThrow(/not a DST file/);
  });

  it("rejects a header with no stitch records", () => {
    const empty = withDstHeader([0x00, 0x00, 0xf3]);
    expect(() => decodeDst(empty)).toThrow(/no stitches/);
  });

  it("rejects a truncated DST missing its end record", () => {
    const whole = encodeDst(samplePlan(), "SAMPLE");
    const cut = whole.slice(0, whole.length - 3); // drop the 0xF3 record
    expect(() => decodeDst(cut)).toThrow(/truncated DST/);
  });

  it("decodes hand-built byte records independent of our encoder", () => {
    // Fixture bytes straight from the Tajima record table: stitch +1/+1,
    // stitch +9/-27, a jump, a color change, then the end record.
    const design = withDstHeader([
      0b10000001,
      0b00000000,
      0b00000011, // dx +1, dy +1, stitch
      0b00000100,
      0b00010000,
      0b00000011, // dx +9, dy -27, stitch
      0b00000001,
      0b00000000,
      0b10000011, // dx +1, jump
      0b00000000,
      0b00000000,
      0b11000011, // color change
      0b00000000,
      0b00000000,
      0b11110011, // end
    ]);
    const { plan } = decodeDst(design);
    const stitches = plan.entries.filter((e) => e.kind === "stitch");
    expect(stitches.map((e) => [e.x, e.y])).toEqual([
      [1, 1],
      [10, -26],
    ]);
    expect(plan.stats.jumps).toBe(1);
    expect(plan.stats.colorChanges).toBe(1);
  });
});

describe("decodeExp", () => {
  it("round-trips a written EXP exactly", () => {
    const plan = samplePlan();
    const decoded = decodeExp(encodeExp(plan)).plan;

    expect(stitchPoints(decoded)).toEqual(stitchPoints(plan));
    expect(decoded.stats.stitches).toBe(plan.stats.stitches);
    expect(decoded.stats.colorChanges).toBe(plan.stats.colorChanges);
    expect(decoded.stats.jumps).toBe(plan.stats.jumps);
  });

  it("swallows the zero-move padding after a color stop", () => {
    const plan = samplePlan();
    const decoded = decodeExp(encodeExp(plan)).plan;
    // Our writer pads each 0x80 0x01 stop with 0x00 0x00; if the decoder
    // treated that as a stitch, counts would drift by one per color change.
    expect(decoded.stats.stitches).toBe(plan.stats.stitches);
  });

  it("rejects an empty file", () => {
    expect(() => decodeExp(new Uint8Array(0))).toThrow(/no stitches/);
  });

  it("rejects an odd-length EXP cut mid-record", () => {
    expect(() => decodeExp(new Uint8Array([5, 5, 3]))).toThrow(/truncated EXP/);
  });

  it("decodes hand-built byte records independent of our encoder", () => {
    // Signed byte moves, a jump escape, a color stop, and the end marker.
    const design = new Uint8Array([
      5,
      250, // dx +5, dy -6 stitch
      0x80,
      0x04,
      10,
      0, // jump +10/0
      0x80,
      0x01, // color stop
      3,
      3, // stitch +3/+3
      0x80,
      0x80, // end
      9,
      9, // beyond the end marker — must be ignored
    ]);
    const { plan } = decodeExp(design);
    const stitches = plan.entries.filter((e) => e.kind === "stitch");
    // Deltas accumulate: (5,-6), then the jump lands at (15,-6), then the
    // +3/+3 stitch at (18,-3).
    expect(stitches.map((e) => [e.x, e.y])).toEqual([
      [5, -6],
      [18, -3],
    ]);
    expect(plan.stats.jumps).toBe(1);
    expect(plan.stats.colorChanges).toBe(1);
  });
});

describe("readMachineFile", () => {
  it("passes the original bytes through for the file's own format", () => {
    const dst = encodeDst(samplePlan(), "SAMPLE");
    const opened = readMachineFile("dst", dst, "SAMPLE");
    expect(opened.dst).toBe(dst);
    expect(opened.exp.length).toBeGreaterThan(0);
  });

  it("converts DST to EXP faithfully via the decoded plan", () => {
    const plan = samplePlan();
    const opened = readMachineFile("dst", encodeDst(plan, "SAMPLE"), "S");
    const viaExp = decodeExp(opened.exp).plan;
    expect(stitchPoints(viaExp)).toEqual(stitchPoints(plan));
  });

  it("assigns placeholder colors, one per block", () => {
    const opened = readMachineFile("exp", encodeExp(samplePlan()), "SAMPLE");
    expect(opened.plan.colors).toHaveLength(2);
    expect(new Set(opened.plan.colors).size).toBe(2);
  });
});
