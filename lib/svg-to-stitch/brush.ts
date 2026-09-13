// Brush engine: stamps a repeating penetration motif along a path in its
// local tangent/normal frame — the generalization of running stitch (one
// penetration per step) and satin (a zigzag pair per step) into a family of
// decorative stitches. Brushes are the machine proofing hand-style
// stitching: every stamp is ordinary penetrations within machine limits,
// never a format deviation.
//
// Every returned point is an exact needle penetration: the plan must sew
// them verbatim (no resampling), like satin — a mid-motif penetration would
// break the shape the motif draws.

import type { Point } from "./path-data";
import { sampleCenterline } from "./satin";

/** Supported pitch range, mm — declared in the brush-engine spec. */
export const BRUSH_MIN_PITCH_MM = 1;
export const BRUSH_MAX_PITCH_MM = 10;

/**
 * One motif template. `stamp` returns penetration offsets for a single
 * motif instance as [u, v] pairs in mm: u along the path tangent, v along
 * the left normal. Motifs whose geometry must link stamp-to-stamp (bean,
 * chain) take the pitch so consecutive stamps meet.
 *
 * Template extents are kept small enough that, at the 10 mm max pitch, no
 * thread segment — inside a stamp or bridging to the next — exceeds the
 * 12.1 mm machine bound.
 */
interface BrushDef {
  defaultPitchMm: number;
  stamp(pitchMm: number): [number, number][];
}

/**
 * The built-in library: the six motifs from the founder's Figma
 * stitch-brush explorations. Reachable by `st-brush-<name>` layer tags.
 */
export const BRUSHES: Record<string, BrushDef> = {
  // X pairs: two crossing diagonals per stamp.
  cross: {
    defaultPitchMm: 3,
    stamp: () => [
      [-1.4, -1.4],
      [1.4, 1.4],
      [1.4, -1.4],
      [-1.4, 1.4],
    ],
  },
  // Angled ticks: one 45° slash per stamp.
  tick: {
    defaultPitchMm: 2.5,
    stamp: () => [
      [-1.1, -1.1],
      [1.1, 1.1],
    ],
  },
  // Linked loops: an ellipse per stamp, long enough to overlap the next.
  chain: {
    defaultPitchMm: 3,
    stamp: (pitchMm) => {
      const rx = Math.min(pitchMm * 0.55, 2.2);
      const ry = 1.1;
      const pts: [number, number][] = [];
      for (let k = 0; k <= 8; k++) {
        const ang = Math.PI - (k * Math.PI) / 4;
        pts.push([rx * Math.cos(ang), ry * Math.sin(ang)]);
      }
      return pts;
    },
  },
  // Compact dot clusters: a tiny knot of short stitches.
  dot: {
    defaultPitchMm: 2,
    stamp: () => [
      [-0.4, 0],
      [0.4, 0],
      [0, -0.4],
      [0, 0.4],
    ],
  },
  // Bird tracks: a chevron with its tip on the path, toes trailing.
  bird: {
    defaultPitchMm: 3,
    stamp: () => [
      [-1.2, -1.3],
      [0, 0],
      [-1.2, 1.3],
    ],
  },
  // Bean stitch: each pitch-long segment sewn three times (out, back, out).
  bean: {
    defaultPitchMm: 2.5,
    stamp: (pitchMm) => {
      const h = pitchMm / 2;
      return [
        [-h, 0],
        [h, 0],
        [-h, 0],
        [h, 0],
      ];
    },
  },
};

export const BRUSH_NAMES = Object.keys(BRUSHES);

export interface BrushRunOptions {
  /** Library brush name (must exist in BRUSHES — callers validate first). */
  name: string;
  /** Motif spacing along the path, mm. */
  pitchMm: number;
  /** User units per mm — the converter's shared physical scale. */
  unitsPerMm: number;
}

/**
 * Stamp a brush's motif along a path: one instance per pitch step of arc
 * length, positioned on the path and rotated to the local tangent/normal
 * frame, so the motif follows curves the way hand stitching would.
 *
 * Returns exact penetrations in user units, or [] when the path is
 * degenerate (fewer than 2 distinct points) so callers can fall back to a
 * running stitch — the same contract as satinZigzag.
 */
export function brushRun(points: Point[], opts: BrushRunOptions): Point[] {
  const def = BRUSHES[opts.name];
  if (!def) {
    throw new Error(`unknown brush "${opts.name}"`);
  }
  if (
    !Number.isFinite(opts.pitchMm) ||
    opts.pitchMm < BRUSH_MIN_PITCH_MM ||
    opts.pitchMm > BRUSH_MAX_PITCH_MM
  ) {
    throw new Error(
      `brush pitch must be between ${BRUSH_MIN_PITCH_MM} and ${BRUSH_MAX_PITCH_MM} mm`,
    );
  }
  if (!Number.isFinite(opts.unitsPerMm) || opts.unitsPerMm <= 0) {
    throw new Error("unitsPerMm must be a positive number");
  }

  const samples = sampleCenterline(points, opts.pitchMm * opts.unitsPerMm);
  if (samples.length < 2) return [];

  const template = def.stamp(opts.pitchMm);
  const out: Point[] = [];
  for (const { pos, tangent } of samples) {
    // Left normal of the tangent; [u, v] mm offsets map into the frame.
    const nx = -tangent.y;
    const ny = tangent.x;
    for (const [u, v] of template) {
      const du = u * opts.unitsPerMm;
      const dv = v * opts.unitsPerMm;
      out.push({
        x: pos.x + tangent.x * du + nx * dv,
        y: pos.y + tangent.y * du + ny * dv,
      });
    }
  }
  return out;
}
