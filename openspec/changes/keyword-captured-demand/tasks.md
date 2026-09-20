# keyword-captured-demand — tasks

Package manager is **pnpm**. Self-approved under Katy's standing instruction, 2026-09-20: *"auto approve all the steps for this round so that I have a single PR waiting for me to review in a preview deployment when I get back."*

## 1. User outcomes (from spec scenarios)

**`captured-demand` — a captured search term lands on the keyword row it belongs to**

- [ ] 1.1 A captured term with no eRank data still gets a row
- [ ] 1.2 A captured term that eRank also knows lands on the same row
- [ ] 1.3 The listing's outcome travels with the term but stays the listing's

**`captured-demand` — a captured term is stored exactly as it was typed**

- [ ] 1.4 A misspelled term keeps its misspelling
- [ ] 1.5 Singular and plural stay separate rows

**`captured-demand` — Etsy Ads is its own band and never merges with search terms**

- [ ] 1.6 An ad keyword with no organic arrivals still lands
- [ ] 1.7 Views and visits are never summed
- [ ] 1.8 The two windows are labelled where they are read

**`captured-demand` — the reader survives both export shapes and records what it could not read**

- [ ] 1.9 Both search-term table shapes parse
- [ ] 1.10 An unreadable capture stays unreadable

**`big-join-table` — every column hugs its contents and nothing is hidden**

- [ ] 1.11 No column absorbs the surplus
- [ ] 1.12 The table is never narrower than its container
- [ ] 1.13 Long values are shown in full

**`big-join-table` — filters compound and sorting carries more than one key**

- [ ] 1.14 Several filters narrow together
- [ ] 1.15 A second sort key breaks ties
- [ ] 1.16 Blanks still sort last under every key

**`big-join-table` — the whole table exports at any time**

- [ ] 1.17 Export writes every column of the visible rows
- [ ] 1.18 Export preserves the table's honesty rules

**`big-join-table` — scrolling has controls rather than choreography**

- [ ] 1.19 The table rests at the start
- [ ] 1.20 A scrollbar is always visible
- [ ] 1.21 A band can be jumped to without hiding the others
- [ ] 1.22 Freezing the keyword is the reader's choice

## 2. Prototype shell

- [ ] 2.1 **N/A — no prototype shell.** `/keyword-explorer` is an existing root route, not an experiment under `experiments/<slug>/prototype/`. Dev command unchanged: `pnpm dev`.

## 3. Implementation

**Corpus — `scripts/ingest-pulls.py`**

- [ ] 3.1 Add `read_listing_stats_json()` — parse the verbatim `term_rows`, handling both the 2-column and 4-column shapes. Rows Etsy renders twice (visible cells plus an accessibility duplicate) collapse to one term; the term text is never altered.
- [ ] 3.2 Add `read_ads_keywords_json()` — parse the label-prefixed `keyword_rows` (`Targeted keyword<name>ROAS<n>Orders<n>…`) by label, not position.
- [ ] 3.3 Join both onto the merged row in `build_merged_corpus()` by the existing case-insensitive exact-text rule; a term unknown to eRank creates its own row.
- [ ] 3.4 Listings recorded as unreadable or not-re-scraped contribute nothing — never a `0`.
- [ ] 3.5 Regenerate `data/keyword-corpus.json`; row count must **exceed 2,293** by the number of captured terms eRank has never seen. Verify the delta rather than assuming it.

**Types and loader**

- [ ] 3.6 Add `ShopSearchValues` and `AdsKeywordValues` to `types/index.ts`; extend `KeywordRow` and `KeywordTableRow`.
- [ ] 3.7 Map both in `lib/keyword-corpus.ts` at the snake_case boundary.

**Table — `components/KeywordTable.tsx`**

- [ ] 3.8 Add the Shop and Etsy Ads column groups, with each band label carrying its own window.
- [ ] 3.9 Remove the `grow` flag entirely; move the table from `w-full` to `w-auto min-w-full`.
- [ ] 3.10 Replace the single range filter with compound filters — several active at once, each removable.
- [ ] 3.11 Replace the single sort key with a two-key sort; blanks still sort last under every key.
- [ ] 3.12 Add Export CSV over the currently visible rows, every column, verbatim values.
- [ ] 3.13 Add the scroll tools: jump-to-band, an always-rendered horizontal scrollbar, and a Freeze keyword toggle defaulting to off.

**Tests**

- [ ] 3.14 Corpus tests for 1.1–1.10, including a fixture with both table shapes and one unreadable listing.
- [ ] 3.15 Component tests for 1.11–1.22, including the export contents and the compound filter/sort behaviour.

## 4. QA

- [ ] 4.1 Manual walkthrough on `pnpm dev`: confirm `paper embriodery template` and `geometric embroidery pattern` both appear, that Ads and Shop never sum, that three filters compound, that a two-key sort breaks ties, and that Export downloads every column.
- [ ] 4.2 `pnpm vitest run` green, `pnpm exec tsc --noEmit` clean, `pnpm exec eslint` clean on changed files.
- [ ] 4.3 Confirm the Vercel preview deploys and `/keyword-explorer` renders there — this is what Katy asked to come back to.
- [ ] 4.4 **Owed before ship:** a Figma round on MVDS. Recorded as an open gate in `design.md`, not waived.
