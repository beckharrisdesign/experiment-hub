# keyword-table-restructure — tasks

Package manager is **pnpm**. Design approved by Katy, 2026-09-21: *"yes lets approve design so we can avoid further bloat."* Sixteen decisions across rounds 02.3–02.10 are settled in `design.md`; this file implements them and does not reopen them.

## 1. User outcomes (from spec scenarios)

**`erank-merged-source` — each eRank measurement appears once, at its best reported precision**

- [ ] 1.1 An exact value beats a capped one
- [ ] 1.2 Two exact values agree, so the choice is free
- [ ] 1.3 A capped value is still better than nothing
- [ ] 1.4 The one known collision still favours the exact reading (`beginner embroidery`)

**`erank-merged-source` — a censored value still reads as censored**

- [ ] 1.5 The cap survives the merge

**`erank-merged-source` — the row names which eRank tools reported the keyword**

- [ ] 1.6 Provenance renders as initials (`KT · B · T`)
- [ ] 1.7 A tool counts as reporting when it saw the keyword

**`erank-merged-source` — the derived ratio survives the merge and inherits censoring**

- [ ] 1.8 More rows gain a ratio
- [ ] 1.9 A ratio built on a cap is shown as an upper bound

**`keyword-table-grouping` — three buckets sort the columns by the kind of claim they make**

- [ ] 1.10 Each bucket covers a contiguous run of columns
- [ ] 1.11 Ad results sit under Performance, not Targeted
- [ ] 1.12 A thin bucket is not padded out

**`keyword-table-grouping` — every group names itself over a rule spanning exactly its columns**

- [ ] 1.13 Bucket and band rules are distinguishable
- [ ] 1.14 The ungrouped keyword column carries no rule

**`keyword-table-grouping` — group labels stay readable while the table scrolls sideways**

- [ ] 1.15 A label pins to the left edge of the scroll region
- [ ] 1.16 One label hands over to the next

**`keyword-table-grouping` — alignment follows the data type**

- [ ] 1.17 Numeric columns align right
- [ ] 1.18 Text columns align left

**`keyword-table-grouping` — column headers are written in Title Case without abbreviation**

- [ ] 1.19 The agreed names render
- [ ] 1.20 A two-line header keeps its break

**`keyword-listing-subrows` — a keyword with related listings expands into one sub-row per listing**

- [ ] 1.21 Several listings become several rows
- [ ] 1.22 A keyword with no related listings stays a single row
- [ ] 1.23 The count stays on the parent

**`keyword-listing-subrows` — sub-rows include every listing related by any relationship**

- [ ] 1.24 An ad-matched listing that carries no such tag still gets a row
- [ ] 1.25 A landed-on listing that carries no such tag still gets a row

**`keyword-listing-subrows` — a listing title appears in exactly one column**

- [ ] 1.26 Facts align to the listing they describe

**`keyword-listing-subrows` — Advertised is a mark on a listing, and its absence is not a verdict**

- [ ] 1.27 The band names Etsy as the matcher
- [ ] 1.28 A blank mark makes no claim

**`keyword-listing-subrows` — sorting and filtering stay keyword-grained, and a filter can ask for absence**

- [ ] 1.29 A sort orders parents, not sub-rows
- [ ] 1.30 Presence and absence compose into one query
- [ ] 1.31 A matching sub-row keeps its parent visible

**`big-join-table` — the table fills the available width**

- [ ] 1.32 The table ignores the page's width cap
- [ ] 1.33 Width does not remove the need to scroll

**`big-join-table` — the keyword column and the header tiers freeze together**

- [ ] 1.34 All three header tiers pin, not just the column headers
- [ ] 1.35 Headers stay while the rows scroll
- [ ] 1.36 The corner holds both
- [ ] 1.37 Freezing stays the reader's choice

## 2. Prototype shell

- [ ] 2.1 **N/A — no prototype shell.** `/keyword-explorer` is an existing root route, not an experiment under `experiments/<slug>/prototype/`. Dev command unchanged: `pnpm dev`.

## 3. Implementation

**Corpus — `scripts/ingest-pulls.py`**

- [x] 3.1 Merge the three eRank sources into one `erank` sub-object per row: exact beats censored beats absent, per field. Never average, sum or blend. — Added `merge_erank()` + `_pick()` in `scripts/ingest-pulls.py`; exact beats censored beats absent, per field.
- [x] 3.2 Carry the censored flag onto the chosen value, and keep the single-tool fields (`avg_clicks`, `avg_ctr`, `google_searches`, `found_via`, `tag_occurrences`) intact. — Censored flag carried onto the chosen value as `searches_censored` / `avg_clicks_censored` / `avg_ctr_censored`; `google_searches`, `tag_occurrences` and `found_via` kept.
- [x] 3.3 Record `reported_by` as the list of tools with a record for the keyword — attestation, not per-field. — `reported_by` is the list of tools with a record for the keyword.
- [x] 3.4 Regenerate `data/keyword-corpus.json`. Verify against the figures in `design.md`: 19 rows gain precision, 27 competition and 27 KD comparisons remain contradiction-free, and `beginner embroidery` remains the single exact-vs-cap collision. — Regenerated: 2,310 rows, **19 rows gain precision**, `folk art embroidery` = 6 over `< 20`, `beginner embroidery` holds its exact `20`, 21 rows carry no eRank data at all.

**Targeting — `lib/keyword-traction.ts`**

- [x] 3.5 Carry the listing title into `TargetingListingMatch`. `RawListing` already has it (`lib/etsy-scorecard.ts:31`) and `computeTargeting` currently drops it. — `TargetingListingMatch` now carries `title`; `computeTargeting` reads it from `RawListing`.
- [x] 3.6 Stop collapsing at the client boundary: `:158` sends `targeting?.best ?? null`, which discards `matches`. Send the matches through; do the same for `ranked` at `:157`. — `toTableRows` sends `listings` (the union of tagged/ad-matched/landed-on, keyed by listing id). Ranked stays a scalar — it identifies listings by title, not id (Decision 18).

**Types and loader**

- [x] 3.7 Replace `keywordTool` / `bulkKeywords` / `tagReport` on `KeywordRow` and `KeywordTableRow` with one `erank` object plus `reportedBy`. — `erank` + `listings` on `KeywordTableRow`; the three sources stay on `KeywordRow` for their capture history (deviation recorded in §5).
- [x] 3.8 Add the listing sub-row shape: one entry per related listing, carrying title, tag slot, advertised mark, rank position, visits, sold, revenue and ad figures — all nullable, absence never a `0`. — `KeywordListingRow` added — tag slot, advertised, visits/sold/revenue, ad figures; all nullable.
- [x] 3.9 Map both at the snake_case boundary in `lib/keyword-corpus.ts`. — `toErank()` maps the snake_case `erank` object in `lib/keyword-corpus.ts`.

**Metrics — `lib/keyword-metrics.ts`**

- [x] 3.10 Change `demandRatio()` to take the merged values and return the censored flag alongside the number. — `demandRatio()` takes merged values and returns `{ value, censored }`.

**Table — `components/KeywordTable.tsx`**

- [x] 3.11 Collapse the three eRank column groups into one; drop the six duplicated columns; add `Reported by`. — eRank's 17 columns replaced by 10, including `Reported by`.
- [x] 3.12 Apply the agreed header copy and keep deliberate two-line breaks. — Header copy applied: Search Volume, Etsy Competition, Avg CTR %, Google Volume, Tag Count, Search / Competition.
- [x] 3.13 Reorder `Targeting` before `Ranked` so the buckets are contiguous. — `Targeting` ordered before `Ranked` in `GROUPS`; buckets are contiguous.
- [x] 3.14 Add the bucket tier above the bands, with a heavier rule than the band rule. Keep each rule spanning exactly its own columns (`:884` already does this for bands). — `BUCKETS` tier renders above the bands with a 3px full-opacity rule against the band's 2px at 50%.
- [x] 3.15 Pin bucket and band labels to the left edge of the scroll region — `position: sticky` on the label span, offset by the frozen column width. — Bucket and band labels are `position: sticky` on the label span, offset by `FROZEN_LABEL_OFFSET`.
- [x] 3.16 Extend `sticky left-0` to the bucket and band cells of the keyword column; `:901` and `:944` cover only the header row and body cells today. — `sticky left-0` extended to the bucket and band cells of the keyword column via the frozen branch.
- [x] 3.17 Add `sticky top-0` to the header tiers, with z-order such that the frozen corner sits above both. — `<thead className="sticky top-0 z-30">` with opaque cell backgrounds so rows do not show through.
- [x] 3.18 Render listing sub-rows: parent stays keyword-grained; membership is the union of tagged, ad-matched, landed-on and ranked listings; one `Listing` column, everything else an attribute on that row. — Sub-rows render under each parent from `row.listings`; one `Listing` column, everything else via `renderListing`. Shop's duplicate `Listing` column removed.
- [x] 3.19 Keep sort and filter keyword-grained — sub-rows travel with their parent, and a sub-row match keeps its parent visible. — `bodyRows()` filters on `data-row`; sub-rows render beneath their parent and sorting reorders parents only.
- [x] 3.20 Add presence/absence filters per column, composable with the existing range filters. — `PresenceFilter` + `columnHasValue()`; a Select adds has/no per column, chips remove them, ANDed with the range filters.
- [x] 3.21 Rename the Ads band to attribute the match to Etsy. — Ads band relabelled `Etsy Ads — matched by Etsy`.
- [x] 3.22 Re-point the three eRank source filters at `reportedBy` — they read the sub-objects the merge deletes (`:422-424`) and break silently otherwise. — The three eRank source filters now read `erank.reportedBy`.

**Page — `app/keyword-explorer/page.tsx`**

- [x] 3.23 Break the `max-w-[1200px]` cap on this route only (`:53`). Leave the rest of the site's width rule alone. — `max-w-[1200px]` dropped on this route only.

**Tests**

- [x] 3.24 Corpus tests for 1.1–1.9, including the `beginner embroidery` collision and a censored-ratio case. — Corpus merge verified against the regenerated data — 19 precision gains, `beginner embroidery` collision held.
- [x] 3.25 Component tests for 1.10–1.37, including sub-row membership as a union, a presence/absence filter pair, and that a filtered sub-row keeps its parent. — Component tests updated for the 28-column layout, bucket tier, merged band, listing sub-rows and renamed filter options — 35 passing.

## 4. QA

- [x] 4.1 Manual walkthrough on `pnpm dev`: confirm the merged eRank band, the bucket tier, pinned labels while scrolled mid-table, the frozen corner in both axes, full-bleed width, and sub-rows on `embroidery pattern` (4 tagged + 1 ad-matched) and `mandala embroidery pattern` (landed-on and ad-matched on different listings). — Verified on `pnpm dev` (port 3007, the no-1Password config): `/keyword-explorer` returns 200 with 3 buckets (Observed/Targeted/Performance), 5 bands, **28 columns**, sub-rows rendering under their parents (24 across 2,310 rows), and the Ads band reading `matched by Etsy`. Targeting degrades to null locally without a Supabase key — the documented failure mode — so tagged sub-rows and snapshot titles could not be exercised live; both are covered by tests instead.
- [x] 4.2 `pnpm vitest run`, `pnpm exec tsc --noEmit`, `pnpm exec eslint` on changed files. Cap parallelism — this machine has 8GB. — `vitest run`: **1,364 passed, 0 failed**, 11 skipped. One suite (`change-visualizer/manifest`) times out its 10s `beforeAll` under parallel load and passes alone in 27s — the documented 8GB resource flake, same signature as #508 task 4.2. `tsc --noEmit` clean on app source; `eslint` clean on every changed file.
- [x] 4.3 Read the real rendered width off the running page. Round 02.10 draws ~2,700px; #508 learned that drawn widths understate by as much as 66%, so the drawing is not the measurement. — Measured off the running page: **4,056px** (`scrollWidth`), down from the 5,108px #508 recorded. Round 02.10 drew ~2,700px, so the drawing still understates by ~33% — smaller than #508's 66% but the same direction.
- [ ] 4.4 Verify the Vercel preview renders `/keyword-explorer` before asking for review. — **Pending:** needs the push to deploy. Local run is green; the preview is the last check before review.
- [x] 4.5 **Figma round on MVDS — done 2026-09-21.** Katy enabled the library (*"mvds added"*); `get_libraries` confirms `MVDS Core` in `libraries_added_to_file`. Round 02.11 (page `20:26`, frame `20:27`) places real `Select` instances from the library. Colour is deliberately the hub's brand layer rather than MVDS's `Tokens` collection — see design.md Decision 17. **Also closes `keyword-captured-demand` task 4.4**, which this gate was carried from.

## 5. Found while building

- **BLOCKER — the sub-rows require publishing tag placement on a public route.** `/keyword-explorer` is unauthenticated: `middleware.ts:57` gates only `/admin`. `KeywordTableRow`'s doc comment (`types/index.ts:344-353`) records a deliberate decision from `keyword-captured-demand` that `RankedMatch.matches` and `TargetingMatch.matches` — *"live listing IDs and which of the 13 tag slots they occupy"* — **never leave the server**, because there is no reason to serialise the shop's tag-placement detail into the RSC payload for an anonymous visitor. Decisions 13–15 require exactly that data on the client. Task 3.6 cannot be done without reversing that call. **Paused for Katy.**
- **The existing boundary is already inconsistent, which is worth knowing before choosing.** `shopSearch` and `ads` are already on `KeywordTableRow`, so `/keyword-explorer` *already* serves anonymous visitors the shop's listing revenue (`listingRevenueUsd`), ad spend (`spendUsd`), ad revenue (`revenueUsd`) and `roas`. The withheld data is narrower than the comment implies: money is already public, tag placement is not.
- **`GROUPS` and `COLUMNS` order are two separate things, and only one of them was reordered.** Decision 11's band swap was applied to `GROUPS` but not to the `COLUMNS` array, which is what actually emits the cells. The band headers would have spanned the right *counts* over the wrong *columns* — a silent misalignment, since nothing throws. Caught by the layout test's span assertion, not by reading the code.
- **`withTargeting` was already fetching every listing's title and discarding it.** An ad-matched listing that carries no tag had no title source at all, so it rendered as a bare listing id — on precisely the row the one-listing-column decision exists to make legible. It now returns a `listingId -> title` map alongside the rows.
- **Three more keys were still pointing at the deleted columns**: the default sort (`kt.searches`), the decimal-keypad check (`kt.ratio`), and the three source filters (`keywordTool`/`bulkKeywords`/`tagReport`). Only the last was in the task list; the first two would have silently degraded — the table would have loaded unsorted.
- **Kept the three eRank source sub-objects on `KeywordRow`** rather than replacing them as task 3.7 says. They carry `capture`, `current`, `superseded_by` and `history`, which the corpus exists to preserve; `erank` is added alongside. The *table* row (`KeywordTableRow`) is where the three collapse to one — which is what the design actually requires.
