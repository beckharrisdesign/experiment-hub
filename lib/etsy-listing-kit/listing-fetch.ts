/**
 * Listing fetch shared by checkout validation and fulfillment (3.4b/3.5e).
 *
 * Same posture as the evaluate route (design decision 7): fixtures whenever
 * ELK_EVAL_FIXTURES=1 or no ETSY_API_KEY — dev and tests never call Etsy —
 * otherwise the official v3 API with the existing app key. The evaluate
 * route keeps its own copy of this logic until 3.4a rebuilds it on /check;
 * consolidation lands there.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import type { BriefInput } from './brief';

export interface ListingImageRef {
  rank: number;
  alt_text?: string | null;
  url_570xN?: string | null;
}

/** The snapshot shape fulfillment needs (superset of BriefInput). */
export interface FetchedListing extends BriefInput {
  images?: (ListingImageRef & { full_width?: number; full_height?: number })[] | null;
}

const FIXTURES: Record<number, string> = {
  4522917501: 'keychain-4522917501.json',
  4465357735: 'floral-4465357735.json',
  9990000001: 'synthetic-fully-built.json',
};

export function fixturesEnabled(): boolean {
  return process.env.ELK_EVAL_FIXTURES === '1' || !process.env.ETSY_API_KEY;
}

async function loadFixture(listingId: number): Promise<FetchedListing | null> {
  const file = FIXTURES[listingId];
  if (!file) return null;
  const p = path.join(process.cwd(), 'lib', 'etsy-listing-kit', 'fixtures', file);
  return JSON.parse(await readFile(p, 'utf8')) as FetchedListing;
}

export async function fetchListingRaw(listingId: number): Promise<FetchedListing | null> {
  if (fixturesEnabled()) return loadFixture(listingId);
  const key = process.env.ETSY_API_KEY!;
  const res = await fetch(
    `https://api.etsy.com/v3/application/listings/${listingId}?includes=Images,Videos`,
    { headers: { 'x-api-key': key } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Etsy API ${res.status}`);
  return (await res.json()) as FetchedListing;
}

/**
 * Full-resolution CDN URL for a listing photo. Etsy serves the same asset at
 * multiple sizes by filename convention; fullxfull is the original upload.
 * Static CDN assets, no bot surface (design decision 9).
 */
export function fullResUrl(url570: string): string {
  return url570.replace('il_570xN', 'il_fullxfull');
}

export type PhotoFetcher = (url: string) => Promise<Buffer | null>;

const defaultFetcher: PhotoFetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
};

/**
 * Download a listing's photos, highest-rank first — full resolution with a
 * per-photo fallback to the 570px rendition. A photo that fails both is
 * skipped (the scene ladder works with what arrives).
 */
export async function fetchListingPhotos(
  listing: FetchedListing,
  fetcher: PhotoFetcher = defaultFetcher,
): Promise<Buffer[]> {
  const refs = [...(listing.images ?? [])]
    .filter((i) => i.url_570xN)
    .sort((a, b) => a.rank - b.rank);
  const photos: Buffer[] = [];
  for (const ref of refs) {
    const url = ref.url_570xN!;
    const buf = (await fetcher(fullResUrl(url))) ?? (await fetcher(url));
    if (buf) photos.push(buf);
  }
  return photos;
}
