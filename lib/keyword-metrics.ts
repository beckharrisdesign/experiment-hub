import type { ErankValues, KeywordToolValues, ErankMonth } from "@/types";

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
  source: Pick<ErankValues, "foundVia"> | null,
): number {
  if (!source) return 0;
  return source.foundVia.reduce((sum, hit) => sum + hit.tagOccurrences, 0);
}

/**
 * Searches per unit of competition. Higher is a less crowded opportunity.
 *
 * Reads the MERGED eRank values, so it renders wherever searches and
 * competition are both known — even when they came from different eRank
 * tools. That is 2,078 rows against 1,931 before the merge.
 *
 * `censored` propagates: 114 of the rows that gain a ratio rest on a capped
 * searches figure, where the true ratio is an upper bound rather than a
 * value. Rendering that as an exact number would be the same fabrication the
 * corpus forbids everywhere else, so the flag travels and the caller prefixes
 * a `<`.
 *
 * `null` when there is no eRank data, when either side is missing, or when
 * competition is 0 — none of those has a real ratio, and a 0 here would sort
 * as the most crowded keyword possible.
 */
export function demandRatio(
  source: Pick<
    ErankValues,
    "searches" | "searchesCensored" | "competition"
  > | null,
): { value: number; censored: boolean } | null {
  if (!source || source.searches === null || !source.competition) return null;
  return {
    value: source.searches / source.competition,
    censored: source.searchesCensored,
  };
}


/**
 * The month a keyword's eRank series peaks, with the peak value — or null
 * when there is no series. Ties go to the earliest month, which is also
 * what the chart shows first.
 */
export function historyPeak(
  erank: { history: ErankMonth[] | null } | null,
): ErankMonth | null {
  const h = erank?.history;
  if (!h || h.length === 0) return null;
  return h.reduce((best, m) => (m.searches > best.searches ? m : best), h[0]);
}

/** How many months of the series read above eRank's `< 20` floor. */
export function monthsAboveFloor(
  erank: { history: ErankMonth[] | null } | null,
): number | null {
  const h = erank?.history;
  if (!h || h.length === 0) return null;
  return h.filter((m) => m.searches > 20).length;
}

const SPARK = "▁▂▃▄▅▆▇█";

/**
 * A text sparkline of the series, one glyph per month, scaled to the
 * series' own peak. Text, not a graphic: it obeys the table's one-type-size,
 * no-colour rules and survives the CSV export as-is. A flat series is a row
 * of the lowest glyph, which is the honest picture of `< 20` everywhere.
 */
export function historySparkline(
  erank: { history: ErankMonth[] | null } | null,
): string | null {
  const h = erank?.history;
  if (!h || h.length === 0) return null;
  const peak = Math.max(...h.map((m) => m.searches));
  if (peak <= 0) return SPARK[0].repeat(h.length);
  return h
    .map((m) => SPARK[Math.min(SPARK.length - 1, Math.round((m.searches / peak) * (SPARK.length - 1)))])
    .join("");
}
