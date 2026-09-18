import type { KeywordCapture, KeywordCorpus, KeywordRow } from "@/types";
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

interface RawRow {
  keyword: string;
  capture: string;
  searches: number;
  competition: number;
  kd: number;
  found_via: RawQueryHit[];
  current: boolean;
  superseded_by: string | null;
  coverage: { seen: number; of: number };
}

interface RawCorpus {
  generated_at?: string | null;
  captures?: KeywordCapture[];
  rows?: RawRow[];
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

/** Total tag occurrences across the queries that surfaced a keyword.
 *
 * A convenience for sorting only. It is deliberately NOT presented as "the"
 * tag-occurrence number for a keyword — the per-query counts are the data, and
 * the table shows them individually.
 */
export function totalTagOccurrences(row: KeywordRow): number {
  return row.foundVia.reduce((sum, hit) => sum + hit.tagOccurrences, 0);
}

/** Searches per unit of competition. Higher is a less crowded opportunity. */
export function demandRatio(row: KeywordRow): number | null {
  if (!row.competition) return null;
  return row.searches / row.competition;
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
