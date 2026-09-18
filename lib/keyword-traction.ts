import type { RawListing } from "@/lib/etsy-scorecard";
import type { TargetingMatch } from "@/types";

/**
 * Which of a listing's (up to 13) tag slots each corpus keyword occupies,
 * across every currently-active listing snapshot.
 *
 * Pure — no I/O, no Supabase — so it is unit-testable without a database,
 * mirroring `lib/etsy-scorecard.ts`. The caller (the Keyword Explorer page)
 * owns fetching `snapshots` via `getLatestListingSnapshots()`.
 *
 * Exact match only, case-insensitive, against a listing's `tags` array — not
 * its title. A tag slot number means nothing for a title hit, so title is out
 * of scope for this signal (proposal.md § Not doing).
 *
 * `getLatestListingSnapshots()` returns the newest snapshot per listing
 * across all history — a listing pulled from Etsy (deleted, deactivated,
 * expired) keeps its last-known snapshot and tags there. Without filtering,
 * a keyword could read "targeted" long after the listing that carried it
 * stopped being live. Only `state === "active"` counts, matching the same
 * field's use elsewhere (`lib/etsy-listing-kit/evaluate.ts`).
 */
export function computeTargeting(
  keywords: string[],
  snapshots: RawListing[],
): Map<string, TargetingMatch> {
  const active = snapshots.filter((listing) => listing.state === "active");
  const bySlot = new Map<string, TargetingMatch["matches"]>();

  for (const listing of active) {
    const tags = listing.tags ?? [];
    tags.forEach((tag, index) => {
      const key = tag.trim().toLowerCase();
      if (!key) return;
      const existing = bySlot.get(key) ?? [];
      existing.push({ listingId: listing.listing_id, slot: index + 1 });
      bySlot.set(key, existing);
    });
  }

  const result = new Map<string, TargetingMatch>();
  for (const keyword of keywords) {
    const matches = bySlot.get(keyword.trim().toLowerCase());
    if (!matches || matches.length === 0) continue;
    const best = Math.min(...matches.map((m) => m.slot));
    result.set(keyword, { best, matches });
  }
  return result;
}
