/**
 * Listing brief — the wording pipeline's middle step (design decisions 27/30,
 * Figma 02.26 wording-provenance frame).
 *
 * Deterministic, verbatim extraction from the listing's own fields. Every
 * phrase names its source, because generated scene copy may quote ONLY this
 * brief — an invented phrase downstream is a defect (spec: "Scene copy is
 * traceable"). No model runs here; grounded LLM composition consumes the
 * brief (composer.ts) but never feeds it.
 */

import type { RawListing } from '../etsy-scorecard';

export type BriefSource = 'title' | 'description' | 'tag' | 'alt_text' | 'api_fact';

export interface BriefPhrase {
  /** Verbatim text as it appears in the listing (trimmed only). */
  text: string;
  source: BriefSource;
  /** For api_fact: which field(s) the fact restates (e.g. "when_made"). */
  field?: string;
}

export interface ListingBrief {
  listingId: number;
  /** What the listing is — always the title, verbatim. */
  what: BriefPhrase;
  /** Restated API facts (price, made-to-order, processing, stock). */
  facts: BriefPhrase[];
  /** Marketing-usable wording: tags, alt texts, a non-trivial description lead. */
  phrases: BriefPhrase[];
  photoCount: number;
  /**
   * True when the listing offers no usable wording beyond its title — cards
   * then carry facts only, and the composer gets nothing to embellish with.
   */
  wordingThin: boolean;
}

/** Price arrives on snapshots as Etsy's money shape; RawListing omits it. */
export interface BriefInput extends RawListing {
  price?: { amount: number; divisor: number; currency_code?: string | null } | null;
  when_made?: string | null;
}

/** Descriptions like "TBD" are placeholders, not wording (keychain fixture). */
const PLACEHOLDER_DESCRIPTION = /^(tbd|todo|tba|n\/a|coming soon|xxx+|\.+|-+)$/i;
const MIN_DESCRIPTION_CHARS = 20;

function descriptionLead(description: string): string | null {
  const trimmed = description.trim();
  if (trimmed.length < MIN_DESCRIPTION_CHARS || PLACEHOLDER_DESCRIPTION.test(trimmed)) return null;
  // First sentence, verbatim; capped so a wall of text stays quotable.
  const sentence = trimmed.split(/(?<=[.!?])\s+/)[0].trim();
  return sentence.length > 200 ? null : sentence;
}

function formatPrice(price: NonNullable<BriefInput['price']>): string {
  const value = price.amount / (price.divisor || 100);
  const code = (price.currency_code || 'USD').toUpperCase();
  const symbol = code === 'USD' ? '$' : `${code} `;
  return `${symbol}${value.toFixed(2)}`;
}

export function buildBrief(listing: BriefInput): ListingBrief {
  const facts: BriefPhrase[] = [];
  if (listing.price && listing.price.amount > 0) {
    facts.push({ text: formatPrice(listing.price), source: 'api_fact', field: 'price' });
  }
  if (listing.when_made === 'made_to_order') {
    facts.push({ text: 'made to order', source: 'api_fact', field: 'when_made' });
  }
  if (typeof listing.processing_min === 'number' && listing.processing_min > 0) {
    facts.push({ text: `ships in ${listing.processing_min}+ days`, source: 'api_fact', field: 'processing_min' });
  }
  if (typeof listing.quantity === 'number' && listing.quantity > 0) {
    facts.push({ text: `${listing.quantity} available`, source: 'api_fact', field: 'quantity' });
  }

  const phrases: BriefPhrase[] = [];
  for (const tag of listing.tags ?? []) {
    const text = tag.trim();
    if (text) phrases.push({ text, source: 'tag' });
  }
  const lead = listing.description ? descriptionLead(listing.description) : null;
  if (lead) phrases.push({ text: lead, source: 'description' });
  for (const image of listing.images ?? []) {
    const alt = image.alt_text?.trim();
    if (alt) phrases.push({ text: alt, source: 'alt_text' });
  }

  return {
    listingId: listing.listing_id,
    what: { text: (listing.title ?? '').trim(), source: 'title' },
    facts,
    phrases,
    photoCount: listing.images?.length ?? 0,
    wordingThin: phrases.length === 0,
  };
}

/**
 * Provenance check for generated card copy (QA 4.6): a candidate string is
 * traceable when it appears verbatim inside the title, a fact, or a phrase —
 * case-insensitively, so display casing (eyebrows render uppercase) passes.
 */
export function isTraceable(brief: ListingBrief, candidate: string): boolean {
  const needle = candidate.trim().toLowerCase();
  if (!needle) return false;
  const haystacks = [brief.what, ...brief.facts, ...brief.phrases].map((p) => p.text.toLowerCase());
  return haystacks.some((h) => h.includes(needle) || needle.includes(h));
}
