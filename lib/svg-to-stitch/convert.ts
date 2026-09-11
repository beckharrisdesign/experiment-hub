// Top-level conversion: SVG text in, stitch plan + encoded DST/EXP out.
// Pure TypeScript over the DOM's XML parser, so the whole pipeline runs
// client-side in the browser (and under jsdom in tests) — no server round
// trip, files never leave the machine.

import { extractPolylines } from "./svg-parse";
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
}

export interface ConvertResult {
  plan: StitchPlan;
  dst: Uint8Array;
  exp: Uint8Array;
}

export const DEFAULT_OPTIONS: ConvertOptions = {
  targetWidthMm: 100,
  stitchLengthMm: 2.5,
};

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

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("could not parse the file as SVG");
  }

  // Flattening tolerance: 0.05mm at the final output size, expressed in user
  // units. Two passes because the user-unit extent isn't known until after a
  // first parse; the initial coarse pass only measures.
  const coarse = extractPolylines(doc, 1);
  const extent = measure(coarse);
  const tolerance = (extent / (options.targetWidthMm * 10)) * 0.5;
  const polylines = extractPolylines(doc, Math.max(tolerance, 1e-6));

  const plan = buildPlan(groupByColor(polylines), options);
  return {
    plan,
    dst: encodeDst(plan, options.designName ?? "DESIGN"),
    exp: encodeExp(plan),
  };
}

function measure(polylines: ReturnType<typeof extractPolylines>): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { points } of polylines) {
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const span = Math.max(maxX - minX, maxY - minY);
  if (!Number.isFinite(span) || span <= 0) {
    throw new Error("no stitchable geometry found in the SVG");
  }
  return span;
}
