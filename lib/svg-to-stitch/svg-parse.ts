// Walks a parsed SVG document and extracts stitchable geometry: every path
// and basic shape flattened to polylines in user units, with ancestor
// transforms applied and a resolved color per element. Runs against the real
// DOM in the browser and jsdom in tests — no server-only dependencies.

import { parseColor } from "./color";
import { parsePathData, type Point } from "./path-data";

export type { Point };

export interface ColoredPolyline {
  color: string; // normalized #rrggbb
  points: Point[];
}

// Row-major 2x3 affine matrix [a c e; b d f], matching SVG's matrix(a b c d e f).
type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function apply(m: Matrix, p: Point): Point {
  return {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
}

const TRANSFORM_RE =
  /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;

export function parseTransform(value: string | null): Matrix {
  if (!value) return IDENTITY;
  let m = IDENTITY;
  for (const match of value.matchAll(TRANSFORM_RE)) {
    const fn = match[1];
    const args = match[2]
      .split(/[\s,]+/)
      .filter((s) => s.length > 0)
      .map(Number);
    let t: Matrix = IDENTITY;
    switch (fn) {
      case "matrix":
        if (args.length === 6) t = args as Matrix;
        break;
      case "translate":
        t = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
        break;
      case "scale":
        t = [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const a = ((args[0] ?? 0) * Math.PI) / 180;
        const rot: Matrix = [
          Math.cos(a),
          Math.sin(a),
          -Math.sin(a),
          Math.cos(a),
          0,
          0,
        ];
        if (args.length >= 3) {
          t = multiply(multiply([1, 0, 0, 1, args[1], args[2]], rot), [
            1,
            0,
            0,
            1,
            -args[1],
            -args[2],
          ]);
        } else {
          t = rot;
        }
        break;
      }
      case "skewX":
        t = [1, 0, Math.tan(((args[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case "skewY":
        t = [1, Math.tan(((args[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
    }
    m = multiply(m, t);
  }
  return m;
}

function styleProperty(el: Element, name: string): string | null {
  const style = el.getAttribute("style");
  if (style) {
    const match = style.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`));
    if (match) return match[1].trim();
  }
  return el.getAttribute(name);
}

// Stroke and fill inherit independently in SVG, so they are carried
// separately — collapsing them would lose an ancestor's stroke the moment a
// child sets only a fill.
interface InheritedPaint {
  stroke: string | null; // "#rrggbb" | "none" | null (unset)
  fill: string | null;
}

// An element's own stroke/fill, resolved to a flat color. url() paints
// (gradients, patterns) can't map to one thread color, so they fall back to
// black — documented behavior; other unresolvable values (currentColor, var())
// act as unset and inherit.
function ownPaint(el: Element, name: "stroke" | "fill"): string | null {
  const raw = styleProperty(el, name);
  if (raw === null) return null;
  if (raw.trim().toLowerCase().startsWith("url(")) return "#000000";
  return parseColor(raw);
}

function inheritPaint(el: Element, inherited: InheritedPaint): InheritedPaint {
  return {
    stroke: ownPaint(el, "stroke") ?? inherited.stroke,
    fill: ownPaint(el, "fill") ?? inherited.fill,
  };
}

// The one thread color a shape stitches in. Follows SVG paint defaults:
// stroke defaults to none, fill defaults to black — so stroke (when painted)
// wins, else fill, and only fill:none with no stroke means nothing to stitch.
function shapeColor(paint: InheritedPaint): string | null {
  const stroke =
    paint.stroke !== null && paint.stroke !== "none" ? paint.stroke : null;
  const fill = paint.fill === "none" ? null : (paint.fill ?? "#000000");
  return stroke ?? fill;
}

function isHidden(el: Element): boolean {
  if (styleProperty(el, "display") === "none") return true;
  const visibility = styleProperty(el, "visibility");
  if (visibility === "hidden" || visibility === "collapse") return true;
  const opacity = styleProperty(el, "opacity");
  return opacity !== null && parseFloat(opacity) === 0;
}

function parsePoints(value: string | null): Point[] {
  if (!value) return [];
  const nums = value
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number);
  const points: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: nums[i], y: nums[i + 1] });
  }
  return points;
}

function num(el: Element, name: string, fallback = 0): number {
  const value = el.getAttribute(name);
  const parsed = value === null ? NaN : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ellipsePolyline(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tolerance: number,
): Point[] {
  const radius = Math.max(rx, ry);
  if (radius <= 0) return [];
  // Chord error for n segments is r(1-cos(π/n)); solve for n at the tolerance.
  const n = Math.max(
    12,
    Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - tolerance / radius))),
  );
  const points: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    points.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return points;
}

function shapePolylines(el: Element, tolerance: number): Point[][] {
  switch (el.tagName.toLowerCase()) {
    case "path": {
      const d = el.getAttribute("d");
      return d ? parsePathData(d, tolerance) : [];
    }
    case "rect": {
      const x = num(el, "x");
      const y = num(el, "y");
      const w = num(el, "width");
      const h = num(el, "height");
      if (w <= 0 || h <= 0) return [];
      return [
        [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
          { x, y },
        ],
      ];
    }
    case "circle": {
      const r = num(el, "r");
      return r > 0
        ? [ellipsePolyline(num(el, "cx"), num(el, "cy"), r, r, tolerance)]
        : [];
    }
    case "ellipse": {
      const rx = num(el, "rx");
      const ry = num(el, "ry");
      return rx > 0 && ry > 0
        ? [ellipsePolyline(num(el, "cx"), num(el, "cy"), rx, ry, tolerance)]
        : [];
    }
    case "line":
      return [
        [
          { x: num(el, "x1"), y: num(el, "y1") },
          { x: num(el, "x2"), y: num(el, "y2") },
        ],
      ];
    case "polyline":
      return [parsePoints(el.getAttribute("points"))];
    case "polygon": {
      const points = parsePoints(el.getAttribute("points"));
      if (points.length > 1) points.push(points[0]);
      return [points];
    }
    default:
      return [];
  }
}

const SKIP_TAGS = new Set([
  "defs",
  "clippath",
  "mask",
  "symbol",
  "marker",
  "pattern",
  "metadata",
  "style",
  "title",
  "desc",
]);
const SHAPE_TAGS = new Set([
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
]);

function walk(
  el: Element,
  matrix: Matrix,
  inherited: InheritedPaint,
  tolerance: number,
  out: ColoredPolyline[],
): void {
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return;
  if (isHidden(el)) return;

  const m = multiply(matrix, parseTransform(el.getAttribute("transform")));
  const paint = inheritPaint(el, inherited);

  if (SHAPE_TAGS.has(tag)) {
    const color = shapeColor(paint);
    if (color === null) return; // fill:none + no stroke — nothing visible to stitch
    for (const polyline of shapePolylines(el, tolerance)) {
      const points = polyline.map((p) => apply(m, p));
      if (points.length > 1) out.push({ color, points });
    }
    return;
  }

  for (const child of Array.from(el.children)) {
    walk(child, m, paint, tolerance, out);
  }
}

/**
 * Extract colored polylines (in SVG user units, y-down) from an SVG document.
 * `tolerance` is the max flattening deviation in user units. The root <svg>'s
 * own transform, stroke, and fill participate like any other ancestor's.
 */
export function extractPolylines(
  doc: Document,
  tolerance: number,
): ColoredPolyline[] {
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") {
    throw new Error("not an SVG document");
  }
  const out: ColoredPolyline[] = [];
  const rootMatrix = parseTransform(root.getAttribute("transform"));
  const rootPaint = inheritPaint(root, { stroke: null, fill: null });
  for (const child of Array.from(root.children)) {
    walk(child, rootMatrix, rootPaint, tolerance, out);
  }
  return out;
}
