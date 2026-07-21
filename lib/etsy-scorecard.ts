/**
 * Listing-completeness scoring for the etsy-notion-sync experiment surface
 * (openspec/changes/etsy-zero-sales-funnel).
 *
 * Pure functions only — no I/O, no Supabase, no fetch. The server component
 * reads snapshots (`getLatestListingSnapshots` in lib/etsy-sync.ts, which owns
 * the service-role client) and passes raw listing JSON through `scoreListing`,
 * then orders the results with `rankFixPriority`. Keeping this module I/O-free
 * is what makes the thresholds unit-testable without a database.
 *
 * Two tiers, per design decision 4:
 *   Tier A — publishable gate. Binary. A listing failing any Tier-A criterion
 *            cannot sell, so the reason is surfaced verbatim.
 *   Tier B — completeness percentage. Every *applicable* criterion counts
 *            equally (design 11a: the denominator is static — criteria that
 *            currently fail on 100% of listings are NOT dropped, because a
 *            dynamic denominator would make one listing's score move when a
 *            different listing changes).
 */

// ---------------------------------------------------------------------------
// Raw shape (only the fields we score; the snapshot carries far more)
// ---------------------------------------------------------------------------

export interface RawListingImage {
  alt_text?: string | null;
}

export interface RawListing {
  listing_id: number;
  title?: string | null;
  description?: string | null;
  state?: string | null;
  listing_type?: string | null;
  views?: number | null;
  num_favorers?: number | null;
  quantity?: number | null;
  tags?: string[] | null;
  materials?: string[] | null;
  style?: string[] | null;
  images?: RawListingImage[] | null;
  videos?: unknown[] | null;
  shipping_profile_id?: number | null;
  processing_min?: number | null;
  return_policy_id?: number | null;
}

// ---------------------------------------------------------------------------
// Tunable thresholds (design decision 4)
// ---------------------------------------------------------------------------

export const SCORECARD_DEFAULTS = {
  /** Etsy allows 10 photos; using all of them is the recommended maximum. */
  photos: 10,
  /** Etsy allows 13 tags; using fewer leaves search coverage on the table. */
  tags: 13,
  /** Per-tag character cap. */
  tagMaxLength: 20,
  /** Etsy's hard title cap. */
  titleMaxLength: 140,
  /** Below this, a title is too thin to carry search keywords. */
  titleMinLength: 40,
  /** Etsy allows 13 materials. */
  materials: 13,
  /** Two style values is Etsy's cap. */
  styles: 2,
  /** Descriptions shorter than this read as unfinished. */
  descriptionMinLength: 160,
} as const;

/** `listing_type` values that are digital downloads (no shipping/materials). */
const DIGITAL_TYPES = new Set(["download"]);

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface TierAFailure {
  /** Stable machine key, e.g. "no_photo". */
  key: string;
  /** Human reason, rendered verbatim in the UI. */
  reason: string;
}

export interface TierBCriterion {
  key: string;
  /** Short label for the condensed "unmet" cell. */
  label: string;
  met: boolean;
}

export interface ScoredListing {
  listingId: number;
  title: string;
  /** True when `listing_type` is a digital download. */
  isDigital: boolean;
  /** Raw Etsy state, e.g. "active" | "draft" | "inactive". */
  state: string;
  isDraft: boolean;
  views: number;
  favorites: number;
  /** Tier A — empty array means publishable. */
  blockers: TierAFailure[];
  publishable: boolean;
  /** Tier B — every applicable criterion, met or not. */
  criteria: TierBCriterion[];
  unmet: TierBCriterion[];
  /** 0-100, rounded. Denominator is `criteria.length`. */
  completeness: number;
  /**
   * How far this listing's *search inputs* fall short — the primary ranking
   * key (design 11b). Higher means more improvable discoverability.
   */
  discoverabilityGap: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function arr<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// Tier A — publishable gate
// ---------------------------------------------------------------------------

function tierA(raw: RawListing, isDigital: boolean): TierAFailure[] {
  const failures: TierAFailure[] = [];

  if (arr(raw.images).length === 0) {
    failures.push({ key: "no_photo", reason: "No photo" });
  }
  if (!str(raw.title).trim()) {
    failures.push({ key: "no_title", reason: "No title" });
  }
  if (!str(raw.description).trim()) {
    failures.push({ key: "no_description", reason: "No description" });
  }
  // Digital downloads are not stocked, so quantity is not a gate for them.
  if (!isDigital && num(raw.quantity) <= 0) {
    failures.push({ key: "no_quantity", reason: "Quantity 0" });
  }
  // Physical listings cannot ship without a shipping profile.
  if (!isDigital && !raw.shipping_profile_id) {
    failures.push({ key: "no_shipping", reason: "No shipping profile" });
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Tier B — completeness criteria
// ---------------------------------------------------------------------------

function tierB(raw: RawListing, isDigital: boolean): TierBCriterion[] {
  const d = SCORECARD_DEFAULTS;
  const images = arr(raw.images);
  const tags = arr(raw.tags);
  const title = str(raw.title);

  const criteria: TierBCriterion[] = [
    {
      key: "photos",
      label: `+${Math.max(0, d.photos - images.length)} photos`,
      met: images.length >= d.photos,
    },
    {
      key: "tags",
      label:
        tags.length === 0
          ? "0 tags"
          : `${tags.length} tags (${d.tags - tags.length} short)`,
      met: tags.length >= d.tags,
    },
    {
      key: "tag_length",
      label: "Tag over 20 chars",
      met: tags.every((t) => str(t).length <= d.tagMaxLength),
    },
    {
      key: "title_length",
      label: title.length > d.titleMaxLength ? "Title too long" : "Title too short",
      met: title.length >= d.titleMinLength && title.length <= d.titleMaxLength,
    },
    {
      key: "description_length",
      label: "Description too short",
      met: str(raw.description).length >= d.descriptionMinLength,
    },
    {
      key: "alt_text",
      label: "No alt text",
      met: images.length > 0 && images.every((i) => !!str(i?.alt_text).trim()),
    },
    {
      key: "video",
      label: "No video",
      met: arr(raw.videos).length > 0,
    },
    {
      key: "styles",
      label: "No styles",
      met: arr(raw.style).length >= d.styles,
    },
  ];

  // Physical-only criteria — excluded from the denominator for digital
  // downloads rather than counted as failures (design decision 5).
  if (!isDigital) {
    criteria.push(
      {
        key: "materials",
        label: "No materials",
        met: arr(raw.materials).length > 0,
      },
      {
        key: "processing_time",
        label: "No processing time",
        met: num(raw.processing_min) > 0,
      },
      {
        key: "return_policy",
        label: "No return policy",
        met: !!raw.return_policy_id,
      },
    );
  }

  return criteria;
}

// ---------------------------------------------------------------------------
// Discoverability gap — the primary ranking key (design 11b)
// ---------------------------------------------------------------------------

/**
 * How far a listing's search inputs fall short. Tags dominate because they are
 * Etsy's primary search surface; a thin title contributes a smaller amount.
 *
 * Deliberately a plain additive score rather than a weighted model: with the
 * current data it separates only a handful of listings (see design risks), and
 * it needs to stay legible enough to re-tune in one edit as the shop changes.
 */
export function discoverabilityGap(raw: RawListing): number {
  const d = SCORECARD_DEFAULTS;
  const tags = arr(raw.tags);
  const title = str(raw.title);

  const tagGap = Math.max(0, d.tags - tags.length);
  const titleGap = title.length < d.titleMinLength ? 1 : 0;

  return tagGap + titleGap;
}

// ---------------------------------------------------------------------------
// scoreListing
// ---------------------------------------------------------------------------

export function scoreListing(raw: RawListing): ScoredListing {
  const isDigital = DIGITAL_TYPES.has(str(raw.listing_type));
  const state = str(raw.state) || "unknown";

  const blockers = tierA(raw, isDigital);
  const criteria = tierB(raw, isDigital);
  const unmet = criteria.filter((c) => !c.met);
  const met = criteria.length - unmet.length;

  return {
    listingId: raw.listing_id,
    title: str(raw.title),
    isDigital,
    state,
    isDraft: state === "draft",
    views: num(raw.views),
    favorites: num(raw.num_favorers),
    blockers,
    publishable: blockers.length === 0,
    criteria,
    unmet,
    completeness: criteria.length === 0 ? 0 : Math.round((met / criteria.length) * 100),
    discoverabilityGap: discoverabilityGap(raw),
  };
}

// ---------------------------------------------------------------------------
// rankFixPriority — the single source of order (design 9 + 11b)
// ---------------------------------------------------------------------------

/**
 * One ordering, used by BOTH the table's default sort and the fix-first card.
 *
 * Key order is normative (design 11b):
 *   discoverability gap ↓ → views ↓ → num_favorers ↓ → listing_id ↑
 *
 * Views lead nothing: this shop has ~105 total views across 25 listings, so
 * ordering by traffic amplifies noise. `listing_id` is a final tiebreak so the
 * order is stable across renders — without it, rows tied on every other key
 * would shuffle between loads and "fix-first == table top rows" would not hold.
 *
 * Does not mutate the input.
 */
export function rankFixPriority(scored: ScoredListing[]): ScoredListing[] {
  return [...scored].sort(
    (a, b) =>
      b.discoverabilityGap - a.discoverabilityGap ||
      b.views - a.views ||
      b.favorites - a.favorites ||
      a.listingId - b.listingId,
  );
}

/**
 * The literal top-N of `rankFixPriority` — never a separately-ranked list
 * (design 9's "highlights echo the set" rule).
 *
 * Drafts are excluded: a draft cannot sell, so "not publishable" on it is a
 * category label rather than a miss worth surfacing first (design 11c). They
 * remain in the full table with a state marker.
 */
export function topFixFirst(scored: ScoredListing[], n = 4): ScoredListing[] {
  return rankFixPriority(scored)
    .filter((l) => !l.isDraft)
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// Shop-level rollup (design 11a)
// ---------------------------------------------------------------------------

export interface ShopSummary {
  total: number;
  /** Excludes drafts — they cannot be publishable. */
  publishable: number;
  publishableOf: number;
  medianCompleteness: number;
  drafts: number;
  /**
   * Criteria unmet by EVERY scored listing. These are shop-level practice
   * gaps, surfaced once here rather than as N identical row flags.
   */
  systemicGaps: string[];
}

export function summarizeShop(scored: ScoredListing[]): ShopSummary {
  const live = scored.filter((l) => !l.isDraft);
  const drafts = scored.length - live.length;

  const sorted = [...scored].map((l) => l.completeness).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianCompleteness =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];

  // A gap is systemic only if every listing that the criterion applies to
  // fails it — so a digital-only shop never reports "materials" as systemic.
  const applicable = new Map<string, { label: string; total: number; unmet: number }>();
  for (const listing of scored) {
    for (const c of listing.criteria) {
      const entry = applicable.get(c.key) ?? { label: c.label, total: 0, unmet: 0 };
      entry.total += 1;
      if (!c.met) entry.unmet += 1;
      applicable.set(c.key, entry);
    }
  }
  const systemicGaps = [...applicable.entries()]
    .filter(([, v]) => v.total > 0 && v.unmet === v.total)
    .map(([key]) => key);

  return {
    total: scored.length,
    publishable: live.filter((l) => l.publishable).length,
    publishableOf: live.length,
    medianCompleteness,
    drafts,
    systemicGaps,
  };
}
