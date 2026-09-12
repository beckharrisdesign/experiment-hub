// Top-level conversion: SVG text in, stitch plan + encoded DST/EXP out.
// Pure TypeScript over the DOM's XML parser, so the whole pipeline runs
// client-side in the browser (and under jsdom in tests) — no server round
// trip, files never leave the machine.

import {
  extractGeometry,
  extractPolylines,
  type ColoredPolyline,
  type ExtractedGeometry,
} from "./svg-parse";
import { hatchFill, closeRings } from "./fill";
import { satinZigzag } from "./satin";
import { buildPlan, groupByColor, type StitchPlan } from "./plan";
import { encodeDst } from "./dst";
import { encodeExp } from "./exp";

export interface ConvertOptions {
  /** Physical size of the design's larger side, in mm. */
  targetWidthMm: number;
  /** Nominal running-stitch length in mm. */
  stitchLengthMm: number;
  /** Design name embedded in the DST header. */
  designName?: string;
  /**
   * How filled shapes stitch: "fill" (default) hatches their interior with
   * tatami rows; "outline" traces only their boundary — the converter's
   * original behavior.
   */
  fillMode?: "fill" | "outline";
  /** Tatami row direction in degrees (default 45). */
  fillAngleDeg?: number;
  /** Distance between tatami rows in mm (default 0.4). */
  fillSpacingMm?: number;
  /**
   * Sew a sparse perpendicular underlay pass beneath each fill (default
   * true) — it stabilizes the fabric so the top stitching doesn't pucker.
   */
  fillUnderlay?: boolean;
  /**
   * Sew strokes whose rendered width lands in the satin range (1–10 mm at
   * the output size) as satin columns instead of a single running line
   * (default true; fill mode only). Thinner strokes always run; wider ones
   * would leave loose thread and also fall back to a running line.
   */
  satinStrokes?: boolean;
  /** Thread pitch along a satin column in mm (default 0.4). */
  satinDensityMm?: number;
}

export interface ConvertResult {
  plan: StitchPlan;
  dst: Uint8Array;
  exp: Uint8Array;
}

export const DEFAULT_OPTIONS: ConvertOptions = {
  targetWidthMm: 63.5, // the standard 2.5 in patch
  stitchLengthMm: 2.5,
  fillMode: "fill",
  fillAngleDeg: 45,
  fillSpacingMm: 0.4,
  fillUnderlay: true,
  satinStrokes: true,
  satinDensityMm: 0.4,
};

// Underlay: rows perpendicular to the top stitching, spaced far apart — a
// scaffold, not coverage.
const UNDERLAY_SPACING_MM = 2;

// Satin range: below 1 mm the zigzag collapses into a fat running stitch;
// above 10 mm the long floats snag and pull — real digitizers split such
// columns or switch to fill, so we fall back to the running line instead.
const SATIN_MIN_WIDTH_MM = 1;
const SATIN_MAX_WIDTH_MM = 10;

export function convertSvg(
  svgText: string,
  options: ConvertOptions = DEFAULT_OPTIONS,
): ConvertResult {
  // Number.isFinite first: every comparison with NaN is false, so a bare
  // range check would wave NaN straight through into the scaling math.
  if (
    !Number.isFinite(options.targetWidthMm) ||
    options.targetWidthMm < 10 ||
    options.targetWidthMm > 400
  ) {
    throw new Error("target width must be between 10 and 400 mm");
  }
  if (
    !Number.isFinite(options.stitchLengthMm) ||
    options.stitchLengthMm < 1 ||
    options.stitchLengthMm > 7
  ) {
    throw new Error("stitch length must be between 1 and 7 mm");
  }
  const fillMode = options.fillMode ?? "fill";
  if (fillMode !== "fill" && fillMode !== "outline") {
    // Runtime callers aren't bound by the TypeScript union; fail loudly
    // instead of silently treating junk as fill mode.
    throw new Error('fill mode must be "fill" or "outline"');
  }
  const fillAngleDeg = options.fillAngleDeg ?? 45;
  const fillSpacingMm = options.fillSpacingMm ?? 0.4;
  const fillUnderlay = options.fillUnderlay ?? true;
  if (!Number.isFinite(fillAngleDeg)) {
    throw new Error("fill angle must be a number of degrees");
  }
  if (
    !Number.isFinite(fillSpacingMm) ||
    fillSpacingMm < 0.2 ||
    fillSpacingMm > 2
  ) {
    throw new Error("fill spacing must be between 0.2 and 2 mm");
  }
  const satinStrokes = options.satinStrokes ?? true;
  const satinDensityMm = options.satinDensityMm ?? 0.4;
  if (
    !Number.isFinite(satinDensityMm) ||
    satinDensityMm < 0.2 ||
    satinDensityMm > 2
  ) {
    throw new Error("satin density must be between 0.2 and 2 mm");
  }

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("could not parse the file as SVG");
  }

  // Flattening tolerance: 0.05mm at the final output size, expressed in user
  // units. Two passes because the user-unit extent isn't known until after a
  // first parse; the initial coarse pass only measures.
  const coarse = extractGeometry(doc, 1);
  const extent = measure(coarse);
  const tolerance = (extent / (options.targetWidthMm * 10)) * 0.5;

  let polylines: ColoredPolyline[];
  if (fillMode === "outline") {
    polylines = extractPolylines(doc, Math.max(tolerance, 1e-6));
  } else {
    const geometry = extractGeometry(doc, Math.max(tolerance, 1e-6));
    // Physical mm expressed in SVG user units, via the same larger-side
    // scaling buildPlan applies (the fill runs stay inside the boundary
    // rings, so they never change the design's bounding box).
    const unitsPerMm = extent / options.targetWidthMm;
    // A stroke sews after its own element's fill so the border stays the
    // crisp top edge instead of being buried under the fill; the half-step
    // keeps it ahead of the next element. Strokes wide enough to read as
    // borders or lettering (the satin range at output size) sew as satin
    // columns: a center running stitch to anchor the fabric, then the
    // zigzag over it. Everything else stays a running line.
    polylines = [];
    for (const s of geometry.strokes) {
      const order = (s.order ?? 0) + 0.5;
      const widthMm = (s.strokeWidth ?? 0) / unitsPerMm;
      let zigzag: typeof s.points = [];
      if (
        satinStrokes &&
        widthMm >= SATIN_MIN_WIDTH_MM &&
        widthMm <= SATIN_MAX_WIDTH_MM
      ) {
        zigzag = satinZigzag(s.points, {
          width: s.strokeWidth!,
          density: satinDensityMm * unitsPerMm,
        });
      }
      if (zigzag.length > 1) {
        polylines.push({
          color: s.color,
          points: s.points,
          order,
          underlay: true,
        });
        polylines.push({ color: s.color, points: zigzag, order, satin: true });
      } else {
        polylines.push({ ...s, order });
      }
    }
    for (const region of geometry.fills) {
      // Only validated rings hatch or outline: a region whose every ring is
      // degenerate (zero area) stitches nothing in fill mode.
      const rings = closeRings(region.rings);
      if (rings.length === 0) continue;
      if (fillUnderlay) {
        for (const run of hatchFill(rings, {
          angleDeg: fillAngleDeg + 90,
          spacing: UNDERLAY_SPACING_MM * unitsPerMm,
          stitchLength: options.stitchLengthMm * unitsPerMm,
        })) {
          polylines.push({
            color: region.color,
            points: run,
            order: region.order,
            underlay: true,
          });
        }
      }
      for (const run of hatchFill(rings, {
        angleDeg: fillAngleDeg,
        spacing: fillSpacingMm * unitsPerMm,
        stitchLength: options.stitchLengthMm * unitsPerMm,
      })) {
        polylines.push({
          color: region.color,
          points: run,
          order: region.order,
        });
      }
      // Edge run last so it crisps the fill's boundary on top.
      for (const ring of rings) {
        polylines.push({
          color: region.color,
          points: ring,
          order: region.order,
        });
      }
    }
    polylines.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const plan = buildPlan(groupByColor(polylines), options);
  return {
    plan,
    dst: encodeDst(plan, options.designName ?? "DESIGN"),
    exp: encodeExp(plan),
  };
}

function measure(geometry: ExtractedGeometry): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const scan = (points: { x: number; y: number }[]) => {
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  };
  for (const { points } of geometry.strokes) scan(points);
  for (const { rings } of geometry.fills) for (const ring of rings) scan(ring);
  const span = Math.max(maxX - minX, maxY - minY);
  if (!Number.isFinite(span) || span <= 0) {
    throw new Error("no stitchable geometry found in the SVG");
  }
  return span;
}
