// Tatami fill: turns a filled region (closed rings, even-odd rule) into rows
// of running stitch that cover its interior — how digitizing software renders
// a vector fill as embroidery. Rows run at a fixed angle and spacing,
// serpentine-connected inside each column of the region, with per-row stitch
// phase offsets so needle points don't line up into visible tram lines (the
// "tatami" texture). Optionally preceded by a sparse perpendicular underlay
// pass that stabilizes the fabric before the top stitching lands.

import type { Point } from "./path-data";

export interface HatchOptions {
  /** Hatch direction in degrees; 0 = horizontal rows. */
  angleDeg: number;
  /** Distance between rows, in the same units as the ring coordinates. */
  spacing: number;
  /** Stitch length used to pre-place needle points along each row. */
  stitchLength: number;
}

interface RowSegment {
  y: number;
  x0: number;
  x1: number;
  row: number;
}

function rotate(p: Point, cos: number, sin: number): Point {
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Ring signed area (shoelace); 0 for degenerate rings. */
function ringArea(ring: Point[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i].x * ring[i + 1].y - ring[i + 1].x * ring[i].y;
  }
  return sum / 2;
}

/**
 * Close every ring (fills treat subpaths as closed), drop degenerate ones.
 */
export function closeRings(rings: Point[][]): Point[][] {
  const out: Point[][] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const closed =
      ring[0].x === ring[ring.length - 1].x &&
      ring[0].y === ring[ring.length - 1].y
        ? ring
        : [...ring, ring[0]];
    if (Math.abs(ringArea(closed)) > 1e-9) out.push(closed);
  }
  return out;
}

/**
 * Scanline the rings at the hatch angle and return the covered intervals of
 * every row, even-odd rule (so holes — inner rings — are left unstitched).
 */
function scanRows(rotated: Point[][], opts: HatchOptions): RowSegment[] {
  // A segment shorter than this is a lone needle poke that still costs a
  // run and a jump — digitizers cull them.
  const minSeg = Math.min(opts.spacing, opts.stitchLength) / 2;

  let minY = Infinity;
  let maxY = -Infinity;
  for (const ring of rotated) {
    for (const p of ring) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }

  const segments: RowSegment[] = [];
  // Offset the first row half a spacing in so a shape exactly one spacing
  // tall still gets a row through its middle.
  for (
    let row = 0, y = minY + opts.spacing / 2;
    y < maxY;
    row++, y += opts.spacing
  ) {
    const xs: number[] = [];
    for (const ring of rotated) {
      for (let i = 0; i < ring.length - 1; i++) {
        const p = ring[i];
        const q = ring[i + 1];
        // Half-open rule so a row through a vertex counts once, not twice.
        if (p.y <= y === q.y <= y) continue;
        xs.push(p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y));
      }
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (xs[i + 1] - xs[i] > minSeg) {
        segments.push({ y, x0: xs[i], x1: xs[i + 1], row });
      }
    }
  }
  return segments;
}

/** Even-odd point-in-region test over closed rings. */
function insideRegion(p: Point, rings: Point[][]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      if (a.y <= p.y === b.y <= p.y) continue;
      const x = a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y);
      if (x > p.x) inside = !inside;
    }
  }
  return inside;
}

/**
 * Sequence the runs for sewing economy: greedy nearest-neighbor ordering
 * (reversing a run when its far end is closer), then merge consecutive runs
 * whose gap is at most one stitch AND stays inside the region — the needle
 * stitches over instead of jumping. Scattered scanline order is what turns
 * a detailed fill into confetti: hundreds of long jumps criss-crossing the
 * design, and a trim at every one on a real machine.
 */
// Above this many runs, greedy nearest-neighbor's O(R²) scan could block
// the browser; such pathological fills keep scanline order, which is
// already roughly spatial.
const MAX_NN_RUNS = 4000;

/**
 * Every sampled point of the connector from `a` to `b` must lie inside the
 * region — a midpoint alone can miss a chord that exits through a thin
 * notch or hole slot and re-enters.
 */
function connectorInside(
  a: Point,
  b: Point,
  rings: Point[][],
  opts: HatchOptions,
): boolean {
  const gap = Math.hypot(b.x - a.x, b.y - a.y);
  const step = Math.min(opts.spacing, opts.stitchLength) / 2;
  const samples = Math.min(8, Math.max(1, Math.ceil(gap / step)));
  for (let s = 1; s <= samples; s++) {
    const t = s / (samples + 1);
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (!insideRegion(p, rings)) return false;
  }
  return true;
}

function orderAndMerge(
  runs: Point[][],
  rings: Point[][],
  opts: HatchOptions,
): Point[][] {
  if (runs.length === 0) return runs;

  let ordered: Point[][];
  if (runs.length === 1 || runs.length > MAX_NN_RUNS) {
    ordered = runs;
  } else {
    const remaining = new Set(runs.map((_, i) => i));
    ordered = [];
    let current = runs[0];
    remaining.delete(0);
    ordered.push(current);
    while (remaining.size > 0) {
      const end = current[current.length - 1];
      let best = -1;
      let bestDist = Infinity;
      let bestReversed = false;
      for (const i of remaining) {
        const run = runs[i];
        const toStart = Math.hypot(run[0].x - end.x, run[0].y - end.y);
        const toEnd = Math.hypot(
          run[run.length - 1].x - end.x,
          run[run.length - 1].y - end.y,
        );
        if (toStart < bestDist) {
          bestDist = toStart;
          best = i;
          bestReversed = false;
        }
        if (toEnd < bestDist) {
          bestDist = toEnd;
          best = i;
          bestReversed = true;
        }
      }
      remaining.delete(best);
      current = bestReversed ? [...runs[best]].reverse() : runs[best];
      ordered.push(current);
    }
  }

  const merged: Point[][] = [];
  let acc = ordered[0];
  for (let i = 1; i < ordered.length; i++) {
    const next = ordered[i];
    const end = acc[acc.length - 1];
    const gap = Math.hypot(next[0].x - end.x, next[0].y - end.y);
    if (
      gap <= opts.stitchLength &&
      connectorInside(end, next[0], rings, opts)
    ) {
      acc = [...acc, ...next];
    } else {
      merged.push(acc);
      acc = next;
    }
  }
  merged.push(acc);

  // Post-merge cull: a run still shorter than one stitch after merging is
  // an isolated needle poke costing two trims — the region's boundary run
  // covers that sliver anyway. Applies to single-run regions too.
  return merged.filter((run) => pathLength(run) >= opts.stitchLength);
}

function pathLength(run: Point[]): number {
  let len = 0;
  for (let i = 1; i < run.length; i++) {
    len += Math.hypot(run[i].x - run[i - 1].x, run[i].y - run[i - 1].y);
  }
  return len;
}

/**
 * Group row segments into columns, each sewn as one serpentine block. A
 * column continues only through a 1:1 overlap between consecutive rows: the
 * moment the interval topology changes — a hole opens (one segment overlaps
 * two), holes merge (two overlap one), or overlap is lost — the column ends
 * and fresh columns start. Anything looser lets the serpentine connector
 * stitch straight across an excluded interval.
 */
function buildColumns(segments: RowSegment[]): RowSegment[][] {
  const byRow = new Map<number, RowSegment[]>();
  for (const seg of segments) {
    byRow.set(seg.row, [...(byRow.get(seg.row) ?? []), seg]);
  }

  const columns: RowSegment[][] = [];
  let open: RowSegment[][] = [];
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  for (const row of rows) {
    const segs = byRow.get(row)!;
    const overlap = (col: RowSegment[], seg: RowSegment) => {
      const last = col[col.length - 1];
      return last.row === row - 1 && seg.x0 < last.x1 && last.x0 < seg.x1;
    };
    const colMatches = open.map((col) => segs.filter((s) => overlap(col, s)));
    const segMatches = segs.map((s) => open.filter((col) => overlap(col, s)));

    const next: RowSegment[][] = [];
    for (const seg of segs) {
      const mine = segMatches[segs.indexOf(seg)];
      const col = mine.length === 1 ? mine[0] : null;
      if (col && colMatches[open.indexOf(col)].length === 1) {
        col.push(seg);
        next.push(col);
      } else {
        const fresh = [seg];
        columns.push(fresh);
        next.push(fresh);
      }
    }
    open = next;
  }
  return columns;
}

/**
 * Stitch one column's rows with needle points laid at the stitch length and
 * a 4-phase per-row offset (classic tatami stagger). Each row is entered at
 * whichever end sits nearest the previous row's end — usually serpentine
 * alternation, but a row that shifts across the previous endpoint can sew
 * the same direction twice. When even the nearest entry would need a
 * connector longer than one stitch — a region edge running nearly parallel
 * to the rows, like the top bar of a letter — the run breaks instead: the
 * plan sews a jump there, never a long thread across fabric outside the
 * shape. Returns one or more runs per column.
 */
function stitchColumn(column: RowSegment[], opts: HatchOptions): Point[][] {
  const runs: Point[][] = [];
  let out: Point[] = [];
  for (let i = 0; i < column.length; i++) {
    const seg = column[i];
    const prevEnd = out[out.length - 1];
    // Greedy direction: enter the row at the end closest to where the
    // needle already is (first row defaults to left-to-right).
    const leftToRight = prevEnd
      ? Math.abs(seg.x0 - prevEnd.x) <= Math.abs(seg.x1 - prevEnd.x)
      : true;
    const from = leftToRight ? seg.x0 : seg.x1;
    const to = leftToRight ? seg.x1 : seg.x0;
    if (prevEnd && Math.abs(from - prevEnd.x) > opts.stitchLength) {
      runs.push(out);
      out = [];
    }
    const dir = Math.sign(to - from);
    const len = Math.abs(to - from);
    const phase = ((seg.row % 4) / 4) * opts.stitchLength;
    out.push({ x: from, y: seg.y });
    for (
      let d = phase > 1e-9 ? phase : opts.stitchLength;
      d < len;
      d += opts.stitchLength
    ) {
      out.push({ x: from + dir * d, y: seg.y });
    }
    out.push({ x: to, y: seg.y });
  }
  runs.push(out);
  return runs;
}

/**
 * Fill the region bounded by `rings` (even-odd) with tatami rows.
 * Returns the stitch runs in ring coordinates — usually one per serpentine
 * column, but a column splits into several runs wherever a safe connector
 * doesn't exist (the plan jumps between runs).
 */
export function hatchFill(rings: Point[][], opts: HatchOptions): Point[][] {
  // Guard the loop increments: hatchFill is exported, and a zero or negative
  // spacing/stitch length would spin scanRows/stitchColumn forever.
  if (!Number.isFinite(opts.spacing) || opts.spacing <= 0) {
    throw new Error("hatch spacing must be a positive number");
  }
  if (!Number.isFinite(opts.stitchLength) || opts.stitchLength <= 0) {
    throw new Error("hatch stitch length must be a positive number");
  }
  if (!Number.isFinite(opts.angleDeg)) {
    throw new Error("hatch angle must be a number of degrees");
  }
  const closed = closeRings(rings);
  if (closed.length === 0) return [];

  const a = (opts.angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // Work in row-aligned space: rotate the rings once, and rotate the
  // finished runs back at the end.
  const rotated = closed.map((ring) => ring.map((p) => rotate(p, cos, -sin)));
  const segments = scanRows(rotated, opts);
  const columns = buildColumns(segments);
  const runs = columns
    .flatMap((column) => stitchColumn(column, opts))
    .filter((run) => run.length > 1);
  return orderAndMerge(runs, rotated, opts).map((run) =>
    run.map((p) => rotate(p, cos, sin)),
  );
}
