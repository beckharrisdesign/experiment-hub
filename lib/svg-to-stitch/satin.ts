// Satin column generation. A stroke wide enough to read as a border or
// letterform (roughly 1–10 mm) shouldn't sew as a single running line down
// its center — real digitizers cover it with satin: long zigzag stitches
// spanning the full width, following the centerline. This module turns a
// stroke's centerline polyline into that zigzag.
//
// Every returned point is an exact needle penetration: the plan must sew
// them verbatim (no resampling), because a mid-column penetration would
// break the smooth satin surface.

import type { Point } from "./path-data";

export interface SatinOptions {
  /** Full column width in user units — the stroke's rendered width. */
  width: number;
  /**
   * Advance along the centerline per penetration, in user units. Each step
   * lays one thread across the column, so this is the visual thread pitch
   * (0.4 mm is standard satin coverage).
   */
  density: number;
}

interface Sample {
  pos: Point;
  /** Unit tangent of the centerline at this sample. */
  tangent: Point;
}

/**
 * Resample a polyline at (nearly) uniform arc-length steps, endpoints
 * included. Steps are stretched/shrunk so the last sample lands exactly on
 * the path end instead of leaving a cramped final stitch.
 */
function sampleCenterline(points: Point[], step: number): Sample[] {
  // Segment lengths, skipping zero-length segments outright so tangents are
  // always well defined.
  const segs: { a: Point; b: Point; len: number; tangent: Point }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-9) continue;
    segs.push({
      a,
      b,
      len,
      tangent: { x: (b.x - a.x) / len, y: (b.y - a.y) / len },
    });
  }
  if (segs.length === 0) return [];
  const total = segs.reduce((sum, s) => sum + s.len, 0);

  const n = Math.max(1, Math.round(total / step));
  const actual = total / n;

  const samples: Sample[] = [];
  let segIndex = 0;
  let segStart = 0; // arc length at the start of segs[segIndex]
  for (let i = 0; i <= n; i++) {
    const s = Math.min(i * actual, total);
    while (
      segIndex < segs.length - 1 &&
      s > segStart + segs[segIndex].len + 1e-9
    ) {
      segStart += segs[segIndex].len;
      segIndex++;
    }
    const seg = segs[segIndex];
    const t = Math.min(Math.max((s - segStart) / seg.len, 0), 1);
    samples.push({
      pos: {
        x: seg.a.x + (seg.b.x - seg.a.x) * t,
        y: seg.a.y + (seg.b.y - seg.a.y) * t,
      },
      tangent: seg.tangent,
    });
  }
  return samples;
}

/**
 * Build the satin zigzag for a centerline: penetrations alternating between
 * the two rails at ±width/2 along the local normal. Corners are handled by
 * the per-segment tangent (each sample offsets perpendicular to the segment
 * it sits on) — good for the gentle curves and right angles of borders and
 * badge text; extreme hairpins may thin slightly on the outside, which is
 * also true of naive satin in real digitizers.
 *
 * Returns [] when the centerline is degenerate (fewer than 2 distinct
 * points), so callers can fall back to a running stitch.
 */
export function satinZigzag(points: Point[], opts: SatinOptions): Point[] {
  if (
    !Number.isFinite(opts.width) ||
    opts.width <= 0 ||
    !Number.isFinite(opts.density) ||
    opts.density <= 0
  ) {
    throw new Error("satin width and density must be positive numbers");
  }
  const samples = sampleCenterline(points, opts.density);
  if (samples.length < 2) return [];

  const half = opts.width / 2;
  const out: Point[] = [];
  for (let i = 0; i < samples.length; i++) {
    const { pos, tangent } = samples[i];
    // Left normal of the tangent; alternating sign makes the zigzag.
    const side = i % 2 === 0 ? 1 : -1;
    out.push({
      x: pos.x - tangent.y * half * side,
      y: pos.y + tangent.x * half * side,
    });
  }
  return out;
}
