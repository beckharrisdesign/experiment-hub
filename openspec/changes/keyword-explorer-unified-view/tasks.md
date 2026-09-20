# keyword-explorer-unified-view — tasks

Package manager is **pnpm** (`packageManager: pnpm@10.33.0`; `pnpm-lock.yaml` is authoritative per README). Tests are written before the code that satisfies them, per `rules/principles.mdc`.

## 1. User outcomes (from spec scenarios)

One checkbox per spec scenario, in spec order. Titles match `specs/**/spec.md` 1:1.

**`unified-keyword-row` — one row per distinct keyword, merged across every source**

- [ ] 1.1 A keyword measured by three instruments is one row — `folk art embroidery` appears once, carrying Keyword Tool, Bulk Keywords and Tag Report together
- [ ] 1.2 A keyword only one source has ever seen still gets a row — `bedroom wall art` (Tag Report only) and `snow globe` (Ranked only) both appear
- [ ] 1.3 Near-identical keywords stay separate rows — `snow globe` and `snow globes` remain two rows

**`unified-keyword-row` — an absent source renders blank, and blank has exactly one look**

- [ ] 1.4 An absent source is never fabricated as zero — `embroidery kits` shows blank Tag Report columns, not `0`
- [ ] 1.5 A reported unknown looks identical to an absent source — `calm stitching`'s `Unknown` Avg searches and empty KD read the same as a source with no row
- [ ] 1.6 A censored value keeps its reported text — `folk art embroidery` shows `< 20`, not blank and not `20`

**`unified-keyword-row` — the Tag Report is read into the corpus for the first time**

- [ ] 1.7 Tag Report fields land on the merged row — its seven fields reach the row for a keyword it scores
- [ ] 1.8 Tag-Report-only tags create their own rows — all 258 orphan tags appear rather than being dropped

**`keyword-explorer` — one table, with columns grouped under a band per source**

- [ ] 1.9 Every source is a band of columns on one table
- [ ] 1.10 The Bulk Keywords table is gone — its columns appear as the Bulk Keywords band instead
- [ ] 1.11 Colliding column names are told apart by their band — the three KDs and the doubled Avg columns
- [ ] 1.12 A row is mostly blank without looking broken — no empty state, warning or placeholder

**`keyword-explorer` — sorting and filtering work per column and never rank a blank as zero**

- [ ] 1.13 Blanks sort last on any numeric column — in either direction, on every source's columns
- [ ] 1.14 A range filter excludes blanks rather than counting them as zero
- [ ] 1.15 Ranked and Targeting behave exactly as they do today

## 2. Prototype shell

- [ ] 2.1 **N/A — no prototype shell.** `/keyword-explorer` is an existing root route in the hub app, not an experiment under `experiments/<slug>/prototype/`. `skills/prototype-builder` covers scaffolding new prototype projects and does not apply. Dev command is unchanged: `pnpm dev` (which runs `op run --env-file=.env.local`, so it needs 1Password and only works from Katy's own terminal).

## 3. Implementation

**Corpus — `scripts/ingest-pulls.py`**

- [ ] 3.1 Write the failing tests first: extend `tests/keyword-corpus.test.ts` with fixtures covering 1.1–1.8 before touching the generator.
- [ ] 3.2 Add `read_tag_report_csv()`, reusing `parse_bulk_number()` unchanged for `< N` / `Unknown` / empty-cell handling. A stashed draft of the value-parsing half exists from before the proposal; the row-shape half is new.
- [ ] 3.3 Replace `build_corpus()`'s parallel arrays with one keyword-keyed merge. Generalise the ranked-only synthetic row from #504 into the single rule "a row exists if any source has this keyword" — do not leave it as a special case bolted on beside the merge.
- [ ] 3.4 Emit one row per distinct keyword text (case-insensitive), each carrying a nullable sub-object per source. An absent source is an absent sub-object, never a zeroed-out one.
- [ ] 3.5 Regenerate `data/keyword-corpus.json` with `--apply` and confirm the row count lands at **2293** (1939 distinct Keyword Tool keywords + 96 bulk-only + 258 Tag-Report-only). A different number means the join is wrong — investigate before proceeding.

**Types and loader — `types/index.ts`, `lib/keyword-corpus.ts`**

- [ ] 3.6 Replace `KeywordRow` / `BulkKeywordRow` with the merged row type carrying five optional source sub-objects. Keep the snake_case → camelCase normalisation at the loader boundary.
- [ ] 3.7 Keep `bulkValueLabel()`'s censored-value behaviour and reuse it for Tag Report fields rather than writing a second formatter.

**Table — `components/KeywordTable.tsx`**

- [ ] 3.8 Write the failing component tests first: extend `tests/components/KeywordTable.test.tsx` for 1.9–1.15.
- [ ] 3.9 Add the source-band header row above the column headers, per `design.md` § Visual design. Bands are label + rule only — no per-source colour (design decision 1).
- [ ] 3.10 Widen to the 20 columns, each reading from its own sub-object and rendering blank when that sub-object is `null`.
- [ ] 3.11 Extend the existing "blank sorts last, never 0" sort and range-filter behaviour to every new numeric column rather than reimplementing it.
- [ ] 3.12 Delete `components/BulkKeywordTable.tsx` and move its censored-value rendering and `current` / `superseded` Badge into the merged table. Port its tests rather than dropping them — see Risks in `design.md`.

**Page — `app/keyword-explorer/page.tsx`**

- [ ] 3.13 Remove the Bulk Keywords section (heading, explanatory paragraph, table).
- [ ] 3.14 Update the header copy from observation count to keyword count: "2,293 keywords across 5 sources. Sort or filter on any column."
- [ ] 3.15 Move the `< N` / dash explanation to a single note under the merged table, generalised to cover all three censored sources (design decision 3).
- [ ] 3.16 Add the Source filter as an MVDS `Select`, alongside the existing filters (design decision 4).

**Open question — do not assume an answer**

- [ ] 3.17 `current` / `supersededBy` is unresolved. 83 keywords carry more than one Keyword Tool capture, and the merged row shows one set of values. If implementation forces a choice about which capture wins or whether the row says so, **stop and take it back to `design.md`** rather than settling it in code.

## 4. QA

- [ ] 4.1 **Manual walkthrough, in Katy's terminal** (`pnpm dev` — needs 1Password, so it cannot run from an agent shell). Against Outcomes: find `folk art embroidery` and confirm all three instruments read on one row; confirm `embroidery kits` shows blank Tag Report columns rather than zeros; confirm `snow globe` and `snow globes` are two rows; sort a Tag Report column and confirm blanks collect at the end; scroll horizontally at 1024 and at 480.
- [ ] 4.2 Automated smoke: `pnpm vitest run` green, `pnpm exec tsc --noEmit` clean, `pnpm exec eslint` clean on every changed file. Note the two pre-existing `change-visualizer` failures caused by CI's shallow clone — those are unrelated and present on `main`.
- [ ] 4.3 Visual check against `02.1 Proposed — MVDS` (`7:12` desktop, `7:223` mobile). Flag any divergence as either a build error or a design change needing a new numbered round — do not edit round 02.1 in place.
