import type {
  AdsKeywordValues,
  BulkKeywordValues,
  KeywordCapture,
  KeywordCorpus,
  KeywordRow,
  KeywordToolValues,
  RankedMatch,
  ShopSearchValues,
  TagReportValues,
  ErankValues,
} from "@/types";
import raw from "@/data/keyword-corpus.json";

/**
 * The corpus as `scripts/ingest-pulls.py --apply` writes it.
 *
 * Snake_case because it is written by the same Python run that writes
 * `docs/pulls/index.json`, which is snake_case for the same reason. The
 * boundary is normalised here rather than in the generator so the file stays
 * idiomatic on the side that produces it.
 */
interface RawQueryHit {
  query: string;
  tag_occurrences: number;
}

interface RawRankedMatch {
  best: number;
  matches: { listing: string; page: number; position: number }[];
}

interface RawCapture {
  capture: string;
  current: boolean;
  superseded_by: string | null;
}

interface RawKeywordTool {
  searches: number | null;
  competition: number | null;
  kd: number | null;
  found_via: RawQueryHit[];
  coverage: { seen: number; of: number };
}

interface RawBulk {
  avg_searches: number | null;
  avg_searches_censored: boolean;
  avg_clicks: number | null;
  avg_clicks_censored: boolean;
  avg_ctr: number | null;
  avg_ctr_censored: boolean;
  etsy_competition: number | null;
  kd: number | null;
}

interface RawTagReport extends RawBulk {
  tag_occurrences: number | null;
  google_searches: number | null;
}

interface RawShopSearch {
  visits: number | null;
  etsy_visits: number | null;
  google_visits: number | null;
  listing_id: string;
  listing_title: string | null;
  listing_visits: number | null;
  listing_items_sold: number | null;
  listing_revenue_usd: number | null;
}

interface RawAds {
  views: number | null;
  clicks: number | null;
  click_rate_pct: number | null;
  spend_usd: number | null;
  revenue_usd: number | null;
  orders: number | null;
  roas: number | null;
  listing_id: string;
}

interface RawRow {
  keyword: string;
  shop_search: RawShopSearch | null;
  ads: RawAds | null;
  keyword_tool: (RawKeywordTool & RawCapture & { history: (RawKeywordTool & { capture: string })[] }) | null;
  bulk_keywords: (RawBulk & RawCapture & { history: (RawBulk & { capture: string })[] }) | null;
  tag_report: (RawTagReport & RawCapture & { history: (RawTagReport & { capture: string })[] }) | null;
  ranked: RawRankedMatch | null;
}

interface RawCorpus {
  generated_at?: string | null;
  captures?: KeywordCapture[];
  rows?: RawRow[];
}

/**
 * Exported so the snake_case -> camelCase mapping is directly testable at
 * the loader boundary — a bug in this mapping (a typo'd field, a dropped
 * match) would otherwise stay invisible until a real pull overlaps the
 * corpus.
 */
export function toRankedMatch(
  input: RawRankedMatch | null,
): RankedMatch | null {
  if (!input) return null;
  return {
    best: input.best,
    matches: input.matches.map((m) => ({
      listing: m.listing,
      page: m.page,
      position: m.position,
    })),
  };
}

function toKeywordToolValues(r: RawKeywordTool): KeywordToolValues {
  return {
    searches: r.searches,
    competition: r.competition,
    kd: r.kd,
    foundVia: (r.found_via ?? []).map((hit) => ({
      query: hit.query,
      tagOccurrences: hit.tag_occurrences,
    })),
    coverage: r.coverage ?? { seen: 1, of: 1 },
  };
}

function toBulkValues(r: RawBulk): BulkKeywordValues {
  return {
    avgSearches: r.avg_searches,
    avgSearchesCensored: r.avg_searches_censored,
    avgClicks: r.avg_clicks,
    avgClicksCensored: r.avg_clicks_censored,
    avgCtr: r.avg_ctr,
    avgCtrCensored: r.avg_ctr_censored,
    etsyCompetition: r.etsy_competition,
    kd: r.kd,
  };
}

function toTagReportValues(r: RawTagReport): TagReportValues {
  return {
    ...toBulkValues(r),
    tagOccurrences: r.tag_occurrences,
    googleSearches: r.google_searches,
  };
}

/** Wraps a per-source values mapper with the shared capture metadata. */
function toSource<TRaw, TValues>(
  input: (TRaw & RawCapture & { history: (TRaw & { capture: string })[] }) | null,
  values: (r: TRaw) => TValues,
): (TValues & RawCaptureCamel<TValues>) | null {
  if (!input) return null;
  return {
    ...values(input),
    capture: input.capture,
    current: input.current,
    supersededBy: input.superseded_by ?? null,
    history: (input.history ?? []).map((h) => ({
      ...values(h),
      capture: h.capture,
    })),
  };
}

type RawCaptureCamel<TValues> = {
  capture: string;
  current: boolean;
  supersededBy: string | null;
  history: (TValues & { capture: string })[];
};

function toShopSearch(r: RawShopSearch | null): ShopSearchValues | null {
  if (!r) return null;
  return {
    visits: r.visits,
    etsyVisits: r.etsy_visits,
    googleVisits: r.google_visits,
    listingId: r.listing_id,
    listingTitle: r.listing_title,
    listingVisits: r.listing_visits,
    listingItemsSold: r.listing_items_sold,
    listingRevenueUsd: r.listing_revenue_usd,
  };
}

function toAds(r: RawAds | null): AdsKeywordValues | null {
  if (!r) return null;
  return {
    views: r.views,
    clicks: r.clicks,
    clickRatePct: r.click_rate_pct,
    spendUsd: r.spend_usd,
    revenueUsd: r.revenue_usd,
    orders: r.orders,
    roas: r.roas,
    listingId: r.listing_id,
  };
}

interface RawErank {
  searches: number | null;
  searches_censored: boolean;
  competition: number | null;
  kd: number | null;
  avg_clicks: number | null;
  avg_clicks_censored: boolean;
  avg_ctr: number | null;
  avg_ctr_censored: boolean;
  google_searches: number | null;
  tag_occurrences: number | null;
  found_via: { query: string; tag_occurrences: number }[];
  reported_by: string[];
  history?: { month: string; label: string; searches: number }[] | null;
  history_capture?: string | null;
}

function toErank(r: RawErank | null | undefined): ErankValues | null {
  if (!r) return null;
  return {
    searches: r.searches,
    searchesCensored: r.searches_censored,
    competition: r.competition,
    kd: r.kd,
    avgClicks: r.avg_clicks,
    avgClicksCensored: r.avg_clicks_censored,
    avgCtr: r.avg_ctr,
    avgCtrCensored: r.avg_ctr_censored,
    googleSearches: r.google_searches,
    tagOccurrences: r.tag_occurrences,
    foundVia: (r.found_via ?? []).map((h) => ({
      query: h.query,
      tagOccurrences: h.tag_occurrences,
    })),
    reportedBy: r.reported_by ?? [],
    history: r.history
      ? r.history.map((m) => ({ month: m.month, label: m.label, searches: m.searches }))
      : null,
    historyCapture: r.history_capture ?? null,
  };
}

function toRow(row: RawRow): KeywordRow {
  return {
    keyword: row.keyword,
    erank: toErank((row as RawRow & { erank?: RawErank | null }).erank),
    shopSearch: toShopSearch(row.shop_search ?? null),
    ads: toAds(row.ads ?? null),
    keywordTool: toSource(row.keyword_tool, toKeywordToolValues),
    bulkKeywords: toSource(row.bulk_keywords, toBulkValues),
    tagReport: toSource(row.tag_report, toTagReportValues),
    ranked: toRankedMatch(row.ranked ?? null),
    // Computed server-side against live listing snapshots — the static
    // corpus carries no opinion on it. The page merges the real value in.
    targeting: null,
  };
}

/**
 * Read at module scope from a static import — no runtime filesystem access, so
 * there is nothing here to fail on Vercel (tasks.md §3.6).
 */
export function loadKeywordCorpus(): KeywordCorpus {
  const corpus = raw as RawCorpus;
  return {
    generatedAt: corpus.generated_at ?? null,
    captures: corpus.captures ?? [],
    rows: (corpus.rows ?? []).map(toRow),
  };
}

/**
 * Re-exported for server-side callers that already import it from here.
 * It now lives in `lib/keyword-metrics.ts` so client components can use it
 * without pulling this module's corpus JSON import into the browser bundle.
 */
export { bulkValueLabel } from "@/lib/keyword-metrics";

/**
 * Coverage as a label, never as a trend.
 *
 * Reads "seen in 2 of 3 captures". There is deliberately no function here that
 * turns coverage into a delta, a percentage drop, or a "disappeared" flag: the
 * exports are hand-filtered, so absence is unexplained rather than evidence.
 */
export function coverageLabel(source: KeywordToolValues | null): string {
  if (!source) return "—";
  return `seen in ${source.coverage.seen} of ${source.coverage.of}`;
}
