# Archive — keyword-explorer-etsy-traction

**Archived:** 2026-09-21 · **Created:** 2026-09-18 · **Tasks:** 85/88
**Outcome:** SHIPPED, then SUPERSEDED by `keyword-explorer-unified-view`

Added Ranked (best Etsy search position, from the *Spotted on Etsy* archive)
and Targeting (lowest of 13 tag slots, computed live from listing snapshots)
as numeric, sortable, range-filterable columns, and removed Status, Capture
and Coverage from the visible table at Katy's request. Merged in #502. #505
folded both onto the merged multi-source row; #510 later split Targeting into
a parent `Listings` count plus per-listing sub-rows.

**Evidence:** `lib/keyword-traction.ts` (`computeTargeting`, `withTargeting`,
`toTableRows`) and `build_ranked_index()` in `scripts/ingest-pulls.py` on
`main`; the join, blank-never-zero and Supabase-failure fallback are covered
in `tests/keyword-corpus.test.ts` and `tests/components/KeywordTable.test.tsx`.
Katy walked the live page on 2026-09-21 with real Targeting values.

**Left open:** three documented non-defects, left unticked so the record stays
honest — 9.3 (`getLatestListingSnapshots` mirrors the Python source's
accepted zero-row behaviour), 14.7 (the archive identifies ranking listings
by title, not id, because eRank exports no id), 16.4 (a PR-body overclaim,
fixed in the PR body). A follow-up on the shared sync pipeline could take 9.3.
