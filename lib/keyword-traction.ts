import type { RawListing } from "@/lib/etsy-scorecard";
import { getLatestListingSnapshots } from "@/lib/etsy-sync";
import type { KeywordRow, KeywordTableRow, TargetingMatch } from "@/types";

/**
 * Which of a listing's (up to 13) tag slots each corpus keyword occupies,
 * across every currently-active listing snapshot.
 *
 * Pure — no I/O, no Supabase — so it is unit-testable without a database,
 * mirroring `lib/etsy-scorecard.ts`. `withTargeting()` below is the I/O
 * wrapper: it owns fetching `snapshots` via `getLatestListingSnapshots()`
 * and calls this function with the result.
 *
 * Exact match only, case-insensitive, against a listing's `tags` array — not
 * its title. A tag slot number means nothing for a title hit, so title is out
 * of scope for this signal (proposal.md § Not doing).
 *
 * Two filters guard against a stale listing reading as "targeted":
 * `getLatestListingSnapshots()` already restricts to the most recent capture
 * run (a listing Etsy stopped returning at all is excluded there); the
 * `state === "active"` check here catches the narrower case of a listing
 * that *was* captured this run but isn't a live, sellable listing (draft,
 * inactive, expired) — matching the same field's use elsewhere
 * (`lib/etsy-listing-kit/evaluate.ts`).
 */
export function computeTargeting(
  keywords: string[],
  snapshots: RawListing[],
): Map<string, TargetingMatch> {
  const active = snapshots.filter((listing) => listing.state === "active");
  // Keyed by normalized tag text, not by slot — a listing's own tag can
  // recur at different slots across different listings, so the key has to
  // be what a keyword is actually looked up by (its text), with the
  // slot-per-listing detail living in the value.
  const matchesByTag = new Map<string, TargetingMatch["matches"]>();

  for (const listing of active) {
    const tags = listing.tags ?? [];
    tags.forEach((tag, index) => {
      const key = tag.trim().toLowerCase();
      if (!key) return;
      const existing = matchesByTag.get(key) ?? [];
      existing.push({ listingId: listing.listing_id, slot: index + 1 });
      matchesByTag.set(key, existing);
    });
  }

  const result = new Map<string, TargetingMatch>();
  for (const keyword of keywords) {
    const matches = matchesByTag.get(keyword.trim().toLowerCase());
    if (!matches || matches.length === 0) continue;
    const best = Math.min(...matches.map((m) => m.slot));
    result.set(keyword, { best, matches });
  }
  return result;
}

/**
 * Merges live Targeting onto corpus rows, degrading to blank (not stale or
 * thrown) on a Supabase failure.
 *
 * Lives here rather than in `app/keyword-explorer/page.tsx`: a Next.js
 * `page.tsx` is type-checked as a route module and may only export the
 * default component plus recognised segment config (`metadata`, `dynamic`,
 * …) — an arbitrary named export there fails Next's generated route-type
 * check even though `tsc`/`vitest` are both clean on it.
 *
 * The catch path explicitly sets every row's `targeting` to `null` rather
 * than returning `rows` unchanged — if a future caller ever passes rows that
 * already carry a real Targeting value (e.g. a second merge, a cache), a
 * failed read must still degrade to blank, not silently keep stale live
 * data.
 */
export async function withTargeting(rows: KeywordRow[]): Promise<KeywordRow[]> {
  try {
    const snapshots = await getLatestListingSnapshots();
    const targeting = computeTargeting(
      rows.map((r) => r.keyword),
      snapshots,
    );
    return rows.map((row) => ({
      ...row,
      targeting: targeting.get(row.keyword) ?? null,
    }));
  } catch (error) {
    console.error("keyword-explorer: Targeting read failed", error);
    return rows.map((row) => ({ ...row, targeting: null }));
  }
}

/**
 * Collapses `ranked`/`targeting` from their full `{best, matches}` shape to
 * `.best` alone — the boundary between server-side `KeywordRow` and the
 * client-component `KeywordTableRow`.
 *
 * `KeywordTable` is a client component on a public, unauthenticated route,
 * so whatever this function passes through gets serialized into the RSC
 * payload for any visitor. `matches` (live listing IDs, tag slots, ranked
 * listing titles/positions) is never read by the table — only `.best` is —
 * so it stays server-side rather than shipping to the browser for no reason.
 *
 * Projects each field explicitly rather than `{ ...row, ranked: ..., targeting: ... }`
 * (round 12 finding): `KeywordTableRow` is now an explicit allowlist, not an
 * `Omit`, specifically so a spread here can't silently carry a future
 * server-only `KeywordRow` field across this boundary — this function has to
 * agree with that allowlist by construction, not by remembering to.
 */
export function toTableRows(rows: KeywordRow[]): KeywordTableRow[] {
  return rows.map((row) => ({
    keyword: row.keyword,
    capture: row.keywordTool?.capture ?? null,
    // Each source is projected to its VALUES only — the capture metadata
    // (`capture`/`current`/`supersededBy`) and `history` stay server-side.
    // The table renders one collapsed row per keyword and deliberately says
    // nothing about repeat captures (design.md decision 5), so shipping that
    // metadata to a public client component would be payload for nothing.
    keywordTool: row.keywordTool
      ? {
          searches: row.keywordTool.searches,
          competition: row.keywordTool.competition,
          kd: row.keywordTool.kd,
          foundVia: row.keywordTool.foundVia,
          coverage: row.keywordTool.coverage,
        }
      : null,
    bulkKeywords: row.bulkKeywords
      ? {
          avgSearches: row.bulkKeywords.avgSearches,
          avgSearchesCensored: row.bulkKeywords.avgSearchesCensored,
          avgClicks: row.bulkKeywords.avgClicks,
          avgClicksCensored: row.bulkKeywords.avgClicksCensored,
          avgCtr: row.bulkKeywords.avgCtr,
          avgCtrCensored: row.bulkKeywords.avgCtrCensored,
          etsyCompetition: row.bulkKeywords.etsyCompetition,
          kd: row.bulkKeywords.kd,
        }
      : null,
    tagReport: row.tagReport
      ? {
          tagOccurrences: row.tagReport.tagOccurrences,
          avgSearches: row.tagReport.avgSearches,
          avgSearchesCensored: row.tagReport.avgSearchesCensored,
          avgClicks: row.tagReport.avgClicks,
          avgClicksCensored: row.tagReport.avgClicksCensored,
          avgCtr: row.tagReport.avgCtr,
          avgCtrCensored: row.tagReport.avgCtrCensored,
          etsyCompetition: row.tagReport.etsyCompetition,
          kd: row.tagReport.kd,
          googleSearches: row.tagReport.googleSearches,
        }
      : null,
    ranked: row.ranked?.best ?? null,
    targeting: row.targeting?.best ?? null,
  }));
}
