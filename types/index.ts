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

/** One keyword as observed in one capture. */
export interface KeywordRow {
  keyword: string;
  capture: string;
  searches: number;
  competition: number;
  kd: number;
  foundVia: KeywordQueryHit[];
  current: boolean;
  supersededBy: string | null;
  coverage: KeywordCoverage;
  /** From the corpus, refreshed by `ingest-pulls.py --apply`. */
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
  capture: string;
  searches: number;
  competition: number;
  kd: number;
  foundVia: KeywordQueryHit[];
  current: boolean;
  supersededBy: string | null;
  coverage: KeywordCoverage;
  ranked: number | null;
  targeting: number | null;
}

export interface KeywordCapture {
  date: string;
  source: string;
  queries: string[];
}

/**
 * One keyword from an eRank Bulk Keywords export — a different instrument
 * from the Keyword Tool above (related-term suggestions for a seed list, not
 * a per-seed demand table), with a value shape the Keyword Tool never
 * produces: a censored cap ("< 20") rather than a bare number or a blank.
 *
 * `null` means eRank never scored the field at all. A non-null value with
 * its `*Censored` flag set means the true value is *below* that number, not
 * equal to it — eRank capped it rather than reporting exactly. Neither is
 * ever coerced to 0, for the same reason `KeywordCoverage` never derives a
 * decline from an absence: a fabricated number would read as a real one.
 */
export interface BulkKeywordRow {
  keyword: string;
  capture: string;
  avgSearches: number | null;
  avgSearchesCensored: boolean;
  avgClicks: number | null;
  avgClicksCensored: boolean;
  avgCtr: number | null;
  avgCtrCensored: boolean;
  etsyCompetition: number | null;
  kd: number | null;
  current: boolean;
  supersededBy: string | null;
}

export interface KeywordCorpus {
  generatedAt: string | null;
  captures: KeywordCapture[];
  rows: KeywordRow[];
  bulkKeywordRows: BulkKeywordRow[];
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
