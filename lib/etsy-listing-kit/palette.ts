/**
 * Palette sampler — the "on brand" mechanic (design decision 27, Figma 02.26).
 *
 * Template cards tint themselves with colors sampled from the listing's own
 * photos, so "on brand" is measured, not guessed: dominant saturated colors
 * win (the keychain fixture yields W&H's orange). Muted photo sets fall back
 * to the ELK terracotta rather than inventing a brand color from noise.
 */

import sharp from 'sharp';

/** ELK terracotta — the honest fallback when photos are too muted to sample. */
export const PALETTE_FALLBACK = '#b24a2e';

/** Saturation/brightness gates: only clearly-chromatic pixels count. */
const MIN_SATURATION = 0.45;
const MIN_BRIGHTNESS = 90;
/** A color needs a real footprint before it may lead a brand palette. */
const MIN_BUCKET_SHARE = 0.02;

export interface SampledPalette {
  /** Dominant saturated colors, most common first (hex). */
  colors: string[];
  /** False when nothing cleared the gates and the fallback leads. */
  sampled: boolean;
}

export async function samplePalette(photos: Buffer[]): Promise<SampledPalette> {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  let totalPixels = 0;

  for (const photo of photos) {
    let raw: { data: Buffer; info: { width: number; height: number } };
    try {
      raw = await sharp(photo).resize(64, 64, { fit: 'fill' }).removeAlpha().raw()
        .toBuffer({ resolveWithObject: true });
    } catch {
      continue; // an unreadable photo shouldn't sink the whole palette
    }
    const { data, info } = raw;
    const pixels = info.width * info.height;
    totalPixels += pixels;
    for (let i = 0; i < pixels; i++) {
      const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      if (saturation < MIN_SATURATION || max < MIN_BRIGHTNESS) continue;
      // Coarse 3-bit-per-channel buckets group near-identical shades.
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bucket.n += 1; bucket.r += r; bucket.g += g; bucket.b += b;
      buckets.set(key, bucket);
    }
  }

  const toHex = (bucket: { n: number; r: number; g: number; b: number }) =>
    '#' + [bucket.r, bucket.g, bucket.b]
      .map((sum) => Math.round(sum / bucket.n).toString(16).padStart(2, '0'))
      .join('');

  const colors = [...buckets.values()]
    .filter((b) => totalPixels > 0 && b.n / totalPixels >= MIN_BUCKET_SHARE)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map(toHex);

  if (colors.length === 0) return { colors: [PALETTE_FALLBACK], sampled: false };
  return { colors, sampled: true };
}
