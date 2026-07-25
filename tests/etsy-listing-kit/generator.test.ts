import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { generatePack } from '@/lib/etsy-listing-kit/generator';
import { PACK_ITEMS, PACK_IMAGE_PX } from '@/lib/etsy-listing-kit/config';

// A tiny valid design to composite (kept small so the test stays fast).
const DESIGN = Buffer.from(
  `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><circle cx="300" cy="300" r="220" fill="#b24a2e"/></svg>`,
);

describe('generatePack', () => {
  it('produces the 6 curated items with clean + watermarked variants', async () => {
    const design = await sharp(DESIGN).png().toBuffer();
    const pack = await generatePack(design);

    expect(pack.map((p) => p.id)).toEqual(PACK_ITEMS.map((i) => i.id));

    for (const img of pack) {
      // both variants non-empty JPEGs (SOI marker 0xFFD8)
      expect(img.clean.length).toBeGreaterThan(1000);
      expect(img.watermarked.length).toBeGreaterThan(1000);
      expect(img.clean.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
      // watermarked differs from clean, and stays under Etsy's ~1MB guidance
      expect(img.watermarked.equals(img.clean)).toBe(false);
      expect(img.watermarked.length).toBeLessThan(1024 * 1024);
    }
  }, 30_000);

  it('outputs 2000px square images', async () => {
    const design = await sharp(DESIGN).png().toBuffer();
    const pack = await generatePack(design);
    const meta = await sharp(pack[0].clean).metadata();
    expect(meta.width).toBe(PACK_IMAGE_PX);
    expect(meta.height).toBe(PACK_IMAGE_PX);
  }, 30_000);
});
