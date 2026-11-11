import { KERNELS, type DiffusionAlgorithm } from "./kernels";
import type { Gray } from "./types";

export const ERROR_DIFFUSION = Object.keys(KERNELS) as DiffusionAlgorithm[];
export const ALGORITHMS = [...ERROR_DIFFUSION, "bayer-4", "bayer-8", "threshold"] as const;
export type Algorithm = (typeof ALGORITHMS)[number];

/** Anything at or above this is white. Shared by threshold and error diffusion. */
export const THRESHOLD = 128;

export type DitherOptions = { serpentine?: boolean };

export function dither(g: Gray, algorithm: Algorithm, opts: DitherOptions = {}): Gray {
  if (algorithm === "threshold") return threshold(g);
  if (algorithm === "bayer-4") return ordered(g, 4);
  if (algorithm === "bayer-8") return ordered(g, 8);
  return diffuse(g, algorithm, opts.serpentine ?? true);
}

function threshold(g: Gray): Gray {
  const out = new Uint8ClampedArray(g.data.length);
  for (let i = 0; i < out.length; i++) out[i] = g.data[i] >= THRESHOLD ? 255 : 0;
  return { width: g.width, height: g.height, data: out };
}

function diffuse(g: Gray, algorithm: DiffusionAlgorithm, serpentine: boolean): Gray {
  const { width: w, height: h } = g;
  const kernel = KERNELS[algorithm];
  const n = kernel.taps.length;
  const dxs = new Int32Array(n);
  const dys = new Int32Array(n);
  const ws = new Float32Array(n);
  kernel.taps.forEach(([dx, dy, weight], k) => {
    dxs[k] = dx;
    dys[k] = dy;
    ws[k] = weight / kernel.divisor;
  });

  const buf = Float32Array.from(g.data);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const reverse = serpentine && y % 2 === 1;
    const dir = reverse ? -1 : 1;
    for (let step = 0; step < w; step++) {
      const x = reverse ? w - 1 - step : step;
      const i = y * w + x;
      const old = buf[i];
      const value = old >= THRESHOLD ? 255 : 0;
      out[i] = value;
      const err = old - value;
      if (err === 0) continue;
      for (let k = 0; k < n; k++) {
        const nx = x + dxs[k] * dir;
        const ny = y + dys[k];
        if (nx < 0 || nx >= w || ny >= h) continue;
        buf[ny * w + nx] += err * ws[k];
      }
    }
  }
  return { width: w, height: h, data: out };
}

/** Recursive Bayer index matrix, values 0 … size² − 1. */
export function bayerMatrix(size: 2 | 4 | 8): number[] {
  let m = [0];
  let n = 1;
  while (n < size) {
    const next = new Array<number>(4 * n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 4 * m[y * n + x];
        const N = 2 * n;
        next[y * N + x] = v;
        next[y * N + x + n] = v + 2;
        next[(y + n) * N + x] = v + 3;
        next[(y + n) * N + x + n] = v + 1;
      }
    }
    m = next;
    n *= 2;
  }
  return m;
}

function ordered(g: Gray, size: 4 | 8): Gray {
  const m = bayerMatrix(size);
  const cells = size * size;
  // Cell thresholds sit at the centers of 256 / cells wide bands.
  const thresholds = m.map((v) => ((v + 0.5) * 256) / cells);
  const out = new Uint8ClampedArray(g.data.length);
  for (let y = 0; y < g.height; y++) {
    const row = (y % size) * size;
    for (let x = 0; x < g.width; x++) {
      const i = y * g.width + x;
      out[i] = g.data[i] >= thresholds[row + (x % size)] ? 255 : 0;
    }
  }
  return { width: g.width, height: g.height, data: out };
}
