import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { generatePack, dominantColor } from '@/lib/etsy-listing-kit/generator';
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

describe('dominantColor (badge accent)', () => {
  const svgPng = (body: string) =>
    sharp(Buffer.from(`<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">${body}</svg>`)).png().toBuffer();

  it('samples inked pixels, not the white/transparent background', async () => {
    const red = await svgPng(`<circle cx="200" cy="200" r="120" fill="#c03018"/>`);
    const hex = await dominantColor(red);
    const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16));
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('falls back to terracotta for pure black line art', async () => {
    const black = await svgPng(`<circle cx="200" cy="200" r="120" fill="none" stroke="#000" stroke-width="8"/>`);
    expect(await dominantColor(black)).toBe('#b24a2e');
  });

  it('falls back to terracotta when nothing qualifies (all near-white)', async () => {
    const white = await svgPng(`<rect width="400" height="400" fill="#fdfdfd"/>`);
    expect(await dominantColor(white)).toBe('#b24a2e');
  });

  it('is EXIF-orientation invariant', async () => {
    const base = await svgPng(`<rect x="0" y="0" width="400" height="120" fill="#2a6f4e"/>`);
    const rotated = await sharp(base).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const plain = await dominantColor(await sharp(base).jpeg().toBuffer());
    const oriented = await dominantColor(rotated);
    expect(oriented).toBe(plain);
  });
});

describe('badge placement', () => {
  it('composites the arch badge into the top-left of mockups', async () => {
    const design = await sharp(
      Buffer.from(`<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="150" fill="#c03018"/></svg>`),
    ).png().toBuffer();
    const pack = await generatePack(design);
    const flat = pack.find((p) => p.id === 'flat')!;
    // Sample inside the arch body (badge at 70,70; arch is solid below y≈190).
    const region = await sharp(flat.clean).extract({ left: 100, top: 300, width: 8, height: 8 }).stats();
    const [r, g, b] = region.channels.map((c) => c.mean);
    // Studio bg is #ececea (r≈g≈b≈236); the badge arch must differ clearly.
    expect(Math.abs(r - 236) + Math.abs(g - 236) + Math.abs(b - 236)).toBeGreaterThan(60);
  }, 30_000);
});
