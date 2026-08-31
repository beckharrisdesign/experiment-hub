/**
 * Listing-kit generation — the 3.5e pipeline in one pure step:
 * brief → palette → (grounded composer, if available) → scene ladder.
 *
 * Callers hand in the listing snapshot, its photo buffers, and a composer
 * (or null — design decision 30: no composer means text deliverables ship
 * UNAVAILABLE, images and template still generate). No I/O here; fetching
 * and storage live in fulfillment.ts.
 */

import { buildBrief, type ListingBrief } from './brief';
import { samplePalette } from './palette';
import { generateKitScenes, type KitImage } from './scenes';
import type { Composer, KitText } from './composer';
import type { FetchedListing } from './listing-fetch';

export interface ListingKit {
  images: KitImage[];
  template: KitImage;
  brief: ListingBrief;
  paletteColors: string[];
  /** Null when no composer ran — the result surface says "unavailable", never fakes it. */
  kitText: KitText | null;
}

/** Stored beside the images so order/download routes serve any kit shape. */
export interface KitManifest {
  version: 1;
  images: { id: string; label: string; file: string }[];
  template: { id: string; label: string; file: string };
  kitText: KitText | null;
  brief: ListingBrief;
  paletteColors: string[];
}

export async function generateListingKit(
  listing: FetchedListing,
  photos: Buffer[],
  composer: Composer | null,
  shopName?: string,
): Promise<ListingKit> {
  const brief = buildBrief(listing);
  const palette = await samplePalette(photos);

  let kitText: KitText | null = null;
  if (composer) {
    const photoContext = (listing.images ?? []).map((img) => ({
      rank: img.rank,
      context: img.alt_text?.trim() ?? '',
    }));
    // Composer failure degrades to unavailable rather than sinking the order —
    // the buyer still gets images + template, and the miss is diagnosable.
    try {
      kitText = await composer.compose({ brief, photos: photoContext });
    } catch (err) {
      console.error(`[elk kit] composer failed for listing ${brief.listingId}:`, err);
      kitText = null;
    }
  }

  const scenes = await generateKitScenes({
    photos,
    brief,
    palette,
    headline: kitText?.suggestedTitle,
    shopName,
  });

  return { images: scenes.images, template: scenes.template, brief, paletteColors: palette.colors, kitText };
}

export function buildManifest(kit: ListingKit): KitManifest {
  return {
    version: 1,
    images: kit.images.map((i) => ({ id: i.id, label: i.label, file: `${i.id}.jpg` })),
    template: { id: kit.template.id, label: kit.template.label, file: `${kit.template.id}.jpg` },
    kitText: kit.kitText,
    brief: kit.brief,
    paletteColors: kit.paletteColors,
  };
}
