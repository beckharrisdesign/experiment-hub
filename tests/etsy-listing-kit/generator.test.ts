import { describe, it, expect } from 'vitest';
import path from 'path';
import sharp from 'sharp';
import { generatePack } from '@/lib/etsy-listing-kit/generator';
import { PACK_ITEMS, PACK_IMAGE_PX } from '@/lib/etsy-listing-kit/config';

// A tiny valid design to composite (kept small so the test stays fast).
const DESIGN = Buffer.from(
  `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><circle cx="300" cy="300" r="220" fill="#b24a2e"/></svg>`,
);

describe('generatePack', () => {
  it('produces the 6 recomposed items (no detail crop / info card) with clean + watermarked variants', async () => {
    const design = await sharp(DESIGN).png().toBuffer();
    const pack = await generatePack(design);

    expect(pack.map((p) => p.id)).toEqual(PACK_ITEMS.map((i) => i.id));
    expect(pack.map((p) => p.id)).toEqual(['flat', 'framed', 'in-hoop', 'scale', 'mustard', 'sewn']);

    for (const img of pack) {
      // both variants non-empty JPEGs (SOI marker 0xFFD8)
      expect(img.clean.length).toBeGreaterThan(1000);
      expect(img.watermarked.length).toBeGreaterThan(1000);
      expect(img.clean.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
      // watermarked differs from clean, and stays under Etsy's ~1MB guidance
      expect(img.watermarked.equals(img.clean)).toBe(false);
      expect(img.watermarked.length).toBeLessThan(1024 * 1024);
    }
  }, 60_000);

  it('outputs 2000px square images', async () => {
    const design = await sharp(DESIGN).png().toBuffer();
    const pack = await generatePack(design);
    const meta = await sharp(pack[0].clean).metadata();
    expect(meta.width).toBe(PACK_IMAGE_PX);
    expect(meta.height).toBe(PACK_IMAGE_PX);
  }, 60_000);

  it('centers the design in each scene’s fabric circle (new scenes included)', async () => {
    const design = await sharp(DESIGN).png().toBuffer();
    const pack = await generatePack(design);

    // Fabric-circle centers must show the design (multiply darkens the fabric);
    // compare against the untouched template at the same coordinates.
    const cases: { id: string; template: string; cx: number; cy: number }[] = [
      { id: 'mustard', template: 'hoop-mustard.jpg', cx: 1000, cy: 920 },
      { id: 'sewn', template: 'hoop-sage.jpg', cx: 1048, cy: 1005 },
    ];
    // Raw pixel read — sharp's stats() ignores a preceding extract(), so
    // sample the decoded buffer directly.
    const sample = async (buf: Buffer | string, cx: number, cy: number) => {
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      const i = (cy * info.width + cx) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    for (const c of cases) {
      const img = pack.find((p) => p.id === c.id)!;
      const [r1] = await sample(img.clean, c.cx, c.cy);
      const [r0] = await sample(path.join(process.cwd(), 'assets', 'mockups', c.template), c.cx, c.cy);
      // The red test circle multiply-blended at center must darken the template.
      expect(Math.abs(r1 - r0)).toBeGreaterThan(10);
    }
  }, 60_000);
});
