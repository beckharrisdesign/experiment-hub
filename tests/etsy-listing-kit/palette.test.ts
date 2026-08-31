import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { samplePalette, PALETTE_FALLBACK } from '@/lib/etsy-listing-kit/palette';

const solid = (r: number, g: number, b: number) =>
  sharp({ create: { width: 32, height: 32, channels: 3, background: { r, g, b } } })
    .png()
    .toBuffer();

describe('samplePalette', () => {
  it('finds a dominant saturated color (the on-brand mechanic)', async () => {
    // W&H-orange-ish ground — saturated, bright, should lead the palette
    const palette = await samplePalette([await solid(240, 98, 23)]);
    expect(palette.sampled).toBe(true);
    expect(palette.colors.length).toBeGreaterThan(0);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(palette.colors[0].slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(60);
    expect(b).toBeLessThan(80);
  });

  it('falls back to terracotta for muted photos instead of inventing a brand', async () => {
    const palette = await samplePalette([await solid(128, 128, 128), await solid(230, 228, 225)]);
    expect(palette.sampled).toBe(false);
    expect(palette.colors).toEqual([PALETTE_FALLBACK]);
  });

  it('survives an unreadable buffer', async () => {
    const palette = await samplePalette([Buffer.from('not an image'), await solid(220, 40, 40)]);
    expect(palette.sampled).toBe(true);
  });

  it('handles an empty photo set', async () => {
    const palette = await samplePalette([]);
    expect(palette.sampled).toBe(false);
    expect(palette.colors).toEqual([PALETTE_FALLBACK]);
  });
});
