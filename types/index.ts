export type ExperimentStatus =
  | "Active"
  | "Completed"
  | "Abandoned"
  | "On Hold"
  | "Archived"
  | "Graduated";
/** Product vs workflow tool (no market table or hub score / no `scores` in JSON) vs personal R&D. Defaults to commercial when omitted. */
export type ExperimentKind = "commercial" | "tool" | "personal";
export type PrototypeStatus = "Active" | "Completed" | "Abandoned";
export type ValidationStatus = "not_started" | "planned" | "live" | "complete";

export interface ExperimentScores {
  businessOpportunity: number; // 1-5: Market potential and revenue opportunity (see agents/scoring-criteria.md)
  personalImpact: number; // 1-5: Would I personally use/benefit from this? (see agents/scoring-criteria.md)
  competitiveAdvantage: number; // 1-5: Market competition and differentiation (see agents/scoring-criteria.md)
  platformCost: number; // 1-5: Solo buildability with AI tools (Cursor) + infrastructure complexity (see agents/scoring-criteria.md)
  socialImpact: number; // 1-5: Fun, joy, and whether the world needs this (see agents/scoring-criteria.md)
}

/** Optional rationale for score dimensions (displayed on experiment Overview). */
export interface ScoreRationale {
  businessOpportunity?: string;
  personalImpact?: string;
  socialImpact?: string;
}

/**
 * v3 impact-proxy scores (rules/scoring-criteria.mdc): three 1-5 dimensions,
 * total 3-15. Lives alongside legacy `scores`; a row carrying both is
 * rendered from this shape.
 */
export interface ImpactScores {
  personal: number; // 1-5: would I use this?
  social: number; // 1-5: does the world need this?
  business: number; // 1-5: would the market pay, and could this win?
}

/**
 * Per-dimension justification content, synced from the `Why:` child pages of
 * the experiment's Notion row. Each value is the page's block content as
 * markdown-ish plain text (paragraph breaks preserved); absent when the page
 * doesn't exist.
 */
export interface ImpactRationale {
  personal?: string;
  social?: string;
  business?: string;
}

export interface ValidationLandingPage {
  status: ValidationStatus;
  url?: string; // URL to the production landing page
  landingDir?: string; // Directory containing the landing page code
  devPort?: number; // Port for development server
  notionPageId?: string; // Link to Notion page with validation results
}

export interface Experiment {
  id: string;
  name: string; // Short name/title of the experiment
  statement: string; // Full experiment statement
  type?: ExperimentKind;
  directory: string;
  documentationId: string;
  prototypeId: string;
  status: ExperimentStatus;
  createdDate: string;
  lastModified: string;
  tags: string[];
  /**
   * Public-visibility flag from the Notion `Public` checkbox. `false` means
   * the row is hidden from public routes (homepage table + detail page).
   * `undefined` for non-Notion sources (legacy Supabase/JSON rows), which
   * stay visible — only an explicit `false` hides a row.
   */
  public?: boolean;
  scores?: ExperimentScores; // v1 scoring, read-only history (1-5 for each of five dimensions)
  scoreRationale?: ScoreRationale; // Optional rationale for Business Opportunity, Personal Impact, Social Impact
  impactScores?: ImpactScores; // v3 impact-proxy scores; wins over `scores` when both exist
  impactRationale?: ImpactRationale; // Per-dimension justifications from Notion `Why:` pages
  validation?: ValidationLandingPage; // Landing page validation status
  /** OpenSpec change folder under openspec/changes/; defaults to experiment.id */
  openspecChangeId?: string;
  /** Workflow schema for linked change (e.g. bhd-experiment) */
  openspecSchema?: string;
  /** Set when status === "Graduated"; points to the linked repo the experiment lives in */
  linkedRepoId?: string;
}

export interface Prototype {
  id: string;
  title: string;
  description: string;
  linkPath: string;
  experimentId: string;
  status: PrototypeStatus;
  createdDate: string;
  lastModified: string;
  tags: string[];
  port?: number; // Port number for running prototype (e.g., 3001, 3002)
}

export interface Documentation {
  id: string;
  title: string;
  content: string;
  experimentId: string;
  createdDate: string;
  lastModified: string;
  tags: string[];
}

export type ContentType =
  | "experiments"
  | "prototypes"
  | "documentation"
  | "keyword-explorer";

/**
 * One query that surfaced a keyword, with the tag-occurrence count it
 * reported *there*.
 *
 * Tag occurrences are query-scoped and do not agree across queries: on
 * 2026-09-17 `embroidery font` read 6, 81, 80 and 12 under four different
 * queries while its searches, competition and KD were identical in all four.
 * Averaging or picking one would invent a number the export never gave, so
 * every count is kept beside the query that produced it.
 */
export interface KeywordQueryHit {
  query: string;
  tagOccurrences: number;
}

/**
 * Coverage is *seen in N of M captures* — never a rate of decline.
 *
 * Katy's exports are hand-filtered to drop obviously overcrowded keywords, so
 * the archive is not a census. A keyword absent from a later pull is
 * unexplained, not extinct, and nothing downstream may read a gap as a fall in
 * demand. This shape exists so that constraint is structural rather than a
 * convention someone has to remember.
 */
export interface KeywordCoverage {
  seen: number;
  of: number;
}

/**
 * One W&H listing ranking for a keyword's exact text, from an
 * `erank-spotted-on-etsy` pull.
 */
export interface RankedListingMatch {
  listing: string;
  page: number;
  position: number;
}

/**
 * A keyword's real-world search ranking, collapsed to its best (lowest)
 * position for sorting — with every matching listing retained underneath so
 * the collapse doesn't discard data. `null` means no observed ranking, never
 * a `0`: absence here is unexplained, not evidence of failing to rank.
 */
export interface RankedMatch {
  best: number;
  matches: RankedListingMatch[];
}

/** One current listing that carries a keyword as one of its tags. */
export interface TargetingListingMatch {
  listingId: number;
  slot: number;
}

/**
 * A keyword's presence in current listing tags, collapsed to the lowest
 * (earliest) tag slot (1–13) for sorting — every matching listing retained
 * underneath. `null` means not currently targeted, never a `0`.
 */
export interface TargetingMatch {
  best: number;
  matches: TargetingListingMatch[];
}

/**
 * Capture metadata every source sub-object carries.
 *
 * `history` holds every earlier capture of the same keyword for that source.
 * A repeat capture collapses to the newest (design.md decision 5, settled
 * 2026-09-20) — the earlier observations are kept here rather than discarded,
 * and are deliberately not surfaced in the table.
 */
export interface KeywordSourceCapture<TValues> {
  capture: string;
  current: boolean;
  supersededBy: string | null;
  history: (TValues & { capture: string })[];
}

/** eRank Keyword Tool: per-seed demand for a query. */
export interface KeywordToolValues {
  /**
   * `null` means the Keyword Tool never scored this field — never a
   * fabricated `0`, which would read as "measured, and it was none".
   */
  searches: number | null;
  competition: number | null;
  kd: number | null;
  foundVia: KeywordQueryHit[];
  coverage: KeywordCoverage;
}

/** eRank Bulk Keywords: related-term suggestions for a seed list. */
export interface BulkKeywordValues {
  /**
   * `null` means eRank never scored the field at all. A non-null value with
   * its `*Censored` flag set means the true value is *below* that number, not
   * equal to it — eRank capped it rather than reporting exactly. Neither is
   * ever coerced to 0.
   */
  avgSearches: number | null;
  avgSearchesCensored: boolean;
  avgClicks: number | null;
  avgClicksCensored: boolean;
  avgCtr: number | null;
  avgCtrCensored: boolean;
  etsyCompetition: number | null;
  kd: number | null;
}

/**
 * eRank Tag Report: scores a tag W&H already uses on a live listing — a third
 * instrument again, and the first to reach the page in this change.
 *
 * It encodes absence three ways: an empty cell, the literal string
 * `Unknown`, and a censored `< 20`. The first two both arrive here as `null`
 * and render identically (design.md decision, round 01) — only the censored
 * case is distinguishable, via its `*Censored` flag, because a cap is a
 * reported value rather than an absence.
 */
export interface TagReportValues {
  tagOccurrences: number | null;
  avgSearches: number | null;
  avgSearchesCensored: boolean;
  avgClicks: number | null;
  avgClicksCensored: boolean;
  avgCtr: number | null;
  avgCtrCensored: boolean;
  etsyCompetition: number | null;
  kd: number | null;
  googleSearches: number | null;
}

/**
 * A search term a buyer really typed, and the listing it reached.
 *
 * `visits` is Etsy's own number for that term on that listing — never
 * divided, spread or summed across listings. `etsyVisits` / `googleVisits`
 * are populated only where the export gave the split; most listings render a
 * two-column table with no split at all, and `null` there means "not
 * reported", not zero.
 *
 * The listing's own outcome travels with the term for convenience, but it
 * belongs to the LISTING: one visit from a term did not itself produce
 * `listingRevenueUsd`.
 */
export interface ShopSearchValues {
  visits: number | null;
  etsyVisits: number | null;
  googleVisits: number | null;
  listingId: string;
  listingTitle: string | null;
  listingVisits: number | null;
  listingItemsSold: number | null;
  listingRevenueUsd: number | null;
}

/**
 * A keyword Etsy matched an ad to — whether or not anyone arrived.
 *
 * `views` are IMPRESSIONS, not visits, and must never be added to or
 * rendered alongside `ShopSearchValues.visits` as though they were the same
 * measure. Scoped to the last 30 days, while the Shop band covers the year.
 */
export interface AdsKeywordValues {
  views: number | null;
  clicks: number | null;
  clickRatePct: number | null;
  spendUsd: number | null;
  revenueUsd: number | null;
  orders: number | null;
  roas: number | null;
  listingId: string;
}

export type KeywordToolSource = KeywordToolValues &
  KeywordSourceCapture<KeywordToolValues>;
export type BulkKeywordSource = BulkKeywordValues &
  KeywordSourceCapture<BulkKeywordValues>;
export type TagReportSource = TagReportValues &
  KeywordSourceCapture<TagReportValues>;

/**
 * One keyword, with every source that has data for it.
 *
 * One row per distinct keyword text, matched case-insensitive exact — no
 * stemming and no fuzzy join, so `snow globe` and `snow globes` stay two
 * rows. A source with no data for this keyword is `null`, never a zeroed-out
 * sub-object: absence and a measured zero are different claims, and the whole
 * corpus exists to keep them apart.
 *
 * A row exists if *any* source has the keyword, which is why a term W&H ranks
 * for that eRank never scored still appears (`keywordTool: null`, `ranked`
 * populated) — Katy, 2026-09-18: "add a row for the ranked keywords even if
 * they don't have entries from the erank data."
 */
export interface KeywordRow {
  keyword: string;
  keywordTool: KeywordToolSource | null;
  bulkKeywords: BulkKeywordSource | null;
  tagReport: TagReportSource | null;
  /** Captured demand — a term a buyer typed and the listing it reached. */
  shopSearch: ShopSearchValues | null;
  /** Etsy Ads — a keyword the ad was matched to. Impressions, not arrivals. */
  ads: AdsKeywordValues | null;
  /** From the corpus. Keyword-scoped, not capture-scoped. */
  ranked: RankedMatch | null;
  /**
   * Computed server-side, per request, against live listing snapshots — not
   * part of the static corpus. `null` means no match OR the Supabase
   * read failed (design.md § Decisions — a failure degrades to "no data").
   */
  targeting: TargetingMatch | null;
}

/**
 * `KeywordRow`, collapsed to what actually reaches `KeywordTable` — a client
 * component on a public, unauthenticated route. `toTableRows()`
 * (`lib/keyword-traction.ts`) is what performs this collapse; the page calls
 * it right before rendering, so `KeywordTable` only ever receives
 * `KeywordTableRow`, never a raw `KeywordRow`.
 *
 * Ranked and Targeting are collapsed to the sort value (`.best`) only; the
 * full per-listing detail (`RankedMatch.matches` — listing titles, pages,
 * positions; `TargetingMatch.matches` — live listing IDs and which of the
 * 13 tag slots they occupy) never leaves the server. The table only ever
 * renders the number, so there is no reason to serialize the shop's
 * tag-placement detail into the RSC payload for any anonymous visitor —
 * that data stays server-side, in `KeywordRow`, for a future detail
 * surface this change deliberately doesn't build (proposal.md § Not
 * doing).
 *
 * Deliberately an explicit field list, not `Omit<KeywordRow, "ranked" |
 * "targeting">` (round 12 finding): `Omit` is a denylist — it inherits every
 * other `KeywordRow` field automatically, so a server-only field added to
 * `KeywordRow` in a future change would silently start flowing to this
 * public client component's props too, with nothing here forcing whoever
 * adds it to notice. An explicit allowlist means a new `KeywordRow` field
 * simply doesn't exist on `KeywordTableRow` until someone deliberately adds
 * it here — the safer failure mode for a public-route data boundary.
 */
export interface KeywordTableRow {
  keyword: string;
  /**
   * The newest Keyword Tool capture for this keyword, or `null` when no
   * Keyword Tool data exists. A single scalar, deliberately not the whole
   * capture record: the Capture filter needs it, and nothing else does.
   *
   * There is no `current` counterpart. Collapsing to the newest capture
   * (design.md decision 5) makes every visible row current by construction,
   * so a current/superseded filter would match everything — it was dropped
   * rather than left on screen doing nothing.
   */
  capture: string | null;
  keywordTool: KeywordToolValues | null;
  bulkKeywords: BulkKeywordValues | null;
  tagReport: TagReportValues | null;
  shopSearch: ShopSearchValues | null;
  ads: AdsKeywordValues | null;
  ranked: number | null;
  targeting: number | null;
}

export interface KeywordCapture {
  date: string;
  source: string;
  queries: string[];
}

export interface KeywordCorpus {
  generatedAt: string | null;
  captures: KeywordCapture[];
  rows: KeywordRow[];
}

export type PullRequestState = "open" | "closed" | "merged";

export interface ExperimentPullRequest {
  id: string;
  experimentId: string | null;
  linkedRepoId: string | null;
  repo: string;
  prNumber: number;
  title: string;
  state: PullRequestState;
  url: string;
  branch: string;
  author: string;
  labels: string[];
  openedAt: string;
  mergedAt: string | null;
  syncedAt: string;
}

export interface LinkedRepo {
  id: string;
  name: string;
  repoSlug: string;
  description: string | null;
  worktreePath: string | null;
  createdAt: string;
  updatedAt: string;
}
