import type { Gray } from "./types";

export const SCREENS = ["dot", "line", "cross"] as const;
export type Screen = (typeof SCREENS)[number];
export const DOT_SHAPES = ["round", "square", "ellipse", "diamond"] as const;
export type DotShape = (typeof DOT_SHAPES)[number];

export type HalftoneOptions = {
  screen: Screen;
  /** Screen angle in degrees. 45° is the classic single-colour angle. */
  angle: number;
  /** Lines per inch: screen frequency. */
  lpi: number;
  /** Output resolution. One cell is dpi / lpi pixels across. */
  dpi: number;
  /** Only used by the dot screen. */
  dotShape: DotShape;
};

/**
 * Spot functions on cell coordinates u, v ∈ [-1, 1). Lower values ink first, so ink grows
 * outward from the low point as the tone darkens: from the cell centre for dots, the centre
 * line for lines, both centre lines for crosses.
 */
function spot(screen: Screen, shape: DotShape, u: number, v: number): number {
  if (screen === "line") return Math.abs(v);
  if (screen === "cross") return Math.min(Math.abs(u), Math.abs(v));
  switch (shape) {
    case "square": return Math.max(Math.abs(u), Math.abs(v));
    case "diamond": return Math.abs(u) + Math.abs(v);
    case "ellipse": return u * u + 2.2 * v * v;
    default: return u * u + v * v;
  }
}

const RANK_SAMPLES = 96;
const rankTables = new Map<string, Float64Array>();

/**
 * Sorted spot values over a finely sampled cell. A pixel's rank in this table is the share
 * of the cell that inks before it, so "ink when rank < darkness" makes coverage track tone
 * linearly for any spot shape. A raw spot threshold would not: a round dot's area grows
 * with the square of its radius.
 */
function rankTable(screen: Screen, shape: DotShape): Float64Array {
  const key = screen === "dot" ? `dot:${shape}` : screen;
  let t = rankTables.get(key);
  if (!t) {
    t = new Float64Array(RANK_SAMPLES * RANK_SAMPLES);
    let i = 0;
    for (let y = 0; y < RANK_SAMPLES; y++) {
      for (let x = 0; x < RANK_SAMPLES; x++) {
        const u = ((x + 0.5) / RANK_SAMPLES) * 2 - 1;
        const v = ((y + 0.5) / RANK_SAMPLES) * 2 - 1;
        t[i++] = spot(screen, shape, u, v);
      }
    }
    t.sort();
    rankTables.set(key, t);
  }
  return t;
}

/** Fraction of the table strictly below s, plus half the ties (keeps plateaus fair). */
function rankOf(table: Float64Array, s: number): number {
  let lo = 0, hi = table.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (table[m] < s) lo = m + 1; else hi = m; }
  let tieEnd = lo;
  while (tieEnd < table.length && table[tieEnd] === s) tieEnd++;
  return (lo + (tieEnd - lo) / 2) / table.length;
}

/** Amplitude-modulated screen. Ink is 0 (burn / print), paper is 255. */
export function halftone(g: Gray, o: HalftoneOptions): Gray {
  const { width: w, height: h } = g;
  const period = o.dpi / o.lpi;
  const rad = (o.angle * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const table = rankTable(o.screen, o.dotShape);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const py = y + 0.5;
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      // Rotate into screen space, then fold into one cell.
      const xr = (px * cos + py * sin) / period;
      const yr = (-px * sin + py * cos) / period;
      const u = (xr - Math.floor(xr)) * 2 - 1;
      const v = (yr - Math.floor(yr)) * 2 - 1;
      const i = y * w + x;
      const darkness = 1 - g.data[i] / 255;
      out[i] = rankOf(table, spot(o.screen, o.dotShape, u, v)) < darkness ? 0 : 255;
    }
  }
  return { width: w, height: h, data: out };
}
