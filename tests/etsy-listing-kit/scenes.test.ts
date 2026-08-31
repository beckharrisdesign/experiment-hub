import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { buildBrief, isTraceable, type BriefInput } from '@/lib/etsy-listing-kit/brief';
import { generateKitScenes, KIT_IMAGE_COUNT, type SceneInput } from '@/lib/etsy-listing-kit/scenes';
import keychain from '@/lib/etsy-listing-kit/fixtures/keychain-4522917501.json';

const photo = (r: number, g: number, b: number) =>
  sharp({ create: { width: 800, height: 800, channels: 3, background: { r, g, b } } })
    .jpeg()
    .toBuffer();

const keychainBrief = buildBrief(keychain as unknown as BriefInput);
const palette = { colors: ['#f06217'], sampled: true };

async function keychainInput(overrides: Partial<SceneInput> = {}): Promise<SceneInput> {
  return {
    photos: [await photo(240, 98, 23), await photo(120, 140, 110)],
    brief: keychainBrief,
    palette,
    ...overrides,
  };
}

describe('generateKitScenes — the ladder', () => {
  it('a two-photo, wording-thin listing still gets ten ready images + template', async () => {
    const scenes = await generateKitScenes(await keychainInput());
    expect(scenes.images).toHaveLength(KIT_IMAGE_COUNT);
    expect(scenes.template.id).toBe('template');
    // photo work leads; every image has a distinct id
    expect(scenes.images[0].id).toBe('recut-1');
    expect(new Set(scenes.images.map((i) => i.id)).size).toBe(KIT_IMAGE_COUNT);
  }, 60_000);

  it('every image is 2000px square and under Etsy’s ~1MB guidance', async () => {
    const scenes = await generateKitScenes(await keychainInput());
    for (const image of [...scenes.images, scenes.template]) {
      const meta = await sharp(image.buffer).metadata();
      expect([meta.width, meta.height]).toEqual([2000, 2000]);
      expect(meta.format).toBe('jpeg');
      expect(image.buffer.length).toBeLessThan(1024 * 1024);
    }
  }, 60_000);

  it('QA 4.6 — every card string is traceable to the brief (or is the passed headline)', async () => {
    const input = await keychainInput({ headline: 'Custom Engraved Pet Keychain, Made to Order', shopName: 'Watermark & Hue' });
    const scenes = await generateKitScenes(input);
    for (const image of scenes.images) {
      for (const text of image.copy) {
        const allowed = isTraceable(input.brief, text) || text === input.headline || text === input.shopName;
        expect(allowed, `"${text}" on ${image.id} is not brief-traceable`).toBe(true);
      }
    }
  }, 60_000);

  it('data cards are gated: no facts → no details card, backfilled with photo work', async () => {
    const thinBrief = buildBrief({ listing_id: 1, title: 'A thing' } as BriefInput);
    const scenes = await generateKitScenes({
      photos: [await photo(200, 60, 40)],
      brief: thinBrief,
      palette,
    });
    const ids = scenes.images.map((i) => i.id);
    expect(ids).not.toContain('details-card');
    expect(ids).not.toContain('collage'); // needs two photos
    expect(ids).not.toContain('closing-card'); // needs a shop name
    expect(ids).toContain('title-card'); // a title always exists
    expect(scenes.images).toHaveLength(KIT_IMAGE_COUNT); // backfill covered the gaps
  }, 60_000);

  it('renders details and collage cards when their data exists', async () => {
    const scenes = await generateKitScenes(await keychainInput({ shopName: 'Watermark & Hue' }));
    const ids = scenes.images.map((i) => i.id);
    expect(ids).toContain('details-card'); // keychain has price/made/ships/stock
    expect(ids).toContain('collage'); // two photos
    expect(ids).toContain('closing-card'); // shop name provided
    const details = scenes.images.find((i) => i.id === 'details-card')!;
    expect(details.copy).toContain('$25.00');
    expect(details.copy).toContain('made to order');
  }, 60_000);

  it('refuses a photoless listing rather than fabricating scenes', async () => {
    await expect(
      generateKitScenes({ photos: [], brief: keychainBrief, palette }),
    ).rejects.toThrow(/at least one/);
  });
});
