# tasks — keyword-explorer-etsy-traction

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 A keyword with one matching listing shows its position
- [ ] 1.2 A keyword with multiple ranking listings shows the best position
- [ ] 1.3 A keyword with no ranking match shows a blank cell
- [ ] 1.4 A keyword that is a tag on one listing shows its slot number
- [ ] 1.5 A keyword tagged on multiple listings shows the earliest slot
- [ ] 1.6 A keyword absent from every listing's tags shows a blank cell
- [ ] 1.7 A minimum or maximum narrows the table
- [ ] 1.8 A range filter applies to Ranked and Targeting the same as any other numeric column
- [ ] 1.9 Status, Capture and Coverage are absent from the table
- [ ] 1.10 The underlying data for all three is unchanged
- [ ] 1.11 Blank cells sort after populated ones, not as zero

## 2. Prototype shell

- [ ] 2.1 No `experiments/<slug>/prototype/` — hub platform work extending the shipped `keyword-explorer` route, same as that change itself (`rules/openspec-workflow.mdc` § Shared hub behavior). The shell is `app/keyword-explorer/page.tsx`.

## 3. Implementation

- [ ] 3.1 `types/index.ts`: add `RankedMatch { best: number; matches: { listing: string; page: number; position: number }[] }` and `TargetingMatch { best: number; matches: { listingId: number; slot: number }[] }`. Extend `KeywordRow` with `ranked: RankedMatch | null` (static, from the corpus) and `targeting: TargetingMatch | null` (request-time, merged by the page — present on every row object by the time it reaches `KeywordTable`, never `undefined`). (→ 1.1–1.6, 1.11)
- [ ] 3.2 `scripts/ingest-pulls.py`: `build_corpus()` gains a pass reading every `erank-spotted-on-etsy` CSV in `docs/pulls/` — match `Search Term` against corpus keywords case-insensitive exact, attach `ranked` (best position + full listing/page/position list) onto the matching keyword row, `null` when no match. Wired into the existing `--apply` run; no new CLI flag. (→ 1.1–1.3, 1.11)
- [ ] 3.3 `lib/keyword-corpus.ts`: parse `ranked` from the raw (snake_case) corpus JSON into camelCase on `toRow()`, same pattern as `foundVia`. No behavior change to existing exports. (→ 1.1–1.3)
- [ ] 3.4 `lib/keyword-traction.ts` (new): pure function `computeTargeting(keywords: string[], snapshots: RawListing[]): Map<string, TargetingMatch>` — case-insensitive exact match of each keyword against every snapshot's `tags` array, 1-based slot index, best = lowest slot across listings, absent keywords simply missing from the map (never a `0` entry). No I/O — unit-testable without Supabase, mirroring `lib/etsy-scorecard.ts`'s pure-functions precedent. (→ 1.4–1.6, 1.11)
- [ ] 3.5 `app/keyword-explorer/page.tsx`: becomes an async server component. Calls `getLatestListingSnapshots()` (`lib/etsy-sync.ts`) inside a try/catch; on success, runs `computeTargeting` and merges each row's `targeting` value onto the statically-loaded corpus rows before rendering; on failure, every row's `targeting` is `null` and the failure is logged server-side only (`console.error`), no banner or partial-page error state (design.md § Decisions — silent degrade). (→ 1.4–1.6, design.md's Supabase-failure decision)
- [ ] 3.6 `components/KeywordTable.tsx`: add `Ranked` and `Targeting` as right-aligned numeric sortable columns (blank cell, not `0`, when the row's value is `null`); remove `Status`, `Capture`, `Coverage` from the rendered `COLUMNS`/`<td>` set (props/row type keep carrying the fields — nothing is deleted from the data passed in). Column order: Keyword, Searches, Competition, KD, Ranked, Targeting, Found via (query), Searches/comp. — per `design.md` § User flow. (→ 1.9, 1.10, 1.11)
- [ ] 3.7 `components/KeywordTable.tsx`: add the range-filter control — a column picker (numeric columns: Searches, Competition, KD, Ranked, Targeting, Searches/comp.) plus min/max `Input` fields (MVDS `Field`), one active range filter at a time (`design.md` § Decisions), combined with the existing keyword/capture/query filters in the `visible` `useMemo`. Blank (`null`) values on the filtered column are excluded by a min bound and included by no max bound, never coerced to `0`. (→ 1.7, 1.8)
- [ ] 3.8 Sort comparator: `null` (blank) sorts after every populated value regardless of direction, on Ranked and Targeting specifically — not the generic numeric sort's default of treating missing as `0`/lowest. (→ 1.11)

## 4. QA

- [ ] 4.1 Manual walkthrough, in Katy's terminal (`pnpm dev` — needs 1Password for Supabase env, unlike the static parts of this route): confirm Ranked/Targeting render as numbers and sort correctly, the range filter narrows on a chosen column, Status/Capture/Coverage are gone from the table, and killing `SUPABASE_URL` locally degrades Targeting to blank without breaking the page.
- [ ] 4.2 Automated smoke: extend `tests/keyword-corpus.test.ts` for the `ranked` join (reusing the existing `build_corpus` test harness against a fixture `erank-spotted-on-etsy` CSV); new `tests/lib/keyword-traction.test.ts` for `computeTargeting` (one match / multiple matches / no match, fixture listings, no Supabase); new component-level test for `KeywordTable`'s range filter and blank-sorts-last behavior — there is no existing `KeywordTable` test to extend, so this is new coverage, not an addition to one. `pnpm exec vitest run`, `pnpm exec eslint .`, `pnpm exec tsc --noEmit` all clean.
