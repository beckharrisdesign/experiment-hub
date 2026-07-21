# method-page

## Human anchor

> "Ultimately I wanted this thing to be structured when I needed it and loose when I needed it which I think openspec schemas support well."

> "I'm in the explore phase of an ambiguous problem, and ideas and explorations are naturally going to collide or overlap. That's good. That's the point of spending as much time as you can on exploration before building. That's design."

(Katy, 2026-07-21 explore session on the stale `/workflow` page. Same session: the page is "for me, first and foremost … my scaffold and my short-term memory," with value for observers second; strict gating was abandoned when OpenSpec arrived at iteration 3–4.)

## Outcomes

- **Who:** Katy — the page is her scaffold and short-term memory for how work moves. Second, outside readers (hiring managers, collaborators, the curious) who want to see the process behind the experiments, including the failures.
- **Job:** Replace the stale `/workflow` page — which documents a strict 4-step gated UI deleted by `stop-the-leaks` — with a `/method` page that describes the process as it actually runs: one loop at variable depth, twin probe families that kill ideas cheaply, and exits that are always one decision away.
- **Done when:**
  1. `/method` renders a hero with the thesis ("Structured when I need it, loose when I don't. Every idea runs the same loop — only the depth changes.") and a hand-counted receipts line (experiments · killed · graduated · live) above the fold. Counts are static in v1 and must match the homepage table at time of writing.
  2. **The Loop** section names explore → propose → apply → archive with a one-line plain-English gloss each, states two principles — *states, not gates* (discipline comes from artifacts being cheap and exits always available, not from enforcement) and *explore is deliberately the longest phase* (collisions are cheap in explore and expensive in apply) — and shows the depth dial as one real side-by-side: a small fix's entire ceremony next to a full change's artifact trail, both linking to real merged PRs.
  3. **The Probes** section presents data-driven and design-driven probes as equal siblings, each with a verbatim kill-quote ("TAM just isn't big enough" / "too complex a UX footprint to consider building"), frames B·P·C·$·S as a ranking instrument rather than objective truth, and links to `/scoring`.
  4. **The Exit** section names ship / kill / park / graduate, states that exit is available at every gate (not a final stage), states the ledger rule — *lessons become diffs, not journal entries; the story is derived from commits, PRs, and artifacts, never written alongside them* — and shows at least two named real experiments with a one-line "what it taught" each (hand-written in v1). Parks carry a wake condition; kills carry a reason.
  5. **One real week** closes the page: a short dated ledger excerpt (the 2026-07-17 → 07-21 `tell-the-story` slice) in "Katy said → we made → receipt" form, every receipt a real link (PR, commit, Figma file).
  6. **The stack** renders as a slim strip near the footer — OpenSpec (schemas are the depth dial), Notion (state + scores), Figma + MVDS (design probes), the hub (the record) — each glossed in one line and explicitly marked replaceable. Insider vocabulary appears here and nowhere else on the page.
  7. `/workflow` permanently redirects to `/method`; the Header nav label updates. No gate/approval choreography, verdict menus, or approval counts appear anywhere on the page.
  8. The dead code the old page orphaned is retired: `components/WorkflowCells.tsx`, `lib/workflow-states.ts`, `components/ScoreDisplay.tsx`, `components/ExperimentList.tsx` and their tests are removed (or the tests rewritten against the new page), and the homepage's false "Click to see breakdown" tooltip promise is corrected.
- **Not doing:** Live data (kill counts, exit examples, and the week ledger wire up to `publish-the-graveyard`, `outcomes-column`, and `tell-the-story` in a later change — v1 is fully static and true by hand). No per-experiment history (that is `tell-the-story`'s job — this page describes the process; that change documents it per experiment). No Founder-intent PR-template line and no Figma-comment mining (both feed `tell-the-story`'s generator; separate changes). No new score-breakdown UI. No changes to `/scoring`.

## Why

`/workflow` is the most wrong page on the public site. It documents a strict 4-step gated UI ("only the next available step is offered as an action") whose implementation was deleted by `stop-the-leaks` — the gating components survive only as dead code reachable from tests — and whose philosophy was explicitly abandoned when the process moved to OpenSpec ("Phases are states, not stage-gates," `openspec/schemas/bhd-experiment/schema.yaml`). Meanwhile the parts of the process that survived four framework iterations — the loop, the twin probes, cheap exits, receipts — appear nowhere public.

The 2026-07-17 investor review found the site "shows process but not evidence." The replacement page answers that on its own terms: every claim it makes is either hand-counted, verbatim-quoted, or linked to a merged PR. It ships static now precisely to avoid the failure mode that produced the current page — describing a system before it exists.

## What changes

- `app/method/page.tsx` — new page: hero + receipts, Loop, Probes, Exit, one-real-week ledger, stack strip. Static content, hub design tokens, no client state.
- `app/workflow/` — replaced by a permanent redirect to `/method` (`next.config.js` redirect or route-level `redirect()`).
- `components/Header.tsx` — nav label/href update.
- Deletions: `components/WorkflowCells.tsx`, `lib/workflow-states.ts`, `components/ScoreDisplay.tsx`, `components/ExperimentList.tsx`, `tests/workflow-sync.test.tsx`, `tests/components/WorkflowCells.test.tsx`, `tests/lib/workflow-states.test.ts` (plus any orphaned imports).
- `app/page-client.tsx` — correct the score tooltip ("Click to see breakdown" promises a breakdown the detail page doesn't render).
- Tests: new render test for `/method` (sections present, receipts line matches fixture counts, redirect works); sitemap test updated if it enumerates `/workflow`.

## Capabilities

### New Capabilities

- `method-page`: A public `/method` page describing the working method — loop at variable depth, twin probes, always-available exits — with every claim receipt-linked or hand-counted, replacing the stale `/workflow`.

### Modified Capabilities

(none)

## Impact

- `app/method/`, `app/workflow/`, `components/Header.tsx`, `app/page-client.tsx`, deletions listed above, `tests/`
- Ordering: independent — no hard blocks. Pairs with `publish-the-graveyard` + `outcomes-column` (future live receipts) and `tell-the-story` (the ledger mechanism this page excerpts once).
- Content dependency: receipts line and exit examples need a hand-count against the live homepage table at write time.

## Optional links

- Related changes: `openspec/changes/tell-the-story/`, `openspec/changes/publish-the-graveyard/` (proposal), `openspec/changes/outcomes-column/` (proposal)
- Scoring rubric: `rules/scoring-criteria.mdc` (dimensions + score shapes)
- Old page being replaced: `app/workflow/page.tsx`, `lib/workflow-states.ts`
