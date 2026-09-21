# keyword-captured-demand — tasks

Package manager is **pnpm**. Self-approved under Katy's standing instruction, 2026-09-20: *"auto approve all the steps for this round so that I have a single PR waiting for me to review in a preview deployment when I get back."*

## 1. User outcomes (from spec scenarios)

**`captured-demand` — a captured search term lands on the keyword row it belongs to**

- [x] 1.1 A captured term with no eRank data still gets a row
- [x] 1.2 A captured term that eRank also knows lands on the same row
- [x] 1.3 The listing's outcome travels with the term but stays the listing's

**`captured-demand` — a captured term is stored exactly as it was typed**

- [x] 1.4 A misspelled term keeps its misspelling
- [x] 1.5 Singular and plural stay separate rows

**`captured-demand` — Etsy Ads is its own band and never merges with search terms**

- [x] 1.6 An ad keyword with no organic arrivals still lands
- [x] 1.7 Views and visits are never summed
- [x] 1.8 The two windows are labelled where they are read

**`captured-demand` — the reader survives both export shapes and records what it could not read**

- [x] 1.9 Both search-term table shapes parse
- [x] 1.10 An unreadable capture stays unreadable

**`big-join-table` — every column hugs its contents and nothing is hidden**

- [x] 1.11 No column absorbs the surplus
- [x] 1.12 The table is never narrower than its container
- [x] 1.13 Long values are shown in full

**`big-join-table` — filters compound and sorting carries more than one key**

- [x] 1.14 Several filters narrow together
- [x] 1.15 A second sort key breaks ties
- [x] 1.16 Blanks still sort last under every key

**`big-join-table` — the whole table exports at any time**

- [x] 1.17 Export writes every column of the visible rows
- [x] 1.18 Export preserves the table's honesty rules

**`big-join-table` — scrolling has controls rather than choreography**

- [x] 1.19 The table rests at the start
- [x] 1.20 A scrollbar is always visible
- [x] 1.21 A band can be jumped to without hiding the others
- [x] 1.22 Freezing the keyword is the reader's choice

## 2. Prototype shell

- [x] 2.1 **N/A — no prototype shell.** `/keyword-explorer` is an existing root route, not an experiment under `experiments/<slug>/prototype/`. Dev command unchanged: `pnpm dev`.

## 3. Implementation

**Corpus — `scripts/ingest-pulls.py`**

- [x] 3.1 Add `read_listing_stats_json()` — parse the verbatim `term_rows`, handling both the 2-column and 4-column shapes. Rows Etsy renders twice (visible cells plus an accessibility duplicate) collapse to one term; the term text is never altered.
- [x] 3.2 Add `read_ads_keywords_json()` — parse the label-prefixed `keyword_rows` (`Targeted keyword<name>ROAS<n>Orders<n>…`) by label, not position.
- [x] 3.3 Join both onto the merged row in `build_merged_corpus()` by the existing case-insensitive exact-text rule; a term unknown to eRank creates its own row.
- [x] 3.4 Listings recorded as unreadable or not-re-scraped contribute nothing — never a `0`.
- [x] 3.5 Regenerate `data/keyword-corpus.json`; row count must **exceed 2,293** by the number of captured terms eRank has never seen. Verify the delta rather than assuming it.

**Types and loader**

- [x] 3.6 Add `ShopSearchValues` and `AdsKeywordValues` to `types/index.ts`; extend `KeywordRow` and `KeywordTableRow`.
- [x] 3.7 Map both in `lib/keyword-corpus.ts` at the snake_case boundary.

**Table — `components/KeywordTable.tsx`**

- [x] 3.8 Add the Shop and Etsy Ads column groups, with each band label carrying its own window.
- [x] 3.9 Remove the `grow` flag entirely; move the table from `w-full` to `w-auto min-w-full`.
- [x] 3.10 Replace the single range filter with compound filters — several active at once, each removable.
- [x] 3.11 Replace the single sort key with a two-key sort; blanks still sort last under every key.
- [x] 3.12 Add Export CSV over the currently visible rows, every column, verbatim values.
- [x] 3.13 Add the scroll tools: jump-to-band, an always-rendered horizontal scrollbar, and a Freeze keyword toggle defaulting to off.

**Tests**

- [x] 3.14 Corpus tests for 1.1–1.10, including a fixture with both table shapes and one unreadable listing.
- [x] 3.15 Component tests for 1.11–1.22, including the export contents and the compound filter/sort behaviour.

## 4. QA

- [x] 4.1 Manual walkthrough on `pnpm dev`: confirm `paper embriodery template` and `geometric embroidery pattern` both appear, that Ads and Shop never sum, that three filters compound, that a two-key sort breaks ties, and that Export downloads every column.
- [x] 4.2 **1,374 passed across 103 files**, typecheck and lint clean. One run showed a single failure in `KeywordTable` that passed both in isolation and on an immediate re-run — a resource flake on an 8GB machine, same signature as the `change-visualizer` flake in the previous change. `pnpm vitest run` green, `pnpm exec tsc --noEmit` clean, `pnpm exec eslint` clean on changed files.
- [x] 4.3 Verified live on `pnpm dev` first: 7 bands with their windows in the labels, 33 columns, table `w-auto min-w-full` at **5,108px** resting at scrollLeft 0, freeze off by default and sticky once toggled, all 7 jump buttons present, Export CSV present. Confirm the Vercel preview deploys and `/keyword-explorer` renders there — this is what Katy asked to come back to.
- [x] 4.4 **Done 2026-09-21 via `keyword-table-restructure`.** Katy enabled MVDS Core on the shared file (*"mvds added"*); `get_libraries` confirms it in `libraries_added_to_file`. The round is `02.11 Proposed — MVDS` (page `20:26`, frame `20:27`) on the same file, drawn with real `Select` instances. One toggle and one round satisfied both changes, as that change's proposal anticipated. Caveat recorded there as Decision 17: colour is the hub's brand layer, not MVDS's `Tokens` collection, because `globals.css` repaints MVDS's semantic tokens for this route.

## 5. Found while building

- **The drawn width was wrong by 66%.** Round 02.1 estimated 3,072px; the real table renders **5,108px** at the 1024 breakpoint. Fixed column widths in a mock cannot anticipate a `Listing` column holding full Etsy titles, so the Figma rounds understate width badly. This does not change the design — the Big Join rule accepts the scroll — but no future round should be trusted for absolute width.
- **Appending a sort key was wrong.** The first implementation appended a clicked column as a tie-breaker, so a single click on Ranked left the table still ordered by Searches. Clicking now makes a column primary and demotes the previous primary, which is what a header click visibly promises.
- **A test asserted the old single-filter contract.** "Clears the bound when the range column changes" existed because bounds were global state. Compound filters invert it: adding one must leave the other alone. Rewritten rather than deleted, plus a second test for removing one filter without disturbing another.
