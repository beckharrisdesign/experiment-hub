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
    expect(pack.map((p) => p.id)).toEqual(['flat', 'framed', 'in-hoop', 'scale', 'floss', 'sewn']);

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
      { id: 'floss', template: 'hoop-floss.jpg', cx: 1560, cy: 1010 },
      { id: 'sewn', template: 'hoop-sage.jpg', cx: 525, cy: 995 },
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

  it('clears a non-white canvas even where a closed shape encloses it', async () => {
    // Ring on a GREY canvas: the middle is unreachable from the edges, so it
    // only clears under the non-white rule. Otherwise it multiplies onto the
    // fabric as a visible disc.
    const ring = Buffer.from(
      `<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="800" fill="#c9c9c9"/><circle cx="400" cy="400" r="300" fill="none" stroke="#2e2e2e" stroke-width="14"/></svg>`,
    );
    const pack = await generatePack(await sharp(ring).jpeg({ quality: 92 }).toBuffer());
    const terra = pack.find((p) => p.id === 'scale')!;
    const sample = async (buf: Buffer | string, cx: number, cy: number) => {
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      const i = (cy * info.width + cx) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    // Terracotta fabric circle centre (990, 990) — inside the ring.
    const [r1, g1, b1] = await sample(terra.clean, 990, 990);
    const [r0, g0, b0] = await sample(path.join(process.cwd(), 'assets', 'mockups', 'hoop-terra.jpg'), 990, 990);
    expect(Math.abs(r1 - r0) + Math.abs(g1 - g0) + Math.abs(b1 - b0)).toBeLessThan(20);
  }, 60_000);

  it('keeps opaque (white-background) uploads box-free — effects follow ink, and the 15% fabric buffer stays clean', async () => {
    // Real uploads are often JPEGs: opaque white canvas around the art.
    const opaque = await sharp(DESIGN).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
    const pack = await generatePack(opaque);
    const sewn = pack.find((p) => p.id === 'sewn')!;

    const sample = async (buf: Buffer | string, cx: number, cy: number) => {
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      const i = (cy * info.width + cx) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    // Sewn scene: fabric circle (525, 995, r=570). Sample in the 15% buffer
    // zone on the diagonal — inside the upload's white rectangle but outside
    // its ink. Must match the untouched template: no shadow box, no hatch box.
    const d = Math.round((0.85 * 570) / Math.SQRT2); // ≈343
    const [x, y] = [525 + d, 995 - d];
    const [r1, g1, b1] = await sample(sewn.clean, x, y);
    const [r0, g0, b0] = await sample(path.join(process.cwd(), 'assets', 'mockups', 'hoop-sage.jpg'), x, y);
    expect(Math.abs(r1 - r0) + Math.abs(g1 - g0) + Math.abs(b1 - b0)).toBeLessThan(20);
  }, 60_000);

  it('leaves white enclosed by a closed outline as fabric, not a grey blob', async () => {
    // Regression: the catalogue is line art — closed outlines (leaves, wreaths,
    // mandalas) on a white canvas. knockOutFlatBackground deliberately KEEPS
    // white enclosed by a closed shape (it reads as paper), so those pixels
    // reach the sewn scene fully opaque. inkMask used to treat opacity as ink,
    // so the relief shadow filled every closed shape and multiply rendered it
    // grey. Ink must be decided by darkness, not alpha.
    //
    // The sibling test above samples only OUTSIDE the artwork's ink, in the
    // fabric buffer — it cannot see this. This one samples dead centre, inside
    // the ring, where the bug lived.
    const ring = await sharp(
      Buffer.from(
        `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">` +
          `<rect width="600" height="600" fill="#ffffff"/>` +
          `<circle cx="300" cy="300" r="220" fill="none" stroke="#111111" stroke-width="6"/>` +
          `</svg>`,
      ),
    )
      .jpeg({ quality: 92 })
      .toBuffer();

    const pack = await generatePack(ring);
    const sewn = pack.find((p) => p.id === 'sewn')!;

    const sample = async (buf: Buffer | string, cx: number, cy: number) => {
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      const i = (cy * info.width + cx) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };

    // hoop-sage fabric circle centre — enclosed by the ring, contains no ink.
    const [cx, cy] = [525, 995];
    const [r1, g1, b1] = await sample(sewn.clean, cx, cy);
    const [r0, g0, b0] = await sample(path.join(process.cwd(), 'assets', 'mockups', 'hoop-sage.jpg'), cx, cy);

    // Must still read as bare fabric. Pre-fix this darkened by ~60 per channel.
    expect(Math.abs(r1 - r0) + Math.abs(g1 - g0) + Math.abs(b1 - b0)).toBeLessThan(24);
  }, 60_000);
});
