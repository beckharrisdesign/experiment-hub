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
      existing.push({
        listingId: listing.listing_id,
        slot: index + 1,
        title: listing.title ?? null,
      });
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
    // The three eRank sources collapse to one here. `KeywordRow` keeps them
    // for their capture history; the table has no use for it (design.md
    // decision 5 — every visible row is current by construction).
    erank: row.erank,
    shopSearch: row.shopSearch,
    ads: row.ads,
    ranked: row.ranked?.best ?? null,
    targeting: row.targeting?.best ?? null,
    listings: toListingRows(row),
  }));
}

/**
 * Every listing related to a keyword, as one sub-row each.
 *
 * The union of the three id-bearing relationships — tagged, ad-matched,
 * landed-on — keyed by listing id. The union is the point: `embroidery
 * pattern` is tagged on four listings and advertised on a fifth that carries
 * no such tag, and an intersection would hide exactly that.
 *
 * `Ranked` is not joined in. `RankedMatch` identifies listings by title
 * string rather than id, so matching it onto these rows would mean comparing
 * titles — fragile enough to invent rows (design.md Decision 18). The
 * keyword's best position stays on the parent as `ranked`.
 *
 * Returns `[]` for a keyword with no listing relationship at all, which is
 * roughly 86% of the corpus; those keywords render as a single row.
 */
function toListingRows(row: KeywordRow): KeywordTableRow["listings"] {
  const byId = new Map<string, KeywordTableRow["listings"][number]>();

  const slot = (listingId: string, title: string | null) => {
    const existing = byId.get(listingId);
    if (existing) {
      if (existing.title === null && title !== null) existing.title = title;
      return existing;
    }
    const created = {
      listingId,
      title,
      tagSlot: null,
      advertised: false,
      visits: null,
      itemsSold: null,
      revenueUsd: null,
      adViews: null,
      adClicks: null,
      adClickRatePct: null,
      adSpendUsd: null,
      adRevenueUsd: null,
      adOrders: null,
      adRoas: null,
    };
    byId.set(listingId, created);
    return created;
  };

  for (const match of row.targeting?.matches ?? []) {
    const entry = slot(String(match.listingId), match.title ?? null);
    // Lowest slot wins if one listing somehow carries the tag twice.
    if (entry.tagSlot === null || match.slot < entry.tagSlot) {
      entry.tagSlot = match.slot;
    }
  }

  const shop = row.shopSearch;
  if (shop) {
    const entry = slot(String(shop.listingId), shop.listingTitle);
    entry.visits = shop.visits;
    entry.itemsSold = shop.listingItemsSold;
    entry.revenueUsd = shop.listingRevenueUsd;
  }

  const ads = row.ads;
  if (ads && ads.listingId) {
    const entry = slot(String(ads.listingId), entryTitle(byId, String(ads.listingId)));
    // `advertised` says Etsy matched an ad for THIS keyword to this listing.
    // A `false` elsewhere is not evidence a listing is unadvertised.
    entry.advertised = true;
    entry.adViews = ads.views;
    entry.adClicks = ads.clicks;
    entry.adClickRatePct = ads.clickRatePct;
    entry.adSpendUsd = ads.spendUsd;
    entry.adRevenueUsd = ads.revenueUsd;
    entry.adOrders = ads.orders;
    entry.adRoas = ads.roas;
  }

  // Tagged listings first, by slot; then everything else, so the deliberate
  // acts read before the things that merely happened.
  return [...byId.values()].sort((a, b) => {
    if (a.tagSlot !== null && b.tagSlot !== null) return a.tagSlot - b.tagSlot;
    if (a.tagSlot !== null) return -1;
    if (b.tagSlot !== null) return 1;
    return a.listingId.localeCompare(b.listingId);
  });
}

function entryTitle(
  byId: Map<string, { title: string | null }>,
  listingId: string,
): string | null {
  return byId.get(listingId)?.title ?? null;
}

