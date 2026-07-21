# remove-workflow-page — tasks

## 1. User outcomes (from spec scenarios)

- [x] 1.1 Old links land on the homepage — verified live 2026-07-21: `curl -I labs.beckharrisdesign.com/workflow` → HTTP/2 308 → `/`
- [x] 1.2 Header has no Workflow link — verified live 2026-07-21: homepage HTML contains zero `href="/workflow"`; nav renders Experiments · Scoring · Heuristics · Harness
- [x] 1.3 Dead code and its tests are gone — repo sweep clean; CI (Feature tests ×2) green without them
- [x] 1.4 Tooltip matches reality — copy now `{total}/25 across five scoring dimensions — see /scoring.` (code-verified; deployed with #316)
- [x] 1.5 Suite passes after removal — CI green on #316 and on main post-merge; sitemap route list asserts 4 hub routes

## 2. Prototype shell

- [x] 2.1 N/A — hub app change, no experiment prototype (see design.md)

## 3. Implementation

- [x] 3.1 Delete `app/workflow/` and add a permanent redirect `/workflow` → `/` in `next.config` (308)
- [x] 3.2 Remove the Workflow entry from `navLinks` in `components/Header.tsx` (single array covers desktop + mobile)
- [x] 3.3 Re-verify orphan status (grep for imports), then delete `components/WorkflowCells.tsx`, `lib/workflow-states.ts`, `components/ScoreDisplay.tsx`, `components/ExperimentList.tsx` and `tests/workflow-sync.test.tsx`, `tests/components/WorkflowCells.test.tsx`, `tests/lib/workflow-states.test.ts`
- [x] 3.4 Correct the score tooltip copy in `app/page-client.tsx` (design decision 3: plain description, points at `/scoring`)
- [x] 3.5 Update the sitemap route list for the removal — actual surface was `scripts/site-map/routes.js` + `tests/site-map/routes.test.ts` (`tests/ci/sitemap-workflow.test.ts` is a name collision: it tests the GitHub Actions sitemap-capture workflow, untouched)

## 4. QA

- [x] 4.1 Automated: `tsc --noEmit` clean; `vitest` suite passes — locally 512/512 tests pass with zero references to deleted modules (only failures were pre-existing `@beckharrisdesign/mvds` resolution in a fresh worktree, files untouched); CI authoritative pass on PR #316: Feature tests ×2, Live integration tests, Deploy hub all green.
- [x] 4.2 Walkthrough performed against production (post-merge deploy) instead of dev server: redirect 308 ✓, four-item nav ✓, tooltip copy code-verified ✓
