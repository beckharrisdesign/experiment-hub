# remove-workflow-page — tasks

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Old links land on the homepage — visiting `/workflow` permanently redirects to `/`, no workflow content renders
- [ ] 1.2 Header has no Workflow link — desktop and mobile navs offer Experiments · Scoring · Heuristics · Harness only
- [ ] 1.3 Dead code and its tests are gone — no source file references the deleted modules; build and tests pass without them
- [ ] 1.4 Tooltip matches reality — the score column tooltip describes the score without promising a breakdown view
- [ ] 1.5 Suite passes after removal — type-check, build, and all tests green with no test expecting `/workflow` in the sitemap

## 2. Prototype shell

- [x] 2.1 N/A — hub app change, no experiment prototype (see design.md)

## 3. Implementation

- [x] 3.1 Delete `app/workflow/` and add a permanent redirect `/workflow` → `/` in `next.config` (308)
- [x] 3.2 Remove the Workflow entry from `navLinks` in `components/Header.tsx` (single array covers desktop + mobile)
- [x] 3.3 Re-verify orphan status (grep for imports), then delete `components/WorkflowCells.tsx`, `lib/workflow-states.ts`, `components/ScoreDisplay.tsx`, `components/ExperimentList.tsx` and `tests/workflow-sync.test.tsx`, `tests/components/WorkflowCells.test.tsx`, `tests/lib/workflow-states.test.ts`
- [x] 3.4 Correct the score tooltip copy in `app/page-client.tsx` (design decision 3: plain description, points at `/scoring`)
- [x] 3.5 Update the sitemap route list for the removal — actual surface was `scripts/site-map/routes.js` + `tests/site-map/routes.test.ts` (`tests/ci/sitemap-workflow.test.ts` is a name collision: it tests the GitHub Actions sitemap-capture workflow, untouched)

## 4. QA

- [ ] 4.1 Automated: `tsc --noEmit` clean; `vitest` suite passes — locally: 512/512 tests pass, zero references to deleted modules; the only failures (2 tsc errors, 1 test file) are pre-existing `@beckharrisdesign/mvds` resolution in this fresh worktree (files untouched by this change). CI is the authoritative pass.
- [ ] 4.2 Manual walkthrough (dev server): `/workflow` redirects to `/`; header shows four items on desktop and in the mobile menu; score tooltip shows the new copy
