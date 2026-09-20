import type {
  BulkKeywordRow,
  KeywordCapture,
  KeywordCorpus,
  KeywordRow,
  RankedMatch,
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

interface RawRow {
  keyword: string;
  capture: string;
  searches: number | null;
  competition: number | null;
  kd: number | null;
  found_via: RawQueryHit[];
  current: boolean;
  superseded_by: string | null;
  coverage: { seen: number; of: number };
  ranked: RawRankedMatch | null;
}

interface RawBulkRow {
  keyword: string;
  capture: string;
  avg_searches: number | null;
  avg_searches_censored: boolean;
  avg_clicks: number | null;
  avg_clicks_censored: boolean;
  avg_ctr: number | null;
  avg_ctr_censored: boolean;
  etsy_competition: number | null;
  kd: number | null;
  current: boolean;
  superseded_by: string | null;
}

interface RawCorpus {
  generated_at?: string | null;
  captures?: KeywordCapture[];
  rows?: RawRow[];
  bulk_keywords?: { rows?: RawBulkRow[] };
}

/**
 * Exported so the snake_case -> camelCase mapping is directly testable at
 * the loader boundary — the checked-in corpus is currently all `ranked:
 * null`, so a bug in this mapping (a typo'd field, a dropped match) would
 * otherwise stay invisible until a real pull overlaps the corpus.
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

function toRow(row: RawRow): KeywordRow {
  return {
    keyword: row.keyword,
    capture: row.capture,
    searches: row.searches,
    competition: row.competition,
    kd: row.kd,
    foundVia: (row.found_via ?? []).map((hit) => ({
      query: hit.query,
      tagOccurrences: hit.tag_occurrences,
    })),
    current: row.current,
    supersededBy: row.superseded_by ?? null,
    coverage: row.coverage ?? { seen: 1, of: 1 },
    ranked: toRankedMatch(row.ranked ?? null),
    // Computed server-side against live listing snapshots — the static
    // corpus carries no opinion on it. The page merges the real value in.
    targeting: null,
  };
}

function toBulkRow(row: RawBulkRow): BulkKeywordRow {
  return {
    keyword: row.keyword,
    capture: row.capture,
    avgSearches: row.avg_searches,
    avgSearchesCensored: row.avg_searches_censored,
    avgClicks: row.avg_clicks,
    avgClicksCensored: row.avg_clicks_censored,
    avgCtr: row.avg_ctr,
    avgCtrCensored: row.avg_ctr_censored,
    etsyCompetition: row.etsy_competition,
    kd: row.kd,
    current: row.current,
    supersededBy: row.superseded_by ?? null,
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
    bulkKeywordRows: (corpus.bulk_keywords?.rows ?? []).map(toBulkRow),
  };
}

/**
 * A Bulk Keywords cell as text: "—" when unscored, "< N" when eRank capped
 * it rather than reporting an exact value, the plain number otherwise.
 * Never renders 0 for either case — see `BulkKeywordRow`'s own doc comment.
 */
export function bulkValueLabel(
  value: number | null,
  censored: boolean,
): string {
  if (value === null) return "—";
  const text = value.toLocaleString();
  return censored ? `< ${text}` : text;
}

/**
 * Coverage as a label, never as a trend.
 *
 * Reads "seen in 2 of 3 captures". There is deliberately no function here that
 * turns coverage into a delta, a percentage drop, or a "disappeared" flag: the
 * exports are hand-filtered, so absence is unexplained rather than evidence.
 */
export function coverageLabel(row: KeywordRow): string {
  return `seen in ${row.coverage.seen} of ${row.coverage.of}`;
}
