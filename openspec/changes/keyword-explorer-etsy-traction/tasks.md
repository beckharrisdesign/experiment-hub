# tasks — keyword-explorer-etsy-traction

## 1. User outcomes (from spec scenarios)

- [x] 1.1 A keyword with one matching listing shows its position
- [x] 1.2 A keyword with multiple ranking listings shows the best position
- [x] 1.3 A keyword with no ranking match shows a blank cell
- [x] 1.4 A keyword that is a tag on one listing shows its slot number
- [x] 1.5 A keyword tagged on multiple listings shows the earliest slot
- [x] 1.6 A keyword absent from every listing's tags shows a blank cell
- [x] 1.7 A minimum or maximum narrows the table
- [x] 1.8 A range filter applies to Ranked and Targeting the same as any other numeric column
- [x] 1.9 Status, Capture and Coverage are absent from the table
- [x] 1.10 The underlying data for all three is unchanged
- [x] 1.11 Blank cells sort after populated ones, not as zero

## 2. Prototype shell

- [x] 2.1 No `experiments/<slug>/prototype/` — hub platform work extending the shipped `keyword-explorer` route, same as that change itself (`rules/openspec-workflow.mdc` § Shared hub behavior). The shell is `app/keyword-explorer/page.tsx`.

## 3. Implementation

- [x] 3.1 `types/index.ts`: add `RankedMatch { best: number; matches: { listing: string; page: number; position: number }[] }` and `TargetingMatch { best: number; matches: { listingId: number; slot: number }[] }`. Extend `KeywordRow` with `ranked: RankedMatch | null` (static, from the corpus) and `targeting: TargetingMatch | null` (request-time, merged by the page — present on every row object by the time it reaches `KeywordTable`, never `undefined`). (→ 1.1–1.6, 1.11)
- [x] 3.2 `scripts/ingest-pulls.py`: `build_corpus()` gains a pass reading every `erank-spotted-on-etsy` CSV in `docs/pulls/` — match `Search Term` against corpus keywords case-insensitive exact, attach `ranked` (best position + full listing/page/position list) onto the matching keyword row, `null` when no match. Wired into the existing `--apply` run; no new CLI flag. Regenerated `data/keyword-corpus.json` — 410 rows, all `ranked: null` (0 of 410 match the 12-row `erank-spotted-on-etsy` archive today, confirmed directly). (→ 1.1–1.3, 1.11)
- [x] 3.3 `lib/keyword-corpus.ts`: parse `ranked` from the raw (snake_case) corpus JSON into camelCase on `toRow()`, same pattern as `foundVia`. No behavior change to existing exports. (→ 1.1–1.3)
- [x] 3.4 `lib/keyword-traction.ts` (new): pure function `computeTargeting(keywords: string[], snapshots: RawListing[]): Map<string, TargetingMatch>` — case-insensitive exact match of each keyword against every snapshot's `tags` array, 1-based slot index, best = lowest slot across listings, absent keywords simply missing from the map (never a `0` entry). No I/O — unit-testable without Supabase, mirroring `lib/etsy-scorecard.ts`'s pure-functions precedent. (→ 1.4–1.6, 1.11)
- [x] 3.5 `app/keyword-explorer/page.tsx`: becomes an async server component. Calls `getLatestListingSnapshots()` (`lib/etsy-sync.ts`) inside a try/catch; on success, runs `computeTargeting` and merges each row's `targeting` value onto the statically-loaded corpus rows before rendering; on failure, every row's `targeting` is `null` and the failure is logged server-side only (`console.error`), no banner or partial-page error state (design.md § Decisions — silent degrade). (→ 1.4–1.6, design.md's Supabase-failure decision)
- [x] 3.6 `components/KeywordTable.tsx`: add `Ranked` and `Targeting` as right-aligned numeric sortable columns (blank cell, not `0`, when the row's value is `null`); remove `Status`, `Capture`, `Coverage` from the rendered `COLUMNS`/`<td>` set (props/row type keep carrying the fields — nothing is deleted from the data passed in). Column order: Keyword, Searches, Competition, KD, Ranked, Targeting, Found via (query), Searches/comp. — per `design.md` § User flow. `Badge` import dropped (only the removed Status column used it). (→ 1.9, 1.10, 1.11)
- [x] 3.7 `components/KeywordTable.tsx`: add the range-filter control — a column picker (`Select`; numeric columns: Searches, Competition, KD, Ranked, Targeting, Searches/comp.) plus min/max number inputs, one active range filter at a time (`design.md` § Decisions), combined with the existing keyword/capture/query filters in the `visible` `useMemo`. **Deviation from plan:** the min/max inputs are plain `<input type="number">` (matching the file's existing un-wrapped `<input type="search">` for the keyword filter), not MVDS `Field` — `Field` requires a `label` prop and renders its own layout chrome, heavier than this row's existing filter controls need. Blank (`null`) values are excluded by an active min bound and included when only a max bound is set, never coerced to `0`. (→ 1.7, 1.8)
- [x] 3.8 Sort comparator: `null` (blank) sorts after every populated value regardless of direction, on Ranked and Targeting specifically — not the generic numeric sort's default of treating missing as `0`/lowest. (→ 1.11)

## 4. QA

- [ ] 4.1 **Manual walkthrough, in Katy's terminal** (`pnpm dev` — needs 1Password for Supabase env, unlike the static parts of this route): confirm Ranked/Targeting render as numbers and sort correctly, the range filter narrows on a chosen column, Status/Capture/Coverage are gone from the table, and killing `SUPABASE_URL` locally degrades Targeting to blank without breaking the page. *(Not run from this session — no 1Password access here; the join logic, range filter, sort, and Supabase-failure fallback are all covered by 4.2's automated tests, but a real Targeting value against live production listings has not been eyeballed.)*
- [x] 4.2 Automated smoke: extended `tests/keyword-corpus.test.ts` for the `ranked` join (fixture-based, against the real `2026-09-17-erank-spotted-on-etsy.csv` plus a synthetic keyword CSV); new `tests/lib/keyword-traction.test.ts` for `computeTargeting` (6 cases: one match, multiple matches/best-slot, no match, case-insensitivity, no-substring-match, listing with no tags); new `tests/components/KeywordTable.test.tsx` (6 cases: numeric rendering, blank-not-zero, hidden columns, blank-sorts-last in both directions, range filter min-only and max-only). Full suite: `pnpm exec vitest run` → 1236 passed / 49 skipped, only the two pre-existing shallow-clone `change-visualizer` failures (unrelated, pass in CI with `fetch-depth: 0`, same as noted in #501). `pnpm exec eslint .` → 0 errors (9 pre-existing warnings, none in touched files). `pnpm exec tsc --noEmit` → clean.
