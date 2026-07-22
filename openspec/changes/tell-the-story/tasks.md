# tell-the-story — tasks

> Gate: spec + design approved and merged ([#304](https://github.com/beckharrisdesign/experiment-hub/pull/304), 2026-07-20). Ordering dependency cleared — `stop-the-leaks` archived 2026-07-20, so the page History joins is shipped.
>
> **Open decision carried from [design.md](design.md) §Risks — resolved below in §0. §0.1 needs Katy's sign-off before §2 or §3 start.**

## Parked decisions (queue — ask one at a time, never bundled)

Per `rules/principles.mdc` → "Asking for decisions: one at a time". Current ask is **0.1**; everything below waits its turn.

1. ~~**0.1 — Notion storage shape.**~~ ✅ approved by Katy 2026-07-21 — new related table.
2. ~~**2.3 — exemplar experiment.**~~ ✅ **Best Day Ever**, chosen by Katy 2026-07-21 — the "purest" experiment; she wants its narrative trail visible.
3. ~~**3.6 — where the Figma file reference lives.**~~ ✅ resolved-by-moot 2026-07-22 — BDE has no Figma (landing-page-only), so the adapter isn't needed for the exemplar; deferred to a future Figma-rich experiment (see §3.6).
4. Branch naming for this PR (cosmetic — will drop unless raised).
5. GitHub MCP re-auth + the stale `mcp__github__*` allowlist entries in `.claude/settings.json` (optional; `gh` works today — see the scratchpad tee-up).

## 0. Storage-shape decision (resolve first)

- [x] 0.1 **Decided 2026-07-21 (Katy): related database**, not row properties or child blocks. Rationale below; created as §2.1.

  Live schema (verified 2026-07-21, data source `collection://399b908d-7b37-80cb-beb5-000b54ca2967`) has no timeline field, and none of the existing 24 properties can carry 5–10 dated entries.

  | Option | Verdict |
  | --- | --- |
  | Rich-text property on the row | ✗ 5–10 entries in one blob — fragile parsing, no per-entry approval, poor hand-editing |
  | Child blocks under a `## History` heading | ✗ Natural to write, but per-entry approval has nowhere to live; needs an extra `blocks.children.list` call and a parsing convention |
  | **Separate "BHD Labs History" database, related to BHD Labs Database** | ✓ **Recommended** |

  The related-DB shape is the only one that satisfies the spec's per-entry approval gate ("only approved entries publish") cleanly, and it reuses the `Public` checkbox precedent already in the codebase. Proposed schema:

  | Property | Type | Notes |
  | --- | --- | --- |
  | `Milestone` | title | The one-sentence entry |
  | `Date` | date | Month-level; day ignored on render |
  | `Experiment` | relation → BHD Labs Database | The join key |
  | `Approved` | checkbox | Gate — unchecked never renders (mirrors `Public`) |
  | `Receipt URL` | url | Optional; **not rendered in v1** (chips deferred), stored for provenance |
  | `Source` | rich_text | Optional; where the generator drew it from (e.g. "PR #142–#147") |

  > **Type naming:** the Notion MCP's schema view labels this `text`, but the REST API the hub actually uses calls it `rich_text` — see `prop.rich_text` in `formatNotionProperty` ([lib/notion-experiments.ts](../../../lib/notion-experiments.ts) L189). `rich_text` is the name that matters when writing the adapter.

- [ ] 0.2 Confirm the entry cap is guidance, not enforcement — proposal says "roughly 5–10 entries"; render whatever is approved.

## 1. User outcomes (from spec scenarios)

- [x] 1.1 Approved entries render chronologically (ascending, month-level dates) — `selectApprovedEntries` sort + `formatMonthYear`, tested
- [x] 1.2 No approved entries hides the section entirely — `History` returns null; `showNarrative` drops the band when statements + history are both empty
- [x] 1.3 Only approved entries publish; unapproved/draft never render — `Approved === true` filter, tested
- [x] 1.4 Generator proposes rollup candidates, writes nothing to Notion — `scripts/draft-history.ts`, no Notion import (asserted by test)
- [x] 1.5 Generator never mines chat/session transcripts — sources are git commits + PRs (+ Figma seam) only
- [ ] 1.6 A result-claiming entry without an inline number doesn't ship — authoring-time rule (§4.4), not code
- [ ] 1.7 A dead experiment's terminal entry agrees with its `Outcome` kill reason — authoring-time rule (§4.4), not code
- [x] 1.8 A month of activity produces a draft entry with no human action — append writer + monthly Action (Action is manual-only until approved, see §3.9)
- [x] 1.9 Previously edited/approved entries are untouched by the job — insert-only writer + month watermark, tested
- [x] 1.10 A quiet month (or hub-wide-only changes) adds nothing — classifier + quiet-month rule, tested against BDE's real hub-wide commits
- [ ] 1.11 Figma named versions and numbered iteration pages count as evidence — **deferred with §3.6** (seam wired; BDE has no Figma so it's moot for the exemplar; build against a Figma-rich experiment later)

## 2. Notion setup (manual, gating §3)

- [x] 2.1 **Created 2026-07-21** — "BHD Labs History" under **Beck Harris Design**, schema per §0.1. Two-way relation to BHD Labs Database (adds a synced `History` property there, so entries are visible from the experiment row too).
  - Database: https://app.notion.com/p/85a672d61e1c48449e09755a5fdfa8af
  - Data source: `b68916bb-235e-411b-827d-7dfc0c0f0a07`
- [ ] 2.2 Add the data source ID above to env as `NOTION_HISTORY_DATA_SOURCE_ID` (local `.env.local` + Vercel). Follows the `NOTION_EXPERIMENTS_DATA_SOURCE_ID` pattern in [`lib/notion-experiments.ts` L279](../../../lib/notion-experiments.ts). ⚠️ Also confirm the hub's Notion integration has access to the new database — Notion integrations are granted per-page, so a new DB is invisible to the app until shared with it.
- [ ] 2.3 Author the exemplar history by hand — **Best Day Ever** (chosen 2026-07-21), ~5–7 entries — to validate the shape before the generator exists. Evidence below (folded in from session scratch so it travels with the change).

  **The trail** — 22 commits under `experiments/best-day-ever/`, `public/landing/best-day-ever/`, and its test, spanning 2026-03-09 → 2026-07-20 (hub history reaches all the way back to the repo's root commit on 2025-11-12 — nothing is truncated; see §3.4). Four clusters:

  | Cluster | When | What the commits show |
  | --- | --- | --- |
  | **Launch, one day** | 2026-03-09 | PRD (tactile-first framing), landing content, ad-campaign content, and a deployed phase-1 landing with Vercel CI/CD — all in a single day. Fastest zero-to-live in the trail. |
  | **Polish & rigor** | 2026-03-23 → 2026-03-30 | Voice & tone copy audit, inline-SVG fixes, landing-submission API tests, removed a welcome-email reference. The work of someone expecting real traffic. |
  | **The reframe** | 2026-04-20 → 2026-04-26 | Pricing removed from the PRD, validation refocused on demand, business case + Overview revised, PRD outcomes leaned. A documented change of mind ~3 weeks after launch. |
  | **Silence** | after 2026-04-26 | No BDE-specific work. Every later commit touching these paths is hub-wide infra that swept the folder incidentally (`fdda7ba`, `a78ef49`, `0d25a7c` — the §3.4 quiet-month fixtures). |

  Suggested ~5–7 entries: one per cluster + the launch + a terminal entry. Any result claim carries its number inline or it doesn't ship.

  - ⚠️ **The trail can't answer *why* — only Katy can, and this is the whole point of the exemplar:**
    - What phase-1 actually got (visits/signups) — no analytics numbers live in the repo.
    - What prompted the 2026-04-20 reframe.
    - Where BDE stands: it's **stalled in Validating** (confirmed by Katy, 2026-07-21) — she drafted the ad campaign but balked at running it, because it relied on an email-list signup she didn't believe in. That principled stop is invisible in the commits and is the strongest entry the page can carry. It's also the terminal entry, which gates Requirement 4 (must agree with `Outcome`).
    - Note: Notion `Status` reads "Validating" but the enum has no paused/stalled/dead value — a gap that belongs to `publish-the-graveyard`, not here.
- [ ] 2.4 ⚠️ Note for §3.4: the repo property is lowercase **`repo`** (`rich_text`), not `Repo`. It is unreliable — Best Day Ever's points at a nonexistent repo — so the generator must verify before trusting it. Moot for BDE now that hub history is confirmed intact (see §3.4).

## 3. Implementation

- [x] 3.1 New adapter `lib/notion-history.ts` — `getHistoryForExperiment(slug)` returns `HistoryEntry[]` filtered to `Approved === true`, sorted date-ascending. Own 60s TTL cache. Read-only — **no write path in this module**. Resolves slug→page id via a new `getExperimentPageIdFromNotion` in the experiments adapter (History relates by page id, not slug). (→ 1.1, 1.3)
- [x] 3.2 `formatMonthYear` — renders `Date` as `Mon YYYY`, ignoring day. Parses the string directly (timezone-agnostic) and returns null for missing/malformed dates so the entry is skipped, never `Invalid Date`. (→ 1.1)
- [x] 3.3 `app/experiments/[slug]/page.tsx`: History band below the statements. 88px mono/tabular gutter (right-aligned, stacks over the sentence at `<sm`), 13px muted dates, `HISTORY` uppercase label. Empty → renders nothing. **Visual sign-off deferred to 4.3** — needs live entries + the env var, not observable locally. (→ 1.1, 1.2)
- [x] 3.4 Draft generator `scripts/draft-history.ts` (repo-local CLI, **not** a hub route). Primary source path-scoped `git log`; supplemented by `gh pr list`. Rollup logic in `lib/history-rollup.ts` (pure, no imports). **No Notion import** (asserted). Emits a review block or `--json`. (→ 1.4)
  - **Classifier — discovery from the real dry run:** the experiment-specific vs hub-wide split needed two rules, both found by running against BDE:
    1. A bare `gh --search "<slug>"` full-text match pulled in **63 unrelated PRs** in one month. Fixed to `<slug> in:title`.
    2. File-fraction alone wasn't enough. Real `fdda7ba` is a *platform auth refactor* whose files are 64% BDE — it passed the ≥0.5 fraction and falsely showed BDE active in June. Added: platform commit types (`ci`, `build`, `chore`, `refactor`, `perf`) are excluded unless the commit's conventional-commit **scope names the experiment**. The two pure-CI commits (`a78ef49`, `0d25a7c`) are excluded by fraction.
  - Validated: `tsx scripts/draft-history.ts best-day-ever` now yields exactly **Mar 2026 + Apr 2026**, then silence — the true trail.
- [x] 3.5 Source allowlist explicit + commented in `draft-history.ts`: git commits, PRs (+ Figma seam). No transcript/session/chat path exists. (→ 1.5)
- [ ] 3.6 **Figma source adapter — DEFERRED (not needed for the BDE exemplar).** Resolved 2026-07-22: Katy confirmed Best Day Ever has **no Figma** — it's landing-page-only, no design file with versions/iterations to mine. So Figma contributes nothing to this exemplar, and the commits+PRs generator is sufficient. The seam stays wired (`RollupSources.figmaVersions`, `gatherEvidence` returns `[]`, `rollupByMonth` folds them in), and Figma remains a first-class source in the spec. **Build it later against a Figma-rich experiment** — building blind, with no real design trail to validate against, would risk the same "invent activity" errors the commit classifier hit. The per-experiment Figma-reference storage decision (Notion property vs `design.md`) rides along with that future work. (→ 1.11)
- [x] 3.7 **Notion append writer** `scripts/append-history.ts` (never imported by the hub app): inserts with `Approved` unchecked. Insert-only by construction — only `pages.create`; a test greps the source to assert no update/delete/archive. **Dry-run by default**; writes only with `--write`. (→ 1.8, 1.9)
- [x] 3.8 **Watermark / idempotency**: `filterUncoveredMonths` skips any month already present for the experiment (coverage read from existing rows' `Date`, no separate state). Re-run is a no-op — tested. (→ 1.9)
- [~] 3.9 **Monthly GitHub Action** `.github/workflows/history-accumulate.yml` — written, but **`schedule` is commented out** and the workflow is **manual-dispatch, dry-run by default**. Deliberately not live: the first real write is Katy's call. To turn on: provision secrets (⚠️ check whether `NOTION_TOKEN` already exists in Actions secrets before adding — `feedback_centralized_secrets`), run a manual dry run, then a manual `write=true`, then uncomment `schedule`. (→ 1.8)
- [x] 3.10 **Quiet-month rule**: no scoped activity → no entry; a month of only hub-wide commits → no entry. Tested against BDE's real `fdda7ba` / `a78ef49` / `0d25a7c`. (→ 1.10)

## 4. QA

- [x] 4.1 Automated (vitest, `tests/lib/notion-history.test.ts`, 16 tests): pure helpers — unapproved filtered out; wrong-experiment filtered out; sort ascending regardless of return order; malformed/missing dates skipped; empty milestone skipped; nothing-qualifies returns `[]`. Plus adapter integration (mocked Notion client) — queries the configured data source, paginates until `has_more` is false, caches within the TTL, returns `[]` without querying for an unknown slug, and throws on a missing env var. (→ 1.1, 1.2, 1.3)
- [x] 4.2 Automated (`tests/lib/history-rollup.test.ts`, 19 tests): classifier (experiment-specific vs platform/CI/repo-init), conventional-prefix parse, count-based milestone formatting, month grouping + ordering, quiet-month → `[]`, hub-wide-only month → `[]`, watermark filtering. Plus `tests/lib/append-history.test.ts` asserts the generator has **no Notion import**. (→ 1.4, 1.5, 1.10)
- [ ] 4.3 Manual walkthrough on the running app: the exemplar experiment shows History below the statements with dates aligned in the gutter; an experiment with no entries shows no band and no heading; unchecking `Approved` in Notion removes that entry within the 60s cache window. (→ 1.1, 1.2, 1.3)
- [ ] 4.4 Content review before publishing the exemplar (Katy, authoring-time — not enforced by code): every result-claiming entry carries its number inline; if the experiment is dead, the terminal entry's reason matches the `Outcome` line. Design decision 3 puts this upstream of layout deliberately. (→ 1.6, 1.7)
- [x] 4.5 Automated (`tests/lib/append-history.test.ts`, 8 tests): dry run writes nothing; `--write` inserts each uncovered month with `Approved: false`, correct relation + first-of-month date; a month already present is skipped; all-present → zero creates (re-run no-op); missing env + missing experiment row throw. Insert-only asserted structurally. (→ 1.8, 1.9)
- [x] 4.6 Covered by 4.2 — hub-wide-only month yields zero entries, fixtures are BDE's real `fdda7ba` / `a78ef49` / `0d25a7c`. (→ 1.10)
- [x] 4.7 `tsc --noEmit` clean for all new files; **555 tests pass** (43 new: rollup 19, append 8, plus read-path 16). Unrelated pre-existing failures only: `EtsySyncPanel` on `@beckharrisdesign/mvds`, and stale `.next/` types referencing the removed `/workflow` page — both environmental, not this change (see `project_fresh_worktree_env_noise`).
