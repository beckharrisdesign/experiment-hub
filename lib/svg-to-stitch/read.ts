// Machine-file readers — the "previewer" half of Stitch Check. Opens the
// files stitchers actually buy and receive (Tajima DST, Melco EXP) and
// decodes them into the same StitchPlan the preview renders, so a design
// can be checked before it wastes stabilizer, thread, and hooping time.
//
// Neither format stores thread colors — DST color-change records only say
// "stop and switch". Decoded blocks get placeholder palette colors so the
// preview can still separate and highlight them.

import type { PlanEntry, StitchPlan } from "./plan";
import { encodeDst } from "./dst";
import { encodeExp } from "./exp";

/** Display-hint colors for formats that don't carry thread colors. */
export const PLACEHOLDER_THREAD_COLORS = [
  "#4f8ff7",
  "#f2545b",
  "#3fb950",
  "#e8b73a",
  "#b18cf2",
  "#58c7c7",
  "#f2789f",
  "#d97e4a",
];

export interface DecodedDesign {
  plan: StitchPlan;
  /** Design name from the file header, when the format carries one. */
  designName?: string;
}

/** Wrap decoded entries into a StitchPlan with stats and palette colors. */
function finishPlan(entries: PlanEntry[]): StitchPlan {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let stitches = 0;
  let jumps = 0;
  let colorChanges = 0;
  let prevKind: PlanEntry["kind"] | null = null;

  for (const e of entries) {
    if (e.kind === "stitch" || e.kind === "jump") {
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x);
      maxY = Math.max(maxY, e.y);
    }
    if (e.kind === "stitch") stitches++;
    // A relocation split across several jump records is one jump, matching
    // how the converter counts its own plans.
    if (e.kind === "jump" && prevKind !== "jump") jumps++;
    if (e.kind === "color") colorChanges++;
    prevKind = e.kind;
  }
  if (stitches === 0) {
    throw new Error("no stitches found in this file");
  }

  const last = entries[entries.length - 1];
  entries.push({ kind: "end", x: last.x, y: last.y });

  const colors = Array.from(
    { length: colorChanges + 1 },
    (_, i) => PLACEHOLDER_THREAD_COLORS[i % PLACEHOLDER_THREAD_COLORS.length],
  );

  return {
    entries,
    colors,
    stats: {
      stitches,
      jumps,
      colorChanges,
      // Machine formats don't mark satin or brushes — only penetrations.
      satinRuns: 0,
      brushRuns: 0,
      widthMm: (maxX - minX) / 10,
      heightMm: (maxY - minY) / 10,
    },
  };
}

// Inverse of encodeRecord's ternary bit table: each bit adds or subtracts
// one of ±1/±3/±9/±27/±81 on an axis.
function dstDeltas(b0: number, b1: number, b2: number): [number, number] {
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
  return [dx, dy];
}

/**
 * Decode a Tajima .dst file: 512-byte ASCII header, then 3-byte records
 * until the 0xF3 end record. Coordinates come out in the plan's native
 * machine units (0.1mm, y-up), absolute from the file's own start point —
 * the preview fits its view to the extents, so no re-centering is needed.
 */
export function decodeDst(bytes: Uint8Array): DecodedDesign {
  if (bytes.length < 512 + 3) {
    throw new Error("not a DST file (missing 512-byte header)");
  }
  // Every DST header opens with the LA: design-name field — requiring it
  // keeps arbitrary 512+ byte files from silently "previewing" as noise.
  const label = String.fromCharCode(...bytes.slice(0, 3));
  if (label !== "LA:") {
    throw new Error("not a DST file (header does not start with LA:)");
  }
  const designName =
    String.fromCharCode(...bytes.slice(3, 19)).trim() || undefined;

  const entries: PlanEntry[] = [];
  let x = 0;
  let y = 0;
  let terminated = false;
  for (let i = 512; i + 2 < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    if (b2 === 0xf3) {
      terminated = true;
      break;
    }
    const [dx, dy] = dstDeltas(b0, b1, b2);
    x += dx;
    y += dy;
    if ((b2 & 0b11000000) === 0b11000000) {
      entries.push({ kind: "color", x, y });
    } else if (b2 & 0b10000000) {
      entries.push({ kind: "jump", x, y });
    } else {
      entries.push({ kind: "stitch", x, y });
    }
  }
  if (!terminated) {
    // Without the end record the file is cut off — better to say so than
    // to preview (and re-encode) a design missing its tail.
    throw new Error("truncated DST file (missing end record)");
  }
  return { plan: finishPlan(entries), designName };
}

function int8(v: number): number {
  return (v << 24) >> 24;
}

/**
 * Decode a Melco .exp file: headerless two-byte records (signed dx, dy),
 * with 0x80-escaped controls — 0x01/0x02 color change or stop, 0x04 jump
 * prefix, 0x80 end. Unknown escapes are skipped.
 */
export function decodeExp(bytes: Uint8Array): DecodedDesign {
  // Records are always byte pairs (moves and escapes alike), so an odd
  // length means the file is cut mid-record — reject it rather than
  // silently dropping the final record from the preview and downloads.
  if (bytes.length % 2 !== 0) {
    throw new Error("truncated EXP file (incomplete final record)");
  }
  const entries: PlanEntry[] = [];
  let x = 0;
  let y = 0;
  let jump = false;
  let i = 0;
  while (i + 1 < bytes.length) {
    const b0 = bytes[i];
    if (b0 === 0x80) {
      const code = bytes[i + 1];
      i += 2;
      if (code === 0x01 || code === 0x02) {
        entries.push({ kind: "color", x, y });
        // Some writers (ours included) pad the stop with a zero move —
        // swallow it so it doesn't count as a needle penetration.
        if (i + 1 < bytes.length && bytes[i] === 0 && bytes[i + 1] === 0) {
          i += 2;
        }
      } else if (code === 0x04) {
        jump = true;
      } else if (code === 0x80) {
        break; // end marker
      }
      continue;
    }
    x += int8(b0);
    y += int8(bytes[i + 1]);
    i += 2;
    entries.push({ kind: jump ? "jump" : "stitch", x, y });
    jump = false;
  }
  return { plan: finishPlan(entries) };
}

export interface MachineFileResult {
  plan: StitchPlan;
  designName?: string;
  dst: Uint8Array;
  exp: Uint8Array;
}

/**
 * Open a machine file for preview: decode it, keep the original bytes for
 * its own format, and re-encode the other so both downloads work — opening
 * a DST gives a faithful EXP conversion for free, and vice versa.
 */
export function readMachineFile(
  format: "dst" | "exp",
  bytes: Uint8Array,
  fallbackName: string,
): MachineFileResult {
  const decoded = format === "dst" ? decodeDst(bytes) : decodeExp(bytes);
  const name = decoded.designName ?? fallbackName;
  return {
    plan: decoded.plan,
    designName: decoded.designName,
    dst: format === "dst" ? bytes : encodeDst(decoded.plan, name),
    exp: format === "exp" ? bytes : encodeExp(decoded.plan),
  };
}
