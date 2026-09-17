// Walks a parsed SVG document and extracts stitchable geometry: every path
// and basic shape flattened to polylines in user units, with ancestor
// transforms applied and a resolved color per element. Runs against the real
// DOM in the browser and jsdom in tests — no server-only dependencies.

import { parseColor } from "./color";
import { parsePathData, type Point } from "./path-data";

export type { Point };

/**
 * A stitch directive declared in the design file via an `st-` layer-name
 * tag (see experiments/svg-to-stitch/docs/stitch-authoring.md). Figma
 * exports layer names as `id` attributes when "Include ID" is on,
 * sanitizing spaces to underscores — tags parse either spelling.
 */
export interface StitchDirective {
  type: "run" | "satin" | "tatami" | "skip" | "brush";
  /** Explicit satin width, mm (w20 = 2.0 mm). */
  widthMm?: number;
  /** Tatami angle, degrees (a30). */
  angleDeg?: number;
  /** Row/thread pitch, mm (d4 = 0.4 mm). */
  densityMm?: number;
  /**
   * Brush name from an `st-brush-<name>` tag. The parser records any name;
   * the converter validates it against the library and errors loudly for
   * unknown brushes — never a silent fallback.
   */
  brushName?: string;
  /** Brush motif pitch, mm (p25 = 2.5 mm). */
  pitchMm?: number;
  /** The source layer name, for loud error messages. */
  label: string;
}

const DIRECTIVE_RE = /^st-(run|satin|tatami|skip)$/;
const BRUSH_RE = /^st-brush-([a-z][a-z0-9-]*)$/;

/** Parse an element's own stitch directive from its id, if any. */
function ownDirective(el: Element): StitchDirective | null {
  const id = el.getAttribute("id");
  if (!id || !id.includes("st-")) return null;
  const tokens = id.split(/[\s_]+/);
  let type: StitchDirective["type"] | null = null;
  let brushName: string | undefined;
  for (const token of tokens) {
    const m = DIRECTIVE_RE.exec(token);
    if (m) {
      type = m[1] as StitchDirective["type"];
      brushName = undefined;
    }
    const b = BRUSH_RE.exec(token);
    if (b) {
      type = "brush";
      brushName = b[1];
    }
  }
  if (!type) return null;
  const directive: StitchDirective = { type, label: id.replace(/_/g, " ") };
  if (brushName !== undefined) directive.brushName = brushName;
  for (const token of tokens) {
    let m;
    if ((m = /^w(\d+)$/.exec(token))) directive.widthMm = Number(m[1]) / 10;
    else if ((m = /^a(\d+)$/.exec(token))) directive.angleDeg = Number(m[1]);
    else if ((m = /^d(\d+)$/.exec(token)))
      directive.densityMm = Number(m[1]) / 10;
    else if ((m = /^p(\d+)$/.exec(token)))
      directive.pitchMm = Number(m[1]) / 10;
  }
  return directive;
}

export interface ColoredPolyline {
  color: string; // normalized #rrggbb
  points: Point[];
  /** Document-order index of the source element (set by extractGeometry). */
  order?: number;
  /** True for fill-underlay runs — sewn beneath the visible top stitching. */
  underlay?: boolean;
  /**
   * Rendered stroke width in user units (transform-scaled), set on stroke
   * outlines — it decides whether the stroke sews as satin or running stitch.
   */
  strokeWidth?: number;
  /**
   * True when `points` are exact needle penetrations (a satin zigzag) that
   * the plan must sew verbatim instead of resampling to stitch length.
   */
  satin?: boolean;
  /**
   * Set when `points` are a brush run's exact penetrations — same
   * verbatim-sewing contract as `satin`, but counted separately so the
   * Brush runs readout never inflates Satin sections. Carries the library
   * brush name for the per-color sew-order composition.
   */
  brush?: string;
  /** Stitch directive declared in the file (own or inherited). */
  directive?: StitchDirective;
}

/**
 * One element's filled region: every subpath ring, transformed, sharing one
 * fill color. Kept together so the even-odd rule can carve holes (a letter
 * O's inner ring) out of the hatch instead of filling them.
 */
export interface FillRegion {
  color: string; // normalized #rrggbb
  rings: Point[][];
  /** Document-order index of the source element. */
  order: number;
  /** True when the same element also stitches a stroke outline. */
  hasStroke: boolean;
  /** Stitch directive declared in the file (own or inherited). */
  directive?: StitchDirective;
}

export interface ExtractedGeometry {
  strokes: ColoredPolyline[];
  fills: FillRegion[];
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
// child sets only a fill. stroke-width inherits the same way.
interface InheritedPaint {
  stroke: string | null; // "#rrggbb" | "none" | null (unset)
  fill: string | null;
  strokeWidth: number | null; // pre-transform user units; null = unset
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

// stroke-width is a CSS length: a bare number is user units, and absolute
// units convert at CSS's 96px-per-inch. Percentages, font-relative units,
// and malformed values act as unset and inherit — never as a misread number
// that could flip a stroke across the satin threshold.
const STROKE_WIDTH_RE =
  /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(px|mm|cm|in|pt|pc)?$/i;
const UNIT_TO_USER: Record<string, number> = {
  px: 1,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
  pt: 96 / 72,
  pc: 16,
};

function ownStrokeWidth(el: Element): number | null {
  const raw = styleProperty(el, "stroke-width");
  if (raw === null) return null;
  const match = raw.trim().match(STROKE_WIDTH_RE);
  if (!match) return null;
  const value =
    parseFloat(match[1]) *
    (match[2] ? UNIT_TO_USER[match[2].toLowerCase()] : 1);
  return value >= 0 ? value : null;
}

function inheritPaint(el: Element, inherited: InheritedPaint): InheritedPaint {
  return {
    stroke: ownPaint(el, "stroke") ?? inherited.stroke,
    fill: ownPaint(el, "fill") ?? inherited.fill,
    strokeWidth: ownStrokeWidth(el) ?? inherited.strokeWidth,
  };
}

// Average scale factor of an affine matrix (sqrt of the area scale) — how a
// transform changes a stroke's rendered width. Exact for uniform scale and
// rotation; splits the difference on non-uniform scale, where SVG stroke
// rendering itself has no single width either.
function matrixScale(m: Matrix): number {
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
}

// Resolved paints following SVG defaults: stroke defaults to none, fill
// defaults to black. A painted stroke stitches as an outline run; a painted
// fill stitches as a filled region (or, in outline mode, its boundary).
function resolvedPaints(paint: InheritedPaint): {
  stroke: string | null;
  fill: string | null;
} {
  return {
    stroke:
      paint.stroke !== null && paint.stroke !== "none" ? paint.stroke : null,
    fill: paint.fill === "none" ? null : (paint.fill ?? "#000000"),
  };
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

// Reference-resolution context for <use>: the document's id map, plus a
// stack guarding against reference cycles (a use inside the subtree it
// references would otherwise recurse forever).
interface WalkContext {
  byId: Map<string, Element>;
  useStack: Set<Element>;
}

const MAX_USE_DEPTH = 24;

function walk(
  el: Element,
  matrix: Matrix,
  inherited: InheritedPaint,
  tolerance: number,
  out: ExtractedGeometry,
  ctx: WalkContext,
  inheritedDirective: StitchDirective | null = null,
): void {
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return;
  if (isHidden(el)) return;

  const m = multiply(matrix, parseTransform(el.getAttribute("transform")));
  const paint = inheritPaint(el, inherited);
  const directive = ownDirective(el) ?? inheritedDirective;
  // st-skip prunes the whole subtree — guides and annotations don't sew.
  if (directive?.type === "skip") return;

  if (tag === "use") {
    // Figma dedupes repeated artwork (component instances, "-Nup" repeats)
    // into <defs> + <use> — without resolving these, such an export parses
    // to zero geometry. The referenced element renders as if pasted here,
    // translated by the use's x/y, inheriting this paint context.
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
    if (!href || !href.startsWith("#")) return;
    const target = ctx.byId.get(href.slice(1));
    if (
      !target ||
      ctx.useStack.has(target) ||
      ctx.useStack.size >= MAX_USE_DEPTH
    ) {
      return;
    }
    const placed = multiply(m, [1, 0, 0, 1, num(el, "x"), num(el, "y")]);
    ctx.useStack.add(target);
    const targetTag = target.tagName.toLowerCase();
    if (targetTag === "symbol" || targetTag === "svg") {
      // A symbol renders its children (the symbol wrapper itself is never
      // rendered directly; its viewBox fitting is not modeled here).
      const tm = multiply(
        placed,
        parseTransform(target.getAttribute("transform")),
      );
      const tp = inheritPaint(target, paint);
      for (const child of Array.from(target.children)) {
        walk(child, tm, tp, tolerance, out, ctx, directive);
      }
    } else {
      walk(target, placed, paint, tolerance, out, ctx, directive);
    }
    ctx.useStack.delete(target);
    return;
  }

  if (SHAPE_TAGS.has(tag)) {
    const { stroke, fill } = resolvedPaints(paint);
    // SVG's initial stroke-width is 1 user unit; the transform scales it
    // like any other geometry. Width 0 paints nothing per the spec, so the
    // stroke drops out entirely instead of stitching a phantom line.
    const strokeWidth = (paint.strokeWidth ?? 1) * matrixScale(m);
    const strokeVisible = stroke !== null && strokeWidth > 0;
    if (!strokeVisible && fill === null) return; // nothing visible to stitch
    const order = out.strokes.length + out.fills.length;
    const polylines = shapePolylines(el, tolerance).map((polyline) =>
      polyline.map((p) => apply(m, p)),
    );
    if (strokeVisible) {
      for (const points of polylines) {
        if (points.length > 1) {
          out.strokes.push({
            color: stroke!,
            points,
            order,
            strokeWidth,
            directive: directive ?? undefined,
          });
        }
      }
    }
    if (fill !== null) {
      // Every subpath goes in as a ring, degenerate ones included (a bare
      // 2-point path, a `line` with only a fill). Fill mode validates rings
      // and drops zero-area geometry there; the legacy outline view keeps
      // stitching these as it always did.
      const rings = polylines.filter((points) => points.length > 1);
      if (rings.length > 0) {
        out.fills.push({
          color: fill,
          rings,
          order,
          hasStroke: strokeVisible,
          directive: directive ?? undefined,
        });
      }
    }
    return;
  }

  for (const child of Array.from(el.children)) {
    walk(child, m, paint, tolerance, out, ctx, directive);
  }
}

/**
 * Extract stitchable geometry (in SVG user units, y-down) from an SVG
 * document: stroked outlines and filled regions, separately. `tolerance` is
 * the max flattening deviation in user units. The root <svg>'s own
 * transform, stroke, and fill participate like any other ancestor's.
 */
export function extractGeometry(
  doc: Document,
  tolerance: number,
): ExtractedGeometry {
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") {
    throw new Error("not an SVG document");
  }
  const out: ExtractedGeometry = { strokes: [], fills: [] };
  const rootMatrix = parseTransform(root.getAttribute("transform"));
  const rootPaint = inheritPaint(root, {
    stroke: null,
    fill: null,
    strokeWidth: null,
  });
  // Id map for <use> resolution — built over the whole document so
  // referenced artwork parked inside <defs>/<symbol> is reachable.
  const byId = new Map<string, Element>();
  for (const el of Array.from(doc.querySelectorAll("[id]"))) {
    const id = el.getAttribute("id");
    if (id && !byId.has(id)) byId.set(id, el);
  }
  const ctx: WalkContext = { byId, useStack: new Set() };
  for (const child of Array.from(root.children)) {
    walk(child, rootMatrix, rootPaint, tolerance, out, ctx);
  }
  return out;
}

/**
 * Legacy view of the geometry: every filled region flattened to its boundary
 * outline (the converter's original outline-only behavior). Fill regions on
 * elements that also carry a stroke are dropped here, matching the old
 * stroke-over-fill precedence.
 */
export function extractPolylines(
  doc: Document,
  tolerance: number,
): ColoredPolyline[] {
  const { strokes, fills } = extractGeometry(doc, tolerance);
  const out: ColoredPolyline[] = [...strokes];
  for (const fill of fills) {
    if (fill.hasStroke) continue; // old behavior: stroke wins outright
    for (const points of fill.rings) {
      out.push({ color: fill.color, points, order: fill.order });
    }
  }
  return out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ---------------------------------------------------------------------------
// Declared physical size
//
// Size is its own channel, not a StitchDirective type: it describes the
// document, not how a shape sews, so it must not enter the stitch cascade
// where it could shadow a shape's own tag. It resolves **outermost-first** —
// the outer element is the containing block, per the CSS model the tag
// vocabulary follows.
// ---------------------------------------------------------------------------

/** A size declared in the design file, with the box it was declared on. */
export interface DeclaredSize {
  /** Physical width of the tagged element's box, in mm. */
  widthMm: number;
  /** The system it was written in, so the readout can speak it back. */
  unit: "mm" | "in";
  /** The tagged element's box in user units — the design's extent. */
  box: { minX: number; minY: number; maxX: number; maxY: number };
  /** Source layer name, for error messages. */
  label: string;
}

const SIZE_RE = /^st-size$/;
const MM_PARAM_RE = /^w(\d+)$/;
const IN_PARAM_RE = /^in(\d+)$/;

/** Parse an `st-size` declaration off an element's id, if it carries one. */
function ownSize(el: Element): { widthMm: number; unit: "mm" | "in"; label: string } | null {
  const id = el.getAttribute("id");
  if (!id || !id.includes("st-size")) return null;
  const tokens = id.split(/[\s_]+/);
  if (!tokens.some((t) => SIZE_RE.test(t))) return null;
  const label = id.replace(/_/g, " ");
  let mm: number | null = null;
  let inches: number | null = null;
  for (const token of tokens) {
    const m = MM_PARAM_RE.exec(token);
    if (m) mm = Number(m[1]) / 10;
    const i = IN_PARAM_RE.exec(token);
    if (i) inches = (Number(i[1]) / 100) * 25.4;
  }
  if (mm !== null && inches !== null) {
    throw new Error(
      `"${label}" declares both a metric and an imperial size — use one of w (mm ×10) or in (inches ×100), not both.`,
    );
  }
  if (mm !== null) return { widthMm: mm, unit: "mm", label };
  if (inches !== null) return { widthMm: inches, unit: "in", label };
  throw new Error(
    `"${label}" is tagged st-size but declares no width — add w<n> for millimetres ×10 (w635 = 63.5 mm) or in<n> for inches ×100 (in350 = 3.5 in).`,
  );
}

/** A CSS length in user units, honouring physical units. Null when unusable. */
function lengthToUser(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.trim().match(STROKE_WIDTH_RE);
  if (!m) return null;
  const value = parseFloat(m[1]) * (m[2] ? UNIT_TO_USER[m[2].toLowerCase()] : 1);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Physical width in mm from a root `width` carrying a real unit, if any. */
function rootPhysicalWidthMm(root: Element): { widthMm: number; unit: "mm" | "in" } | null {
  const raw = root.getAttribute("width");
  if (!raw) return null;
  const m = raw.trim().match(STROKE_WIDTH_RE);
  if (!m || !m[2]) return null; // bare numbers are user units, not a declaration
  const unit = m[2].toLowerCase();
  const inUser = parseFloat(m[1]) * UNIT_TO_USER[unit];
  return { widthMm: (inUser / UNIT_TO_USER.mm) * 1, unit: unit === "in" ? "in" : "mm" };
}

/** The box of an element, in user units, or null when it has none to read. */
function elementBox(
  el: Element,
  matrix: Matrix,
  byId: Map<string, Element>,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const tag = el.tagName.toLowerCase();
  if (tag === "svg") {
    const viewBox = el.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        return { minX: parts[0], minY: parts[1], maxX: parts[0] + parts[2], maxY: parts[1] + parts[3] };
      }
    }
    const w = lengthToUser(el.getAttribute("width"));
    const h = lengthToUser(el.getAttribute("height"));
    if (w && h) return { minX: 0, minY: 0, maxX: w, maxY: h };
    return null;
  }
  // A frame that clips its contents carries its box as a clipPath rect —
  // the only place a group's own size survives a Figma export.
  const clip = el.getAttribute("clip-path");
  const ref = clip && /^url\(#(.+)\)$/.exec(clip.trim());
  if (ref) {
    const clipEl = byId.get(ref[1]);
    const rect = clipEl && clipEl.querySelector("rect");
    if (rect) {
      const x = Number(rect.getAttribute("x") ?? 0);
      const y = Number(rect.getAttribute("y") ?? 0);
      const w = Number(rect.getAttribute("width"));
      const h = Number(rect.getAttribute("height"));
      if ([x, y, w, h].every((n) => Number.isFinite(n)) && w > 0 && h > 0) {
        const corners: Point[] = [
          apply(matrix, { x, y }),
          apply(matrix, { x: x + w, y }),
          apply(matrix, { x, y: y + h }),
          apply(matrix, { x: x + w, y: y + h }),
        ];
        return {
          minX: Math.min(...corners.map((p) => p.x)),
          minY: Math.min(...corners.map((p) => p.y)),
          maxX: Math.max(...corners.map((p) => p.x)),
          maxY: Math.max(...corners.map((p) => p.y)),
        };
      }
    }
  }
  return null;
}

/**
 * Find the document's declared size: the outermost `st-size` tag, or a root
 * carrying real physical units. Returns null when nothing is declared.
 */
export function findDeclaredSize(doc: Document): DeclaredSize | null {
  const root = doc.documentElement;
  if (!root) return null;
  const byId = new Map<string, Element>();
  for (const el of Array.from(doc.querySelectorAll("[id]"))) {
    const id = el.getAttribute("id");
    if (id && !byId.has(id)) byId.set(id, el);
  }

  let found: DeclaredSize | null = null;
  const visit = (el: Element, matrix: Matrix) => {
    if (found) return; // outermost wins — stop at the first one down any path
    const m = multiply(matrix, parseTransform(el.getAttribute("transform")));
    const declared = ownSize(el);
    if (declared) {
      const box = elementBox(el, m, byId);
      if (!box) {
        throw new Error(
          `"${declared.label}" declares a size, but its box cannot be read. A group only carries one when it clips its contents — turn on clip content, or move the tag to the frame that does.`,
        );
      }
      found = { ...declared, box };
      return;
    }
    for (const child of Array.from(el.children)) visit(child, m);
  };
  visit(root, IDENTITY);

  if (found) return found;

  // No tag: honour real physical units on the root, which SVG supports
  // natively even though design tools rarely emit them.
  const physical = rootPhysicalWidthMm(root);
  if (physical) {
    const box = elementBox(root, IDENTITY, byId);
    if (box) return { ...physical, box, label: "svg root" };
  }
  return null;
}
