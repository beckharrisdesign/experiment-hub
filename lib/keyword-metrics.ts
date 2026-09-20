import type { KeywordRow } from "@/types";

/**
 * Client-safe by construction: this module has no import of
 * `@/data/keyword-corpus.json` (unlike `lib/keyword-corpus.ts`) or of anything
 * else that pulls live data into scope. `components/KeywordTable.tsx` is a
 * client component, and importing a function from a module means importing
 * that module's entire top-level import graph into the browser bundle — so
 * these two pure formatting helpers live here specifically so a client import
 * of them can never also drag in the full corpus JSON (or, in the future, any
 * other server-only data) it has nothing to do with.
 */

/** Total tag occurrences across the queries that surfaced a keyword.
 *
 * A convenience for sorting only. It is deliberately NOT presented as "the"
 * tag-occurrence number for a keyword — the per-query counts are the data, and
 * the table shows them individually.
 *
 * Takes only `foundVia` (a structural subset of `KeywordRow`), not the whole
 * row — so it works for `KeywordTableRow` too, without depending on the
 * `ranked`/`targeting` shape either type happens to carry.
 */
export function totalTagOccurrences(row: Pick<KeywordRow, "foundVia">): number {
  return row.foundVia.reduce((sum, hit) => sum + hit.tagOccurrences, 0);
}

/**
 * Searches per unit of competition. Higher is a less crowded opportunity.
 * `null` when either side is `null` (a ranked-only row with no Keyword Tool
 * data at all) as well as when competition is 0 — neither case has a real
 * ratio to report.
 */
export function demandRatio(
  row: Pick<KeywordRow, "searches" | "competition">,
): number | null {
  if (row.searches === null || !row.competition) return null;
  return row.searches / row.competition;
}
