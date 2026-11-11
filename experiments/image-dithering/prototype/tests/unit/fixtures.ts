// Small, fixed, deterministic fixtures. No randomness without a fixed seed.
import type { Gray } from "../../src/engine/types";

export function flat(width: number, height: number, value: number): Gray {
  return { width, height, data: new Uint8ClampedArray(width * height).fill(value) };
}

/** Left-to-right ramp 0 → 255. */
export function horizontalGradient(width: number, height: number): Gray {
  const data = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = Math.round((x / (width - 1)) * 255);
    }
  }
  return { width, height, data };
}

/** A lopsided "photo": diagonal ramp plus seeded noise, so no axis of symmetry. */
export function photoLike(width: number, height: number, seed = 1): Gray {
  let s = seed >>> 0;
  const rand = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const data = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ramp = ((x * 2 + y) / (width * 2 + height)) * 220;
      data[y * width + x] = Math.round(ramp + rand() * 35);
    }
  }
  return { width, height, data };
}

export function whiteShare(g: Gray): number {
  let white = 0;
  for (const v of g.data) if (v === 255) white++;
  return white / g.data.length;
}
