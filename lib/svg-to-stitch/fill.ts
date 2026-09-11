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
function scanRows(rings: Point[][], opts: HatchOptions): RowSegment[] {
  const a = (-opts.angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const rotated = rings.map((ring) => ring.map((p) => rotate(p, cos, sin)));

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
      if (xs[i + 1] - xs[i] > 1e-9) {
        segments.push({ y, x0: xs[i], x1: xs[i + 1], row });
      }
    }
  }
  return segments;
}

/**
 * Group row segments into columns: a segment continues the column whose
 * previous-row segment it overlaps in x. Concave regions and holes split
 * into multiple columns, each sewn as one serpentine block.
 */
function buildColumns(segments: RowSegment[]): RowSegment[][] {
  const columns: RowSegment[][] = [];
  const open: RowSegment[][] = [];
  let currentRow = -1;
  const claimed = new Set<RowSegment[]>();

  for (let i = 0; i <= segments.length; i++) {
    const seg = segments[i];
    if (!seg || seg.row !== currentRow) {
      // Row boundary: columns that got no segment this row are finished.
      if (currentRow >= 0) {
        for (let c = open.length - 1; c >= 0; c--) {
          if (!claimed.has(open[c])) open.splice(c, 1);
        }
        claimed.clear();
      }
      if (!seg) break;
      currentRow = seg.row;
    }
    const last = (col: RowSegment[]) => col[col.length - 1];
    const overlaps = (col: RowSegment[]) =>
      !claimed.has(col) &&
      last(col).row === seg.row - 1 &&
      seg.x0 < last(col).x1 &&
      last(col).x0 < seg.x1;
    const col = open.find(overlaps);
    if (col) {
      col.push(seg);
      claimed.add(col);
    } else {
      const fresh = [seg];
      open.push(fresh);
      columns.push(fresh);
      claimed.add(fresh);
    }
  }
  return columns;
}

/**
 * Stitch one column serpentine: rows alternate direction, needle points laid
 * at the stitch length with a 4-phase per-row offset (classic tatami stagger).
 */
function stitchColumn(column: RowSegment[], opts: HatchOptions): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < column.length; i++) {
    const seg = column[i];
    const leftToRight = i % 2 === 0;
    const from = leftToRight ? seg.x0 : seg.x1;
    const to = leftToRight ? seg.x1 : seg.x0;
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
  return out;
}

/**
 * Fill the region bounded by `rings` (even-odd) with tatami rows.
 * Returns one polyline per serpentine column, in ring coordinates.
 */
export function hatchFill(rings: Point[][], opts: HatchOptions): Point[][] {
  const closed = closeRings(rings);
  if (closed.length === 0) return [];
  const segments = scanRows(closed, opts);
  const columns = buildColumns(segments);

  const a = (opts.angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return columns
    .map((column) => stitchColumn(column, opts))
    .filter((run) => run.length > 1)
    .map((run) => run.map((p) => rotate(p, cos, sin)));
}
