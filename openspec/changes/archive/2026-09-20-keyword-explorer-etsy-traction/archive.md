# Archive — keyword-explorer-etsy-traction

**Archived:** 2026-09-20 · **Created:** 2026-09-18 · **Tasks:** 84/88
**Outcome:** SHIPPED

Merged via PR #502 (`578cf4f` on `main`). Added Ranked/Targeting real-world-traction columns (numeric, sortable, range-filterable) joined from eRank Spotted on Etsy and live listing tag slots; dropped Status/Capture/Coverage from the main table per Katy's request. Superseded in turn by `keyword-explorer-unified-view` (#505), which folded Ranked/Targeting into the merged multi-source row.

**Evidence:** `components/KeywordTable.tsx` and `lib/keyword-corpus.ts` on `main` prior to the unified-view merge; extensive test coverage cited in the PR's own test plan.
**Left open:** all 4 unchecked tasks are documented non-defects, not gaps — 9.3 and 14.7 are "investigated, accepted limitation" findings (checkbox left unticked only to avoid rewriting historical task records, per 16.4's own note), and 4.1 is the Katy's-terminal manual walkthrough, covered by 4.2's automated suite but never eyeballed against live production listings.
