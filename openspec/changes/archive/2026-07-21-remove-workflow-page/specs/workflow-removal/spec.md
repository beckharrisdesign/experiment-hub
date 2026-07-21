# workflow-removal — spec

## Outcomes

See [proposal.md](../../proposal.md) — remove the stale `/workflow` page and the dead code it orphaned; the method narrative lives in Notion.

- **Who:** Katy (no public page asserting an abandoned process) and outside readers (nothing on the site claims mechanics that don't exist).
- **Job:** `/workflow` stops existing as a page, old links land somewhere sensible, and the repo stops carrying the gating code that only tests could reach.
- **Done when:** the five requirements below hold.
- **Not doing:** no `/method` app page (copy lives in Notion); no `/scoring` changes; no score data-model changes.

## ADDED Requirements

### Requirement: /workflow redirects instead of rendering

Visiting `/workflow` no longer shows the four-step workflow page; it permanently redirects to the homepage so external links don't break.

**Fails until:** `app/workflow/` is deleted and a permanent (308) redirect from `/workflow` to `/` is configured.

#### Scenario: Old links land on the homepage

- **WHEN** a visitor opens `labs.beckharrisdesign.com/workflow` from an old link
- **THEN** they are permanently redirected to `/` and no workflow content renders

### Requirement: Navigation no longer offers Workflow

The site header does not link to a workflow page on any route.

**Fails until:** the Workflow item is removed from `components/Header.tsx`.

#### Scenario: Header has no Workflow link

- **WHEN** a visitor views any public page
- **THEN** the header nav contains no link to `/workflow` (or `/method`)

### Requirement: Orphaned workflow code is deleted

The components and fixtures that implemented the old gated workflow — reachable only from tests since `stop-the-leaks` — are removed along with their tests, leaving no orphaned imports.

**Fails until:** `components/WorkflowCells.tsx`, `lib/workflow-states.ts`, `components/ScoreDisplay.tsx`, `components/ExperimentList.tsx`, `tests/workflow-sync.test.tsx`, `tests/components/WorkflowCells.test.tsx`, and `tests/lib/workflow-states.test.ts` are deleted and nothing imports them.

#### Scenario: Dead code and its tests are gone

- **WHEN** the repo is searched for the deleted modules
- **THEN** no source file references them, and the build and test suite pass without them

### Requirement: Score tooltip stops promising a breakdown

The homepage score column's tooltip no longer says "Click to see breakdown" — the detail page renders no per-dimension breakdown, so the tooltip describes only what exists.

**Fails until:** the tooltip copy in `app/page-client.tsx` is corrected.

#### Scenario: Tooltip matches reality

- **WHEN** a visitor hovers the score column header on the homepage
- **THEN** the tooltip describes the score without promising a breakdown view

### Requirement: Build and CI stay green through the removal

Sitemap and CI tests that enumerate `/workflow` are updated for the route's removal; type-check, build, and the full test suite pass.

**Fails until:** `tests/ci/sitemap-workflow.test.ts` reflects the removal and `tsc --noEmit` + vitest pass.

#### Scenario: Suite passes after removal

- **WHEN** CI runs on the removal branch
- **THEN** type-check, build, and all tests pass, with no test still expecting `/workflow` in the sitemap
