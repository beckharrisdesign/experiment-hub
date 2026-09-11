// Turns colored polylines (SVG user units, y-down) into a stitch plan in
// machine units: 0.1mm integer coordinates, y-up, centered on the design's
// bounding box. Running stitch along every polyline; jumps between runs;
// a color change between color blocks.

import type { ColoredPolyline, Point } from "./svg-parse";
export type { Point };

export type StitchKind = "stitch" | "jump" | "color" | "end";

export interface PlanEntry {
  kind: StitchKind;
  // Absolute position in 0.1mm units, y-up, design centered at the origin.
  x: number;
  y: number;
  /** True on stitches of underlay runs — the preview draws them recessed. */
  underlay?: boolean;
}

export interface ColorBlock {
  color: string;
  polylines: Point[][];
  /** Per-run underlay flags, parallel to `polylines`; absent = all top. */
  underlay?: boolean[];
}

export interface StitchPlanOptions {
  /** Physical width of the design in mm; height scales proportionally. */
  targetWidthMm: number;
  /** Nominal running-stitch length in mm. */
  stitchLengthMm: number;
}

export interface StitchPlan {
  entries: PlanEntry[];
  colors: string[]; // one per block, in stitch order
  stats: {
    stitches: number;
    jumps: number;
    colorChanges: number;
    widthMm: number;
    heightMm: number;
  };
}

/**
 * Group consecutive same-color polylines into blocks so each thread color is
 * sewn once. Non-adjacent repeats of a color merge into the earlier block —
 * fewer thread changes matters more than strict document order for a tool
 * whose output is hand-loaded on a machine.
 */
export function groupByColor(polylines: ColoredPolyline[]): ColorBlock[] {
  const blocks: ColorBlock[] = [];
  const byColor = new Map<string, ColorBlock>();
  for (const { color, points, underlay } of polylines) {
    let block = byColor.get(color);
    if (!block) {
      block = { color, polylines: [], underlay: [] };
      byColor.set(color, block);
      blocks.push(block);
    }
    block.polylines.push(points);
    block.underlay!.push(underlay ?? false);
  }
  return blocks;
}

/**
 * Resample a polyline so consecutive points are at most `maxStep` apart,
 * keeping every original vertex (corners must land exactly).
 */
export function resample(points: Point[], maxStep: number): Point[] {
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-9) continue;
    const steps = Math.max(1, Math.ceil(len / maxStep));
    for (let s = 1; s <= steps; s++) {
      out.push({
        x: a.x + ((b.x - a.x) * s) / steps,
        y: a.y + ((b.y - a.y) * s) / steps,
      });
    }
  }
  return out;
}

export function buildPlan(
  blocks: ColorBlock[],
  options: StitchPlanOptions,
): StitchPlan {
  const all = blocks.flatMap((b) => b.polylines).flat();
  if (all.length === 0) {
    throw new Error("no stitchable geometry found in the SVG");
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of all) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const srcWidth = maxX - minX;
  const srcHeight = maxY - minY;
  const srcSpan = Math.max(srcWidth, srcHeight);
  if (srcSpan < 1e-9) {
    throw new Error("SVG geometry has zero extent");
  }

  // Scale so the design's larger side fits the target width; a tall skinny
  // design should not blow past hoop height just because "width" is the knob.
  const scale = (options.targetWidthMm * 10) / srcSpan;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // y flips: SVG is y-down, embroidery formats are y-up.
  const toMachine = (p: Point): Point => ({
    x: (p.x - cx) * scale,
    y: -(p.y - cy) * scale,
  });

  const stepUnits = options.stitchLengthMm * 10;
  const entries: PlanEntry[] = [];
  const colors: string[] = [];
  let stitches = 0;
  let jumps = 0;
  let colorChanges = 0;
  let position: Point = { x: 0, y: 0 };

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    const runs = block.polylines
      .map((points, i) => ({ points, underlay: block.underlay?.[i] ?? false }))
      .filter((r) => r.points.length > 1);
    if (runs.length === 0) continue;
    if (colors.length > 0) {
      entries.push({ kind: "color", x: position.x, y: position.y });
      colorChanges++;
    }
    colors.push(block.color);

    for (const run of runs) {
      const underlay = run.underlay || undefined;
      // Scale to machine units first so stitch length is a physical measure,
      // then resample and round to integer 0.1mm steps.
      const machineRun = resample(run.points.map(toMachine), stepUnits).map(
        (p) => ({
          x: Math.round(p.x),
          y: Math.round(p.y),
        }),
      );
      const start = machineRun[0];
      if (start.x !== position.x || start.y !== position.y) {
        entries.push({ kind: "jump", x: start.x, y: start.y });
        jumps++;
      }
      // First stitch anchors the needle at the run start even after a jump.
      let last = start;
      entries.push({ kind: "stitch", x: start.x, y: start.y, underlay });
      stitches++;
      for (let i = 1; i < machineRun.length; i++) {
        const p = machineRun[i];
        if (p.x === last.x && p.y === last.y) continue; // dedupe sub-unit steps
        entries.push({ kind: "stitch", x: p.x, y: p.y, underlay });
        stitches++;
        last = p;
      }
      position = last;
    }
  }

  entries.push({ kind: "end", x: position.x, y: position.y });

  return {
    entries,
    colors,
    stats: {
      stitches,
      jumps,
      colorChanges,
      widthMm: (srcWidth * scale) / 10,
      heightMm: (srcHeight * scale) / 10,
    },
  };
}
