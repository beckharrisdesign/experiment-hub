# tell-the-story — tasks

> Gate: spec + design approved and merged ([#304](https://github.com/beckharrisdesign/experiment-hub/pull/304), 2026-07-20). Ordering dependency cleared — `stop-the-leaks` archived 2026-07-20, so the page History joins is shipped.
>
> **Open decision carried from [design.md](design.md) §Risks — resolved below in §0. §0.1 needs Katy's sign-off before §2 or §3 start.**

## Parked decisions (queue — ask one at a time, never bundled)

Per `rules/principles.mdc` → "Asking for decisions: one at a time". Current ask is **0.1**; everything below waits its turn.

1. ~~**0.1 — Notion storage shape.**~~ ✅ approved by Katy 2026-07-21 — new related table.
2. ~~**2.3 — exemplar experiment.**~~ ✅ **Best Day Ever**, chosen by Katy 2026-07-21 — the "purest" experiment; she wants its narrative trail visible.
3. **3.6 — where the Figma file reference lives.** No per-experiment Figma property exists in Notion; options are a new property or deriving it from `design.md`. Ask when 3.6 is reached.
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
- [ ] 1.4 Generator proposes rollup candidates, writes nothing to Notion
- [ ] 1.5 Generator never mines chat/session transcripts
- [ ] 1.6 A result-claiming entry without an inline number doesn't ship
- [ ] 1.7 A dead experiment's terminal entry agrees with its `Outcome` kill reason
- [ ] 1.8 A month of activity produces a draft entry with no human action
- [ ] 1.9 Previously edited/approved entries are untouched by the job
- [ ] 1.10 A quiet month (or hub-wide-only changes) adds nothing
- [ ] 1.11 Figma named versions and numbered iteration pages count as evidence

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
- [ ] 3.4 Draft generator `scripts/draft-history.ts` (repo-local CLI, **not** a hub route). **Primary source is path-scoped `git log -- experiments/{slug}/`** — history is intact to 2025-11-12 (verified 2026-07-21; proposal's truncation claim retracted), so this alone carries the trail. Supplement with `gh pr list` filtered by title/paths, and a genuine external repo only where one exists and is verified (§2.4). Emits rollup candidates ("pushed 5 PRs focused on foundations") to stdout/markdown for Katy to paste and edit in Notion. **No Notion client import in this file** — that's the structural guarantee behind 1.4. (→ 1.4)
  - Rollup logic must distinguish **experiment-specific** commits from **hub-wide** ones that sweep the folder incidentally (BDE has 3 such: `fdda7ba`, `a78ef49`, `0d25a7c`). Counting those as activity would invent a story — it would show BDE "active" in July when it has been quiet since April.
- [ ] 3.5 Generator source allowlist is explicit and commented: commits, PRs, release notes, Figma versions. No transcript/session/chat path is read. (→ 1.5)
- [ ] 3.6 **Figma source adapter**: read named versions, numbered iteration pages, and comment threads for the experiment's file. Ignore unlabeled autosave points (noise). Needs a per-experiment Figma file reference — no such Notion property exists yet; decide whether to add one or derive it from `design.md`. (→ 1.11)
- [ ] 3.7 **Notion append writer** (`scripts/` only — never imported by the hub app): inserts entries with `Approved` unchecked. Insert-only by construction — no update or delete call exists in the module. Tests assert this. (→ 1.8, 1.9)
- [ ] 3.8 **Watermark / idempotency**: the job must not re-append a month it already covered. Derive coverage from existing rows (max `Date` per experiment, plus `Source`) rather than storing separate state — a re-run over a covered month is a no-op. (→ 1.9)
- [ ] 3.9 **Monthly GitHub Action** invoking 3.7. Needs a Notion token scoped to the History database only. ⚠️ Per `feedback_centralized_secrets`, check existing secret stores before asking Katy for a new key. (→ 1.8)
- [ ] 3.10 **Quiet-month rule**: no activity, or only hub-wide commits that swept the experiment's paths, produces no entry. Reuses the 3.4 experiment-specific vs hub-wide classifier. (→ 1.10)

## 4. QA

- [x] 4.1 Automated (vitest, `tests/lib/notion-history.test.ts`, 16 tests): pure helpers — unapproved filtered out; wrong-experiment filtered out; sort ascending regardless of return order; malformed/missing dates skipped; empty milestone skipped; nothing-qualifies returns `[]`. Plus adapter integration (mocked Notion client) — queries the configured data source, paginates until `has_more` is false, caches within the TTL, returns `[]` without querying for an unknown slug, and throws on a missing env var. (→ 1.1, 1.2, 1.3)
- [ ] 4.2 Automated: generator rollup logic against fixture PR/commit data — counts match the fixture exactly (countable counts, real dates). Assert the module has no Notion write import. (→ 1.4, 1.5)
- [ ] 4.3 Manual walkthrough on the running app: the exemplar experiment shows History below the statements with dates aligned in the gutter; an experiment with no entries shows no band and no heading; unchecking `Approved` in Notion removes that entry within the 60s cache window. (→ 1.1, 1.2, 1.3)
- [ ] 4.4 Content review before publishing the exemplar (Katy, authoring-time — not enforced by code): every result-claiming entry carries its number inline; if the experiment is dead, the terminal entry's reason matches the `Outcome` line. Design decision 3 puts this upstream of layout deliberately. (→ 1.6, 1.7)
- [ ] 4.5 Automated: the append writer inserts only unapproved rows; running the job twice over the same month produces no duplicate; a hand-edited row is byte-identical after a run. (→ 1.8, 1.9)
- [ ] 4.6 Automated: a month with only hub-wide commits yields zero entries (fixture: BDE's `fdda7ba`, `a78ef49`, `0d25a7c`). (→ 1.10)
- [ ] 4.7 `tsc --noEmit` clean; full vitest suite green. *(Read-path slice: my files typecheck clean and 565 tests pass. Two pre-existing failures unrelated to this change — `EtsySyncPanel` + `app/dev/mvds` both fail on `@beckharrisdesign/mvds`, the unadopted shared package, on `main` too.)*
