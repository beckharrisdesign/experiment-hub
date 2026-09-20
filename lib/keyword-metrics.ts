import type { KeywordToolValues } from "@/types";

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

/**
 * A censored-or-absent cell as text: "—" when unscored, "< N" when eRank
 * capped it rather than reporting an exact value, the plain number otherwise.
 * Never renders 0 for either case.
 *
 * Lives here, not in `lib/keyword-corpus.ts`, for this module's whole reason
 * to exist: `keyword-corpus` statically imports the 1.3MB corpus JSON, and
 * `KeywordTable` is a client component — importing the formatter from there
 * would drag the entire corpus into the browser bundle alongside it.
 *
 * Shared by the Bulk Keywords and Tag Report column groups, which censor
 * identically. A second formatter would be a second place for the
 * never-fabricate-a-zero rule to drift.
 */
export function bulkValueLabel(
  value: number | null,
  censored: boolean,
): string {
  if (value === null) return "—";
  const text = value.toLocaleString();
  return censored ? `< ${text}` : text;
}

/** Total tag occurrences across the queries that surfaced a keyword.
 *
 * A convenience for sorting only. It is deliberately NOT presented as "the"
 * tag-occurrence number for a keyword — the per-query counts are the data, and
 * the table shows them individually.
 *
 * Takes the Keyword Tool sub-object, not the whole row, and accepts `null`
 * for it: since the merge, a row exists whenever *any* source has the
 * keyword, so most rows have no Keyword Tool data at all. `0` is the honest
 * total there — no query surfaced the keyword, which is a real count of
 * zero occurrences rather than a fabricated measurement.
 */
export function totalTagOccurrences(
  source: Pick<KeywordToolValues, "foundVia"> | null,
): number {
  if (!source) return 0;
  return source.foundVia.reduce((sum, hit) => sum + hit.tagOccurrences, 0);
}

/**
 * Searches per unit of competition. Higher is a less crowded opportunity.
 * `null` when there is no Keyword Tool sub-object at all, when either side is
 * `null`, or when competition is 0 — none of those has a real ratio to
 * report, and a 0 here would sort as the most crowded possible keyword.
 */
export function demandRatio(
  source: Pick<KeywordToolValues, "searches" | "competition"> | null,
): number | null {
  if (!source || source.searches === null || !source.competition) return null;
  return source.searches / source.competition;
}
