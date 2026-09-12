// Curved two-rail satin. A flattened stroke — what Figma exports for
// inside/outside-aligned or brush strokes — arrives as a filled ribbon: one
// ring tracing down one side and back the other (open ribbon), or two
// nested rings (a closed ribbon, like a circle border). The fixed-axis
// satin fill can't follow the bend, but the ribbon's own boundary IS the
// two rails; pairing opposite boundary points recovers the spine, the
// local frame, and the width function, and the satin follows the curve.
//
// This spine-plus-frame machinery is deliberately the first piece of the
// stitch-brush engine: satin is the simplest brush (alternate ±width/2
// along the spine); motif brushes stamp richer penetration templates in
// the same frame.

import type { Point } from "./path-data";

export interface RibbonOptions {
  /** Thread pitch along the spine, in ring units. */
  density: number;
  /** Widest allowed traverse — wider ribbons stay tatami. */
  maxWidth: number;
  /** Median width the ribbon must reach to read as satin. */
  minMedianWidth: number;
}

export interface RibbonSatinResult {
  /** Zigzag runs of exact penetrations — the plan must not resample. */
  runs: Point[][];
  /** Spine polylines (pair midpoints) for a center-run underlay. */
  centers: Point[][];
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Resample a closed ring (first point repeated last or not) to n points
 * at equal arc steps, dropping the duplicate closing point. */
function resampleClosed(ring: Point[], n: number): Point[] {
  const pts =
    ring.length > 1 &&
    ring[0].x === ring[ring.length - 1].x &&
    ring[0].y === ring[ring.length - 1].y
      ? ring.slice(0, -1)
      : ring.slice();
  const total = pts.reduce(
    (sum, p, i) => sum + dist(p, pts[(i + 1) % pts.length]),
    0,
  );
  if (total < 1e-9) return [];
  const step = total / n;
  const out: Point[] = [];
  let i = 0;
  let acc = 0; // arc length already consumed within segment i
  for (let k = 0; k < n; k++) {
    let target = k * step;
    // Advance to the segment containing `target`.
    while (true) {
      const a = pts[i % pts.length];
      const b = pts[(i + 1) % pts.length];
      const len = dist(a, b);
      if (target - acc <= len || i > pts.length * 2) {
        const t = len < 1e-12 ? 0 : (target - acc) / len;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        break;
      }
      acc += len;
      i++;
    }
  }
  return out;
}

interface Pairing {
  /** Rail A and rail B points, index-aligned; spine is their midpoint. */
  a: Point[];
  b: Point[];
  widths: number[];
  closed: boolean;
}

/**
 * Pair two rails by greedy shortest-diagonal marching: two pointers walk
 * the rails together, always advancing whichever side yields the shorter
 * next traverse. This is how strip triangulation pairs polygon chains, and
 * it's robust where simpler parameterizations fail — bends (the outer rail
 * is longer), inflections (the rails swap being outer/inner mid-ribbon,
 * which breaks fractional pairing), and tapers.
 */
function railPairs(a: Point[], b: Point[]): Pairing {
  const pa: Point[] = [a[0]];
  const pb: Point[] = [b[0]];
  const widths: number[] = [dist(a[0], b[0])];
  let i = 0;
  let j = 0;
  while (i < a.length - 1 || j < b.length - 1) {
    const advanceA = i < a.length - 1 ? dist(a[i + 1], b[j]) : Infinity;
    const advanceB = j < b.length - 1 ? dist(a[i], b[j + 1]) : Infinity;
    if (advanceA <= advanceB) i++;
    else j++;
    pa.push(a[i]);
    pb.push(b[j]);
    widths.push(dist(a[i], b[j]));
  }
  return { a: pa, b: pb, widths, closed: false };
}

/**
 * Open ribbon (one ring): locate the two cap centers (the two fold offsets
 * where the ring folds back onto itself best), split the ring into its two
 * rails between them, and pair the rails greedily.
 */
function foldPairing(ring: Point[], samples: number): Pairing | null {
  const n = samples % 2 === 0 ? samples : samples + 1;
  const pts = resampleClosed(ring, n);
  if (pts.length < 8) return null;
  const half = n / 2;

  // Local fold cost: how well the ring folds back onto itself in the
  // offset's own neighborhood. Kept local on purpose — a global fold cost
  // is skewed by unequal rail lengths on curved ribbons and lands the
  // "cap" away from the true cap center.
  const reach = Math.max(6, Math.floor(n / 16));
  const probe = (offset: number): number => {
    const stride = Math.max(1, Math.floor(reach / 12));
    let sum = 0;
    let count = 0;
    for (let i = stride; i <= reach; i += stride) {
      sum += dist(pts[(offset + i) % n], pts[(offset - i + n) % n]);
      count++;
    }
    return count ? sum / count : Infinity;
  };

  const coarseStep = Math.max(1, Math.floor(n / 128));
  const refine = (seed: number): { offset: number; cost: number } => {
    let offset = ((seed % n) + n) % n;
    let cost = probe(offset);
    for (let o = seed - coarseStep; o <= seed + coarseStep; o++) {
      const c = probe(((o % n) + n) % n);
      if (c < cost) {
        cost = c;
        offset = ((o % n) + n) % n;
      }
    }
    return { offset, cost };
  };

  // Best fold = one cap; best fold far enough away = the other cap.
  let seed1 = 0;
  let best1 = Infinity;
  const costs = new Map<number, number>();
  for (let o = 0; o < n; o += coarseStep) {
    const c = probe(o);
    costs.set(o, c);
    if (c < best1) {
      best1 = c;
      seed1 = o;
    }
  }
  const cap1 = refine(seed1);
  let seed2 = -1;
  let best2 = Infinity;
  for (const [o, c] of costs) {
    const sep = Math.min(
      Math.abs(o - cap1.offset),
      n - Math.abs(o - cap1.offset),
    );
    if (sep > n / 6 && c < best2) {
      best2 = c;
      seed2 = o;
    }
  }
  if (seed2 < 0) return null;
  const cap2 = refine(seed2);

  // The two rails run cap-to-cap, one each way around the ring.
  const lenA = (cap2.offset - cap1.offset + n) % n;
  if (lenA < 4 || n - lenA < 4) return null;
  const railA: Point[] = [];
  for (let i = 0; i <= lenA; i++) railA.push(pts[(cap1.offset + i) % n]);
  const railB: Point[] = [];
  for (let i = 0; i <= n - lenA; i++) {
    railB.push(pts[(cap1.offset - i + n) % n]);
  }

  if (railA.length < 4 || railB.length < 4) return null;
  return railPairs(railA, railB);
}

/**
 * Closed ribbon (two nested rings, an annulus): the rings are the rails.
 * Both are resampled to the same count and aligned at the nearest start;
 * both orientations are tried and the tighter pairing wins.
 */
function annulusPairing(rings: Point[][], samples: number): Pairing | null {
  const r0 = resampleClosed(rings[0], samples);
  const r1 = resampleClosed(rings[1], samples);
  if (r0.length < 8 || r1.length < 8) return null;
  const n = r0.length;

  const tryOrientation = (inner: Point[]): Pairing => {
    let j0 = 0;
    let best = Infinity;
    for (let j = 0; j < n; j++) {
      const d = dist(r0[0], inner[j]);
      if (d < best) {
        best = d;
        j0 = j;
      }
    }
    // Cut both rings at the aligned start, close each back to it, and let
    // the greedy pairing walk them — non-circular annuli distribute their
    // arc unevenly, which fixed index mapping mispairs.
    const railA = [...r0, r0[0]];
    const railB: Point[] = [];
    for (let i = 0; i < inner.length; i++) {
      railB.push(inner[(j0 + i) % inner.length]);
    }
    railB.push(inner[j0]);
    const paired = railPairs(railA, railB);
    return { ...paired, closed: true };
  };

  const forward = tryOrientation(r1);
  const backward = tryOrientation([...r1].reverse());
  const mean = (p: Pairing) =>
    p.widths.reduce((s, w) => s + w, 0) / p.widths.length;
  return mean(forward) <= mean(backward) ? forward : backward;
}

/**
 * Try to sew a fill region as a curved satin ribbon. Returns null when the
 * region doesn't read as a ribbon in the satin range — the caller falls
 * back to tatami.
 */
export function ribbonSatin(
  rings: Point[][],
  opts: RibbonOptions,
): RibbonSatinResult | null {
  if (!Number.isFinite(opts.density) || opts.density <= 0) {
    throw new Error("ribbon density must be a positive number");
  }
  if (!Number.isFinite(opts.maxWidth) || opts.maxWidth <= 0) {
    throw new Error("ribbon max width must be a positive number");
  }
  if (!Number.isFinite(opts.minMedianWidth) || opts.minMedianWidth < 0) {
    throw new Error("ribbon minimum median width must be a number");
  }
  if (rings.length === 0 || rings.length > 2) return null;

  const perimeter = rings[0].reduce(
    (sum, p, i, arr) => sum + dist(p, arr[(i + 1) % arr.length]),
    0,
  );
  // Two ring samples per density step keeps pairs finer than the pitch;
  // bounded so pathological inputs stay cheap.
  const samples = Math.max(
    64,
    Math.min(4096, Math.round((perimeter / opts.density) * 2)),
  );

  const pairing =
    rings.length === 1
      ? foldPairing(rings[0], samples)
      : annulusPairing(rings, samples);
  if (!pairing) return null;

  // Qualify on the interior widths (open-ribbon caps taper to zero).
  const trim = pairing.closed
    ? 0
    : Math.max(1, Math.floor(pairing.widths.length * 0.05));
  const interior = pairing.widths.slice(
    trim,
    pairing.widths.length - trim || undefined,
  );
  if (interior.length < 4) return null;
  const sorted = [...interior].sort((m, n) => m - n);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  if (p95 > opts.maxWidth || median < opts.minMedianWidth) return null;

  // Spine and elongation: a blob folds too, but its "spine" is short
  // relative to its width — a ribbon is long.
  const spine = pairing.a.map((pa, i) => ({
    x: (pa.x + pairing.b[i].x) / 2,
    y: (pa.y + pairing.b[i].y) / 2,
  }));
  let spineLength = 0;
  for (let i = 1; i < spine.length; i++) {
    spineLength += dist(spine[i - 1], spine[i]);
  }
  if (spineLength < 2.5 * median) return null;

  // Walk the spine at the thread pitch, penetrating alternate rails at the
  // matching pair parameter.
  const run: Point[] = [];
  const centers: Point[] = [];
  let acc = 0;
  let nextAt = 0;
  let side = 0;
  for (let i = 0; i < spine.length; i++) {
    if (i > 0) acc += dist(spine[i - 1], spine[i]);
    if (acc >= nextAt) {
      run.push(side % 2 === 0 ? pairing.a[i] : pairing.b[i]);
      centers.push(spine[i]);
      side++;
      nextAt = acc + opts.density;
    }
  }
  if (run.length < 4) return null;

  return { runs: [run], centers: [centers] };
}
