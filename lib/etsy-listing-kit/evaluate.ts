/**
 * Listing evaluation — pure logic for the ELK evaluation surface
 * (openspec/changes/elk-listing-evaluation).
 *
 * No I/O here: URL parsing, field checklist, and recommendation building are
 * pure so they are unit-testable and provably identical to the labs scorecard
 * (both import lib/etsy-scorecard.ts — spec: "One rubric, shared with the
 * scorecard"). The API route owns fetch/cache/throttle.
 */

import {
  scoreListing,
  SCORECARD_DEFAULTS,
  type RawListing,
  type ScoredListing,
} from '../etsy-scorecard';
import { citationFor, checkedLabel, type Citation } from './citations';

// ---------------------------------------------------------------------------
// URL parsing (design decision 8: tolerate tracking clutter; shop links
// suggest rather than fail)
// ---------------------------------------------------------------------------

export type ParsedEtsyUrl =
  | { kind: 'listing'; listingId: number }
  | { kind: 'shop'; shopSlug: string }
  | { kind: 'invalid'; reason: string };

export function parseEtsyUrl(input: string): ParsedEtsyUrl {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return { kind: 'invalid', reason: 'Paste a listing’s URL to check it.' };

  let url: URL;
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return { kind: 'invalid', reason: 'That doesn’t look like a link — paste the listing’s full URL.' };
  }

  if (!/(^|\.)etsy\.com$/i.test(url.hostname)) {
    return {
      kind: 'invalid',
      reason: 'That’s not an Etsy link — paste a listing’s URL from your shop (it has /listing/ in it). Nothing was scored.',
    };
  }

  // The listing id segment is the only thing that matters — real URLs arrive
  // wrapped in ref=/logging_key= clutter and an arbitrary slug.
  const listingMatch = url.pathname.match(/\/listing\/(\d+)/i);
  if (listingMatch) return { kind: 'listing', listingId: Number(listingMatch[1]) };

  const shopMatch = url.pathname.match(/\/shop\/([A-Za-z0-9_-]+)/i);
  if (shopMatch) return { kind: 'shop', shopSlug: shopMatch[1] };

  return {
    kind: 'invalid',
    reason: 'That’s an Etsy link, but not a listing — paste one listing’s URL (it has /listing/ in it). Nothing was scored.',
  };
}

// ---------------------------------------------------------------------------
// Raw listing shape from the v3 API (superset of the scorecard's RawListing)
// ---------------------------------------------------------------------------

export interface RawApiImage {
  url_570xN?: string | null;
  url_fullxfull?: string | null;
  full_width?: number | null;
  full_height?: number | null;
  alt_text?: string | null;
  rank?: number | null;
}

export interface RawApiListing extends RawListing {
  price?: { amount?: number; divisor?: number } | null;
  taxonomy_id?: number | null;
  who_made?: string | null;
  when_made?: string | null;
  is_supply?: boolean | null;
  readiness_state_id?: number | null;
  shop_section_id?: number | null;
  images?: RawApiImage[] | null;
}

// ---------------------------------------------------------------------------
// Field checklist (design decision 21: "FIELDS WE READ" — required fields,
// each named, checked when present)
// ---------------------------------------------------------------------------

export interface FieldCheck {
  key: string;
  label: string;
  present: boolean;
}

export function requiredFieldChecklist(raw: RawApiListing): FieldCheck[] {
  const isDigital = raw.listing_type === 'download';
  const has = (v: unknown) => v !== null && v !== undefined && v !== '' && v !== 0;
  return [
    { key: 'title', label: 'Title', present: !!raw.title?.trim() },
    { key: 'description', label: 'Description', present: !!raw.description?.trim() },
    { key: 'price', label: 'Price', present: has(raw.price?.amount) },
    { key: 'quantity', label: 'In stock', present: isDigital || (raw.quantity ?? 0) > 0 },
    { key: 'photo', label: 'Photo', present: (raw.images?.length ?? 0) > 0 },
    { key: 'category', label: 'Category', present: has(raw.taxonomy_id) },
    {
      key: 'attribution',
      label: 'Attribution',
      present: !!raw.who_made && !!raw.when_made && raw.is_supply !== null && raw.is_supply !== undefined,
    },
    { key: 'shipping', label: 'Shipping', present: isDigital || has(raw.shipping_profile_id) },
    { key: 'processing', label: 'Processing', present: isDigital || has(raw.readiness_state_id) || (raw.processing_min ?? 0) > 0 },
    { key: 'active', label: 'Active', present: raw.state === 'active' },
  ];
}

// ---------------------------------------------------------------------------
// Recommendations (design decisions 13/14/17/18/21/25: fixed order, opportunity
// framing, evidence per card, one image card per listing, video last)
// ---------------------------------------------------------------------------

export interface PhotoEvidence {
  url: string | null;
  altText: string | null;
  /** min(full_width, full_height); null when the API omitted dimensions. */
  shortestSide: number | null;
  /** Below Etsy's recommended 2000px shortest side. */
  belowRecommended: boolean | null;
}

export interface Recommendation {
  key: 'images_open' | 'images_improve' | 'title' | 'alt_text' | 'tags' | 'video';
  headline: string;
  chip: { label: string; tone: 'accent' | 'muted' };
  /** Card-specific evidence payload; the UI switches on `key`. */
  evidence: Record<string, unknown>;
  caption: string;
  citation: (Citation & { checked: string }) | null;
  kit: { text: string; comingSoon?: boolean };
}

const RECOMMENDED_PX = 2000;

function photoEvidence(raw: RawApiListing): PhotoEvidence[] {
  return (raw.images ?? []).map((img) => {
    const w = img.full_width ?? null;
    const h = img.full_height ?? null;
    const shortest = w !== null && h !== null ? Math.min(w, h) : null;
    return {
      url: img.url_570xN ?? img.url_fullxfull ?? null,
      altText: img.alt_text?.trim() || null,
      shortestSide: shortest,
      belowRecommended: shortest === null ? null : shortest < RECOMMENDED_PX,
    };
  });
}

function withChecked(criterion: string) {
  const c = citationFor(criterion);
  return c ? { ...c, checked: checkedLabel(c) } : null;
}

export function buildRecommendations(raw: RawApiListing, scored: ScoredListing, textOk = false): Recommendation[] {
  const d = SCORECARD_DEFAULTS;
  const recs: Recommendation[] = [];
  const photos = photoEvidence(raw);
  const slotCount = d.photos;
  const openSlots = Math.max(0, slotCount - photos.length);
  const weakPhotos = photos.filter((p) => p.belowRecommended === true).length;

  // Image card — open-slots OR improve-existing, never both (decision 18).
  if (openSlots > 0) {
    recs.push({
      key: 'images_open',
      headline: 'Take advantage of your open image slots.',
      chip: { label: 'BIGGEST LIFT', tone: 'accent' },
      evidence: { photos, slotCount },
      caption: `These are the ${photos.length === 1 ? 'photo buyers see' : `${photos.length} photos buyers see`} today — with ${openSlots} more ${openSlots === 1 ? 'chance' : 'chances'} to show this piece off.`,
      citation: withChecked('photos'),
      kit: {
        // Founder copy, Figma 02.24 — shipped by the scene ladder (3.5c/e).
        text: 'Ten new or updated images that are on brand and ready to upload, plus a template for you to make more.',
      },
    });
  } else if (weakPhotos > 0) {
    recs.push({
      key: 'images_improve',
      headline: 'Improve the listing images you already have.',
      chip: { label: 'BIGGEST LIFT', tone: 'accent' },
      evidence: { photos, slotCount, weakPhotos, recommendedPx: RECOMMENDED_PX },
      caption: `All ${photos.length} slots are in use, but ${weakPhotos} ${weakPhotos === 1 ? 'photo measures' : 'photos measure'} under Etsy’s recommended ${RECOMMENDED_PX}px. Full isn’t the same as working.`,
      citation: withChecked('photo_quality'),
      kit: {
        text: 'Ten refreshed images at 2000px — your best shots re-edited, the weak ones replaced — plus a template for you to make more.',
      },
    });
  }

  // Title.
  const titleLen = (raw.title ?? '').length;
  const headroom = Math.max(0, d.titleMaxLength - titleLen);
  if (headroom > 0) {
    recs.push({
      key: 'title',
      headline: 'Put more of your allowed title to good use.',
      chip: { label: 'QUICK WIN', tone: 'accent' },
      evidence: { title: raw.title ?? '', used: titleLen, max: d.titleMaxLength, headroom },
      caption: `${headroom} characters free. Room for more of what this piece is.`,
      citation: withChecked('title_length'),
      kit: textOk
        ? { text: 'A ready-to-paste 140-character title, written from your listing.' }
        : { text: 'A ready-to-paste 140-character title, written from your listing. Coming soon.', comingSoon: true },
    });
  }

  // Alt text — kept adjacent to the images it annotates (decision 13).
  const missingAlt = photos.filter((p) => !p.altText).length;
  if (photos.length > 0 && missingAlt > 0) {
    recs.push({
      key: 'alt_text',
      headline: 'Give your photos alt text search can read.',
      chip: { label: 'QUICK WIN', tone: 'accent' },
      evidence: { photos, missingAlt },
      caption: 'A line or two of alt text opens these photos to visually-impaired shoppers and image search.',
      citation: withChecked('alt_text'),
      kit: textOk
        ? { text: 'Alt text written for every photo — the ones you have and the ten it adds.' }
        : { text: 'Alt text written for every photo. Coming soon.', comingSoon: true },
    });
  }

  // Tags — the keychain taught us empty tags is a real case (decision 21).
  const tagCount = (raw.tags ?? []).length;
  if (tagCount < d.tags) {
    recs.push({
      key: 'tags',
      headline: tagCount === 0 ? 'Your 13 tag slots are all still open.' : 'Put your remaining tag slots to work.',
      chip: { label: 'QUICK WIN', tone: 'accent' },
      evidence: { tags: raw.tags ?? [], used: tagCount, max: d.tags },
      caption: `${tagCount} of ${d.tags} tag slots in use. Each tag is another way buyers can find this listing.`,
      citation: withChecked('tags'),
      kit: textOk
        ? { text: 'Thirteen suggested tags, drawn from your listing and Etsy’s guidance.' }
        : { text: 'Thirteen suggested tags, drawn from your listing and Etsy’s guidance. Coming soon.', comingSoon: true },
    });
  }

  // Video — deliberately last: the one gap the kit doesn't fix yet
  // (decision 13; COMING SOON per founder).
  const videoCount = (raw.videos ?? []).length;
  if (videoCount === 0) {
    recs.push({
      key: 'video',
      headline: 'A video slot is waiting when you’re ready.',
      chip: { label: 'COMING SOON', tone: 'muted' },
      evidence: { videoCount },
      caption: 'Your video slot is open — Etsy counts video among its four core SEO elements. The kit doesn’t cut videos quite yet; we’ll tee this one up soon.',
      citation: withChecked('video'),
      kit: { text: 'A listing video, cut from your photos. Coming soon.', comingSoon: true },
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Free sample title (spec: "The free evaluation includes one sample kit
// suggestion"). Deterministic composer over the listing's own content —
// deliberately NOT search data (design decision 20: no search-data claims).
// ---------------------------------------------------------------------------

export function composeSampleTitle(raw: RawApiListing): string | null {
  const base = (raw.title ?? '').trim();
  if (!base) return null;
  const max = SCORECARD_DEFAULTS.titleMaxLength;
  const parts: string[] = [base.replace(/\s+/g, ' ')];
  const seen = new Set(base.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean));
  for (const tag of raw.tags ?? []) {
    const t = tag.trim();
    if (!t) continue;
    const words = t.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
    if (words.every((w) => seen.has(w))) continue; // adds nothing new
    const candidate = parts.join(', ') + ', ' + t;
    if (candidate.length > max) break;
    parts.push(t);
    words.forEach((w) => seen.add(w));
  }
  const composed = parts.join(', ');
  // Only offer a sample that actually uses the headroom meaningfully.
  return composed.length > base.length ? composed : null;
}

// ---------------------------------------------------------------------------
// The full evaluation result
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  listingId: number;
  /** ISO timestamp of the data pull — rendered exactly (#426); no live socket. */
  fetchedAt: string;
  identity: { title: string; imageUrl: string | null; shopNote: string };
  requiredFields: FieldCheck[];
  requiredPass: boolean;
  /** Tier B — grades ONLY Etsy's recommended checklist (design decision 16). */
  recommendedInUse: number;
  state: 'gaps' | 'full';
  recommendations: Recommendation[];
  sampleTitle: string | null;
  scored: ScoredListing;
}

/**
 * `opts.textDeliverables`: whether the composer is configured (route passes
 * Boolean(ANTHROPIC_API_KEY)). Kit copy for title/tags/alt flips between
 * shipped and coming-soon on it — the report never promises what fulfillment
 * can't deliver today (design decision 30's honest degradation, surfaced).
 */
export function evaluateListing(raw: RawApiListing, opts: { textDeliverables?: boolean } = {}): EvaluationResult {
  const scored = scoreListing(raw);
  const requiredFields = requiredFieldChecklist(raw);
  const recommendations = buildRecommendations(raw, scored, opts.textDeliverables ?? false);
  const state: 'gaps' | 'full' =
    recommendations.filter((r) => r.key !== 'video').length === 0 ? 'full' : 'gaps';

  return {
    listingId: raw.listing_id,
    fetchedAt: new Date().toISOString(),
    identity: {
      title: scored.title,
      imageUrl: raw.images?.[0]?.url_570xN ?? null,
      shopNote: 'read from your public listing',
    },
    requiredFields,
    requiredPass: requiredFields.every((f) => f.present),
    recommendedInUse: scored.completeness,
    state,
    recommendations,
    sampleTitle: composeSampleTitle(raw),
    scored,
  };
}
