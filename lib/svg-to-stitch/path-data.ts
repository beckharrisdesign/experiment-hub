// Parses an SVG path `d` attribute into flat polylines (one per subpath).
// Curves are adaptively subdivided; arcs are converted to cubics first, so a
// single flattening tolerance governs everything downstream.

export interface Point {
  x: number;
  y: number;
}

const COMMAND_RE =
  /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)/g;

interface Token {
  cmd?: string;
  // Numbers keep their raw text: arc flags may be packed against the next
  // value ("A 5 5 0 0110 0" means flags 0,1 then x=10), so the parser must be
  // able to split a numeric token after the fact.
  raw?: string;
}

function tokenize(d: string): Token[] {
  const tokens: Token[] = [];
  for (const match of d.matchAll(COMMAND_RE)) {
    if (match[1]) tokens.push({ cmd: match[1] });
    else tokens.push({ raw: match[2]! });
  }
  return tokens;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Distance from p to the segment a–b; the flatness measure for subdivision.
function deviation(p: Point, a: Point, b: Point): number {
  const len = dist(a, b);
  if (len < 1e-12) return dist(p, a);
  const t =
    ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len);
  const clamped = Math.max(0, Math.min(1, t));
  return dist(p, {
    x: a.x + clamped * (b.x - a.x),
    y: a.y + clamped * (b.y - a.y),
  });
}

function subdivideCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number,
  depth: number,
  out: Point[],
): void {
  if (
    depth > 18 ||
    (deviation(p1, p0, p3) <= tolerance && deviation(p2, p0, p3) <= tolerance)
  ) {
    out.push(p3);
    return;
  }
  const mid = (a: Point, b: Point): Point => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  const p01 = mid(p0, p1);
  const p12 = mid(p1, p2);
  const p23 = mid(p2, p3);
  const p012 = mid(p01, p12);
  const p123 = mid(p12, p23);
  const center = mid(p012, p123);
  subdivideCubic(p0, p01, p012, center, tolerance, depth + 1, out);
  subdivideCubic(center, p123, p23, p3, tolerance, depth + 1, out);
}

// Endpoint-parameterized arc → cubic segments (SVG implementation notes, F.6).
function arcToCubics(
  from: Point,
  rx: number,
  ry: number,
  rotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  to: Point,
): Array<[Point, Point, Point]> {
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (rx < 1e-12 || ry < 1e-12 || (from.x === to.x && from.y === to.y)) {
    return [[from, to, to]];
  }
  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx2 = (from.x - to.x) / 2;
  const dy2 = (from.y - to.y) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }

  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef =
    (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);
  const cx = cosPhi * cxp - sinPhi * cyp + (from.x + to.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (from.y + to.y) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number): number => {
    const sign = ux * vy - uy * vx < 0 ? -1 : 1;
    const d = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    return sign * Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / d)));
  };
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;

  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  const step = delta / segments;
  const result: Array<[Point, Point, Point]> = [];
  const pointAt = (t: number): Point => ({
    x: cx + rx * Math.cos(t) * cosPhi - ry * Math.sin(t) * sinPhi,
    y: cy + rx * Math.cos(t) * sinPhi + ry * Math.sin(t) * cosPhi,
  });
  const derivativeAt = (t: number): Point => ({
    x: -rx * Math.sin(t) * cosPhi - ry * Math.cos(t) * sinPhi,
    y: -rx * Math.sin(t) * sinPhi + ry * Math.cos(t) * cosPhi,
  });

  let t = theta1;
  let start = pointAt(t);
  for (let i = 0; i < segments; i++) {
    const tEnd = t + step;
    const end = pointAt(tEnd);
    const alpha = (4 / 3) * Math.tan(step / 4);
    const d1 = derivativeAt(t);
    const d2 = derivativeAt(tEnd);
    result.push([
      { x: start.x + alpha * d1.x, y: start.y + alpha * d1.y },
      { x: end.x - alpha * d2.x, y: end.y - alpha * d2.y },
      end,
    ]);
    t = tEnd;
    start = end;
  }
  return result;
}

/**
 * Flatten a path `d` string into polylines, one per subpath.
 * Closed subpaths repeat their first point at the end.
 */
export function parsePathData(d: string, tolerance: number): Point[][] {
  const tokens = tokenize(d);
  const subpaths: Point[][] = [];
  let current: Point[] = [];
  let pos: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let prevCubicCtrl: Point | null = null;
  let prevQuadCtrl: Point | null = null;
  let i = 0;
  let cmd = "";

  const read = (): number => {
    const t = tokens[i++];
    if (!t || t.raw === undefined)
      throw new Error(`malformed path data near token ${i}`);
    return parseFloat(t.raw);
  };
  // Arc flags are single characters 0/1 and may be packed against the value
  // that follows ("0110" = flags 0,1 then 10): consume one char, and leave any
  // remainder in place as the next numeric token.
  const flag = (): boolean => {
    const t = tokens[i];
    if (!t || t.raw === undefined)
      throw new Error(`malformed path data near token ${i}`);
    const ch = t.raw[0];
    if (ch !== "0" && ch !== "1") throw new Error(`invalid arc flag: ${t.raw}`);
    if (t.raw.length > 1) tokens[i] = { raw: t.raw.slice(1) };
    else i++;
    return ch === "1";
  };

  const beginSubpath = (p: Point) => {
    if (current.length > 1) subpaths.push(current);
    current = [p];
    start = p;
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (t?.cmd) {
      cmd = t.cmd;
      i++;
    } else if (!cmd) {
      throw new Error("path data must start with a command");
    } else if (cmd === "M") {
      cmd = "L"; // implicit lineto after moveto
    } else if (cmd === "m") {
      cmd = "l";
    }

    const rel = cmd === cmd.toLowerCase();
    const base = rel ? pos : { x: 0, y: 0 };
    const upper = cmd.toUpperCase();

    if (upper !== "C" && upper !== "S") prevCubicCtrl = null;
    if (upper !== "Q" && upper !== "T") prevQuadCtrl = null;

    switch (upper) {
      case "M": {
        pos = { x: base.x + read(), y: base.y + read() };
        beginSubpath(pos);
        break;
      }
      case "L": {
        pos = { x: base.x + read(), y: base.y + read() };
        current.push(pos);
        break;
      }
      case "H": {
        pos = { x: base.x + read(), y: pos.y };
        current.push(pos);
        break;
      }
      case "V": {
        pos = { x: pos.x, y: (rel ? pos.y : 0) + read() };
        current.push(pos);
        break;
      }
      case "C": {
        const c1 = { x: base.x + read(), y: base.y + read() };
        const c2 = { x: base.x + read(), y: base.y + read() };
        const end = { x: base.x + read(), y: base.y + read() };
        subdivideCubic(pos, c1, c2, end, tolerance, 0, current);
        prevCubicCtrl = c2;
        pos = end;
        break;
      }
      case "S": {
        const c1 = prevCubicCtrl
          ? { x: 2 * pos.x - prevCubicCtrl.x, y: 2 * pos.y - prevCubicCtrl.y }
          : pos;
        const c2 = { x: base.x + read(), y: base.y + read() };
        const end = { x: base.x + read(), y: base.y + read() };
        subdivideCubic(pos, c1, c2, end, tolerance, 0, current);
        prevCubicCtrl = c2;
        pos = end;
        break;
      }
      case "Q": {
        const q = { x: base.x + read(), y: base.y + read() };
        const end = { x: base.x + read(), y: base.y + read() };
        // Elevate quadratic to cubic.
        const c1 = {
          x: pos.x + (2 / 3) * (q.x - pos.x),
          y: pos.y + (2 / 3) * (q.y - pos.y),
        };
        const c2 = {
          x: end.x + (2 / 3) * (q.x - end.x),
          y: end.y + (2 / 3) * (q.y - end.y),
        };
        subdivideCubic(pos, c1, c2, end, tolerance, 0, current);
        prevQuadCtrl = q;
        pos = end;
        break;
      }
      case "T": {
        const q: Point = prevQuadCtrl
          ? { x: 2 * pos.x - prevQuadCtrl.x, y: 2 * pos.y - prevQuadCtrl.y }
          : pos;
        const end = { x: base.x + read(), y: base.y + read() };
        const c1 = {
          x: pos.x + (2 / 3) * (q.x - pos.x),
          y: pos.y + (2 / 3) * (q.y - pos.y),
        };
        const c2 = {
          x: end.x + (2 / 3) * (q.x - end.x),
          y: end.y + (2 / 3) * (q.y - end.y),
        };
        subdivideCubic(pos, c1, c2, end, tolerance, 0, current);
        prevQuadCtrl = q;
        pos = end;
        break;
      }
      case "A": {
        const rx = read();
        const ry = read();
        const rot = read();
        const large = flag();
        const sweep = flag();
        const end = { x: base.x + read(), y: base.y + read() };
        for (const [c1, c2, segEnd] of arcToCubics(
          pos,
          rx,
          ry,
          rot,
          large,
          sweep,
          end,
        )) {
          subdivideCubic(pos, c1, c2, segEnd, tolerance, 0, current);
          pos = segEnd;
        }
        pos = end;
        break;
      }
      case "Z": {
        if (current.length > 0 && dist(pos, start) > 1e-9) current.push(start);
        pos = start;
        if (current.length > 1) subpaths.push(current);
        current = [start];
        break;
      }
      default:
        throw new Error(`unsupported path command: ${cmd}`);
    }
  }

  if (current.length > 1) subpaths.push(current);
  return subpaths;
}
