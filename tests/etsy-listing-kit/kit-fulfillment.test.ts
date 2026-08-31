import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { generateListingKit, buildManifest } from '@/lib/etsy-listing-kit/kit-fulfillment';
import { DeterministicComposer } from '@/lib/etsy-listing-kit/composer';
import { fullResUrl, fetchListingPhotos, type FetchedListing } from '@/lib/etsy-listing-kit/listing-fetch';
import keychain from '@/lib/etsy-listing-kit/fixtures/keychain-4522917501.json';

const listing = keychain as unknown as FetchedListing;
const photo = (r: number, g: number, b: number) =>
  sharp({ create: { width: 600, height: 600, channels: 3, background: { r, g, b } } }).jpeg().toBuffer();

describe('generateListingKit', () => {
  it('builds the full kit with grounded text when a composer runs', async () => {
    const photos = [await photo(240, 98, 23), await photo(90, 120, 100)];
    const kit = await generateListingKit(listing, photos, new DeterministicComposer());
    expect(kit.images).toHaveLength(10);
    expect(kit.template.id).toBe('template');
    expect(kit.kitText).not.toBeNull();
    expect(kit.kitText!.suggestedTitle).toContain('Custom engraved pet keychain');
    expect(kit.brief.wordingThin).toBe(true);
    expect(kit.paletteColors.length).toBeGreaterThan(0);
  }, 60_000);

  it('ships images + template with kitText null when no composer is configured', async () => {
    const photos = [await photo(200, 60, 30), await photo(60, 60, 200)];
    const kit = await generateListingKit(listing, photos, null);
    expect(kit.images).toHaveLength(10);
    expect(kit.kitText).toBeNull(); // unavailable — never faked
  }, 60_000);

  it('a composer failure degrades to unavailable instead of sinking the order', async () => {
    const failing = { compose: async () => { throw new Error('api down'); } };
    const photos = [await photo(220, 80, 40)];
    const kit = await generateListingKit(listing, photos, failing);
    expect(kit.images).toHaveLength(10);
    expect(kit.kitText).toBeNull();
  }, 60_000);

  it('manifest lists every stored file and carries text + brief', async () => {
    const photos = [await photo(240, 98, 23), await photo(90, 120, 100)];
    const kit = await generateListingKit(listing, photos, new DeterministicComposer());
    const manifest = buildManifest(kit);
    expect(manifest.version).toBe(1);
    expect(manifest.images).toHaveLength(10);
    expect(manifest.images.every((i) => i.file === `${i.id}.jpg`)).toBe(true);
    expect(manifest.template.file).toBe('template.jpg');
    expect(manifest.kitText).toEqual(kit.kitText);
    expect(manifest.brief.listingId).toBe(4522917501);
  }, 60_000);
});

describe('listing photo fetching', () => {
  it('derives the full-resolution CDN URL by filename convention', () => {
    expect(fullResUrl('https://i.etsystatic.com/x/il_570xN.123_ab.jpg'))
      .toBe('https://i.etsystatic.com/x/il_fullxfull.123_ab.jpg');
  });

  it('fetches full-res first, falls back per photo, skips total failures', async () => {
    const calls: string[] = [];
    const good = await photo(10, 10, 10);
    const fetcher = async (url: string) => {
      calls.push(url);
      if (url.includes('fullxfull.8143800118')) return null; // photo 1 full-res missing
      if (url.includes('8143800124')) return url.includes('fullxfull') ? good : null;
      return url.includes('570xN') ? good : null;
    };
    const photos = await fetchListingPhotos(listing, fetcher);
    expect(photos).toHaveLength(2);
    // photo 1: tried fullxfull, fell back to 570xN; photo 2: fullxfull hit
    expect(calls.filter((u) => u.includes('8143800118'))).toHaveLength(2);
    expect(calls.filter((u) => u.includes('8143800124'))).toHaveLength(1);
  });
});
