# Archive — keyword-table-restructure

**Archived:** 2026-09-21 · **Created:** 2026-09-20 · **Tasks:** 67/68
**Outcome:** SHIPPED

Began as `erank-one-band` (proposal #509) and grew across rounds 02.3–02.11
at Katy's direction: three eRank bands merged into one with a `Reported by`
column, an Observed / Targeted / Performance bucket tier, Title Case headers,
full-bleed width, a frozen corner with pinned group labels, and one sub-row
per related listing. Merged in #510; #511 fixed the scroll region, added the
`Keyword` jump chip and the frozen-column shadow, and made every column
`nowrap`.

**Evidence:** `BUCKETS`, `GROUPS`, the 28-entry `COLUMNS`, `PresenceFilter`
and `toListingRows` in `components/KeywordTable.tsx` / `lib/keyword-traction.ts`
on `main`; `max-w-[1200px]` dropped in `app/keyword-explorer/page.tsx`.
Verified live on 2026-09-21: `labs.beckharrisdesign.com/keyword-explorer`
carries `Reported by`, `Search / Competition` and `Etsy Ads — matched by Etsy`.
`vitest run` 1,381 passed at #511.

**Left open:** 2.1 is N/A (no prototype shell). Two named gaps, both in the
promoted specs: two *different* exact eRank values for one field would be
resolved silently (no such pair exists in 2,310 rows); and 108 live tags
have no corpus row because eRank never scored them, so the table cannot show
them yet. The public-route boundary on tag placement was reversed on purpose
(Decision 18) and reconfirmed by Katy at archive. One correction: outcome
1.35 was ticked in #510 on a computed style alone and only held after #511.
