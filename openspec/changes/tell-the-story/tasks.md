# tell-the-story — tasks

> Gate: spec + design approved and merged ([#304](https://github.com/beckharrisdesign/experiment-hub/pull/304), 2026-07-20). Ordering dependency cleared — `stop-the-leaks` archived 2026-07-20, so the page History joins is shipped.
>
> **Open decision carried from [design.md](design.md) §Risks — resolved below in §0. §0.1 needs Katy's sign-off before §2 or §3 start.**

## Parked decisions (queue — ask one at a time, never bundled)

Per `rules/principles.mdc` → "Asking for decisions: one at a time". Current ask is **0.1**; everything below waits its turn.

1. ~~**0.1 — Notion storage shape.**~~ ✅ approved by Katy 2026-07-21 — new related table.
2. **2.3 — exemplar experiment.** Etsy → Notion Sync (richest PR trail) vs Best Day Ever. ← asking now
3. Branch naming for this PR (cosmetic — will drop unless raised).
4. GitHub MCP re-auth + the stale `mcp__github__*` allowlist entries in `.claude/settings.json` (optional; `gh` works today — see the scratchpad tee-up).

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
  | `Source` | text | Optional; where the generator drew it from (e.g. "PR #142–#147") |

- [ ] 0.2 Confirm the entry cap is guidance, not enforcement — proposal says "roughly 5–10 entries"; render whatever is approved.

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Approved entries render chronologically (ascending, month-level dates)
- [ ] 1.2 No approved entries hides the section entirely (silent omission)
- [ ] 1.3 Only approved entries publish; unapproved/draft never render
- [ ] 1.4 Generator proposes rollup candidates, writes nothing to Notion
- [ ] 1.5 Generator never mines chat/session transcripts
- [ ] 1.6 A result-claiming entry without an inline number doesn't ship
- [ ] 1.7 A dead experiment's terminal entry agrees with its `Outcome` kill reason

## 2. Notion setup (manual, gating §3)

- [x] 2.1 **Created 2026-07-21** — "BHD Labs History" under **Beck Harris Design**, schema per §0.1. Two-way relation to BHD Labs Database (adds a synced `History` property there, so entries are visible from the experiment row too).
  - Database: https://app.notion.com/p/85a672d61e1c48449e09755a5fdfa8af
  - Data source: `b68916bb-235e-411b-827d-7dfc0c0f0a07`
- [ ] 2.2 Add the data source ID above to env as `NOTION_HISTORY_DATA_SOURCE_ID` (local `.env.local` + Vercel). Follows the `NOTION_EXPERIMENTS_DATA_SOURCE_ID` pattern in [lib/notion-experiments.ts:279](../../../lib/notion-experiments.ts:279). ⚠️ Also confirm the hub's Notion integration has access to the new database — Notion integrations are granted per-page, so a new DB is invisible to the app until shared with it.
- [ ] 2.3 Author the exemplar history by hand — one experiment, 5–10 entries — to validate the shape before the generator exists. Proposal suggests **Etsy → Notion Sync** (richest real PR trail: #300, #302, #305, #312, #313) or Best Day Ever.
- [ ] 2.4 ⚠️ Note for §3.4: the repo property is lowercase **`repo`** (text), not `Repo`. Per the proposal it is unreliable — Best Day Ever's points at a nonexistent repo — so the generator must verify before trusting it.

## 3. Implementation

- [ ] 3.1 New adapter `lib/notion-history.ts` (sibling, not an extension of `notion-experiments.ts` — different data source, different cache): `getHistoryForExperiment(slug)` returns `{ date, milestone }[]`, filtered to `Approved === true`, sorted date-ascending. Reuse the 60s TTL cache pattern. Read-only — **no write path exists in this module**. (→ 1.1, 1.3)
- [ ] 3.2 Month-date formatting helper: render `Date` as `Mon YYYY` (e.g. "Mar 2026"), ignoring day precision. Guard against missing/malformed dates by skipping the entry rather than rendering `Invalid Date`. (→ 1.1)
- [ ] 3.3 `app/experiments/[slug]/page.tsx`: History band below the narrative statements, above the footer. Per [design.md](design.md): fixed **88px** left gutter, dates mono/tabular **13px** muted right-aligned, sentences **14px** Inter on the **720px** measure, `HISTORY` uppercase label matching the statements' treatment. Zero approved entries → render nothing at all, no heading. At S (480px) collapse the gutter to stacked date-over-sentence, keeping the mono/tabular date. (→ 1.1, 1.2)
- [ ] 3.4 Draft generator `scripts/draft-history.ts` (repo-local CLI, **not** a hub route): reads the `experiment-hub` PR archive via `gh pr list` (survives the git truncation back to PR #1, March 2026) filtered per experiment by title/paths, plus path-scoped `git log -- experiments/{slug}/`, plus a genuine external repo where one exists and is verified (§2.4). Emits rollup candidates ("pushed 5 PRs focused on foundations") to stdout/markdown for Katy to paste and edit in Notion. **No Notion client import in this file** — that's the structural guarantee behind 1.4. (→ 1.4)
- [ ] 3.5 Generator source allowlist is explicit and commented: commits, PRs, release notes only. No transcript/session/chat path is read. (→ 1.5)

## 4. QA

- [ ] 4.1 Automated (vitest, `tests/lib/notion-history.test.ts`): unapproved entries are filtered out; entries sort ascending regardless of Notion return order; malformed/missing dates are skipped; an experiment with no entries returns `[]`. (→ 1.1, 1.2, 1.3)
- [ ] 4.2 Automated: generator rollup logic against fixture PR/commit data — counts match the fixture exactly (countable counts, real dates). Assert the module has no Notion write import. (→ 1.4, 1.5)
- [ ] 4.3 Manual walkthrough on the running app: the exemplar experiment shows History below the statements with dates aligned in the gutter; an experiment with no entries shows no band and no heading; unchecking `Approved` in Notion removes that entry within the 60s cache window. (→ 1.1, 1.2, 1.3)
- [ ] 4.4 Content review before publishing the exemplar (Katy, authoring-time — not enforced by code): every result-claiming entry carries its number inline; if the experiment is dead, the terminal entry's reason matches the `Outcome` line. Design decision 3 puts this upstream of layout deliberately. (→ 1.6, 1.7)
- [ ] 4.5 `tsc --noEmit` clean; full vitest suite green.
