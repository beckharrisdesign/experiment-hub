import { dither, type Algorithm } from "./dither";
import type { Gray } from "./types";

export type Tone = { brightness: number; contrast: number; gamma: number };

export type Settings = Tone & {
  algorithm: Algorithm;
  serpentine: boolean;
  invert: boolean;
  /** Horizontal flip, applied to the 1-bit output (review queue #7). */
  mirror: boolean;
  /** Target size in pixels. 0 keeps the source size on that axis. */
  widthPx: number;
  heightPx: number;
};

export const DEFAULT_SETTINGS: Settings = {
  algorithm: "floyd-steinberg",
  serpentine: true,
  brightness: 0,
  contrast: 0,
  gamma: 1,
  invert: false,
  mirror: false,
  widthPx: 0,
  heightPx: 0,
};

/**
 * Pipeline: tone → invert → resample → dither → mirror.
 * Decoding and grayscale happen before this (`toGray`), so the worker can cache the gray
 * source and re-run only this part when a slider moves.
 */
export function processImage(src: Gray, s: Settings): Gray {
  let g = adjustTone(src, s);
  if (s.invert) g = invert(g);
  g = resample(g, s.widthPx || src.width, s.heightPx || src.height);
  g = dither(g, s.algorithm, { serpentine: s.serpentine });
  if (s.mirror) g = mirror(g);
  return g;
}

/** RGBA → luma (Rec. 601). Transparent pixels composite over white, i.e. "don't burn". */
export function toGray(rgba: Uint8ClampedArray, width: number, height: number): Gray {
  const data = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    const a = rgba[p + 3] / 255;
    const luma = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
    data[i] = Math.round(luma * a + 255 * (1 - a));
  }
  return { width, height, data };
}

/** Brightness −100…100, contrast −100…100, gamma > 0 (γ > 1 lifts mid-tones). */
export function adjustTone(g: Gray, t: Tone): Gray {
  if (t.brightness === 0 && t.contrast === 0 && t.gamma === 1) {
    return { width: g.width, height: g.height, data: g.data.slice() };
  }
  const c = t.contrast * 2.55;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    let x = v + t.brightness * 2.55;
    x = factor * (x - 128) + 128;
    x = Math.min(255, Math.max(0, x));
    lut[v] = Math.round(255 * Math.pow(x / 255, 1 / t.gamma));
  }
  const data = new Uint8ClampedArray(g.data.length);
  for (let i = 0; i < data.length; i++) data[i] = lut[g.data[i]];
  return { width: g.width, height: g.height, data };
}

export function invert(g: Gray): Gray {
  const data = new Uint8ClampedArray(g.data.length);
  for (let i = 0; i < data.length; i++) data[i] = 255 - g.data[i];
  return { width: g.width, height: g.height, data };
}

export function mirror(g: Gray): Gray {
  const { width: w, height: h } = g;
  const data = new Uint8ClampedArray(g.data.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) data[row + x] = g.data[row + (w - 1 - x)];
  }
  return { width: w, height: h, data };
}

/**
 * Separable resample: area-average when shrinking (no aliasing in previews),
 * linear when enlarging.
 */
export function resample(g: Gray, width: number, height: number): Gray {
  if (width === g.width && height === g.height) {
    return { width, height, data: g.data.slice() };
  }
  const src = Float32Array.from(g.data);
  const horiz = new Float32Array(width * g.height);
  for (let y = 0; y < g.height; y++) {
    resample1d(src, y * g.width, 1, g.width, horiz, y * width, 1, width);
  }
  const out = new Float32Array(width * height);
  for (let x = 0; x < width; x++) {
    resample1d(horiz, x, width, g.height, out, x, width, height);
  }
  const data = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i++) data[i] = Math.round(out[i]);
  return { width, height, data };
}

function resample1d(
  src: Float32Array, srcOff: number, srcStride: number, srcN: number,
  dst: Float32Array, dstOff: number, dstStride: number, dstN: number,
): void {
  const scale = srcN / dstN;
  if (scale >= 1) {
    for (let i = 0; i < dstN; i++) {
      const start = i * scale;
      const end = start + scale;
      let sum = 0;
      for (let j = Math.floor(start); j < end && j < srcN; j++) {
        const cover = Math.min(end, j + 1) - Math.max(start, j);
        sum += src[srcOff + j * srcStride] * cover;
      }
      dst[dstOff + i * dstStride] = sum / scale;
    }
    return;
  }
  for (let i = 0; i < dstN; i++) {
    const pos = Math.min(srcN - 1, Math.max(0, (i + 0.5) * scale - 0.5));
    const j = Math.floor(pos);
    const f = pos - j;
    const a = src[srcOff + j * srcStride];
    const b = src[srcOff + Math.min(srcN - 1, j + 1) * srcStride];
    dst[dstOff + i * dstStride] = a + (b - a) * f;
  }
}
