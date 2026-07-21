# remove-workflow-page

## Human anchor

> "I already took the draft and changed it in notion. lets remove the page from the hub app."

> "Ultimately I wanted this thing to be structured when I needed it and loose when I needed it which I think openspec schemas support well."

(Katy, 2026-07-21. This change began as `method-page` — a plan to rewrite `/workflow` as a static `/method` page. During the explore session Katy drafted the replacement copy, moved it to Notion as the living document, and redirected scope: the hub app drops the page instead of rebuilding it. The full method-page conception — loop, probes, exit, receipts — survives in the Notion draft and the Figma pair if a Notion-backed page is wanted later.)

## Outcomes

- **Who:** Katy — no more public page asserting a process she abandoned; the method narrative lives in Notion where she edits it directly. Outside readers — nothing on the site claims mechanics that don't exist.
- **Job:** Remove the stale `/workflow` page — which documents a strict 4-step gated UI deleted by `stop-the-leaks` — from the hub app, along with the dead code it orphaned. The process story is authored and maintained in Notion, not hardcoded in the app.
- **Done when:**
  1. `app/workflow/` is removed. `/workflow` permanently redirects to `/` so external links don't break.
  2. The Header nav no longer offers a Workflow link.
  3. The dead code the old page orphaned is retired: `components/WorkflowCells.tsx`, `lib/workflow-states.ts`, `components/ScoreDisplay.tsx`, `components/ExperimentList.tsx`, and their tests (`tests/workflow-sync.test.tsx`, `tests/components/WorkflowCells.test.tsx`, `tests/lib/workflow-states.test.ts`) are deleted, with no orphaned imports left behind.
  4. The homepage score tooltip no longer promises "Click to see breakdown" — the detail page renders no breakdown, so the tooltip stops claiming one.
  5. Sitemap/CI tests that enumerate `/workflow` are updated; build, `tsc --noEmit`, and the test suite pass.
- **Not doing:** No `/method` page in the app — superseded; the method copy lives in [Notion](https://app.notion.com/p/3a4b908d7b37818e9335d73ac4ee78b0) (Katy's edited draft). A future Notion-backed method/process page (reading approved copy the way `stop-the-leaks` reads statements) is a separate change if wanted. No changes to `/scoring` (live and accurate). No changes to the score data model or homepage columns beyond the tooltip wording.

## Why

`/workflow` is the most wrong page on the public site. It documents a strict 4-step gated UI ("only the next available step is offered as an action") whose implementation was deleted by `stop-the-leaks` — the gating components survive only as test-reachable dead code — and whose philosophy was explicitly abandoned when the process moved to OpenSpec ("Phases are states, not stage-gates," `openspec/schemas/bhd-experiment/schema.yaml`).

The original plan was to rewrite it in place. The explore session produced that rewrite (first-person copy, loop/probes/exit structure, receipts) — and then a better home for it: Notion, where Katy edits it as a living document instead of shipping copy that fossilizes the way `/workflow` did. With the narrative living there, the app page's remaining job is to not exist: removing it deletes a false claim from the public site and ~300 lines of dead code from the repo.

## What changes

- `app/workflow/` — deleted; permanent redirect `/workflow` → `/` (via `next.config` redirect).
- `components/Header.tsx` — Workflow nav item removed.
- Deletions: `components/WorkflowCells.tsx`, `lib/workflow-states.ts`, `components/ScoreDisplay.tsx`, `components/ExperimentList.tsx`, `tests/workflow-sync.test.tsx`, `tests/components/WorkflowCells.test.tsx`, `tests/lib/workflow-states.test.ts`.
- `app/page-client.tsx` — score tooltip wording corrected.
- `tests/ci/sitemap-workflow.test.ts` — updated (or removed) to match the route's removal.

## Capabilities

### New Capabilities

(none — this change removes a surface; no spec-worthy capability is added)

### Modified Capabilities

(none — no existing spec covers the workflow page)

## Impact

- `app/workflow/`, `components/Header.tsx`, `app/page-client.tsx`, `next.config`, deletions listed above, `tests/`
- Ordering: independent — no hard blocks. The Notion method doc and the Figma pair (`method-page — /workflow → /method`, file `SWHDnNKnd1MF1Te0y9YeEJ`) remain the design record for any future Notion-backed process page.
- Risk: external links to `/workflow` — mitigated by the permanent redirect to `/`.

## Optional links

- Method copy (living document): https://app.notion.com/p/3a4b908d7b37818e9335d73ac4ee78b0
- Design record: Figma `method-page — /workflow → /method` — https://www.figma.com/design/SWHDnNKnd1MF1Te0y9YeEJ (01 As-is / 02 Proposed)
- Related changes: `openspec/changes/tell-the-story/`, `openspec/changes/publish-the-graveyard/`, `openspec/changes/outcomes-column/`
- Old page being removed: `app/workflow/page.tsx`, `lib/workflow-states.ts`
