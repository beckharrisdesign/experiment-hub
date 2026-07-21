# remove-workflow-page — tasks

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Old links land on the homepage — visiting `/workflow` permanently redirects to `/`, no workflow content renders
- [ ] 1.2 Header has no Workflow link — desktop and mobile navs offer Experiments · Scoring · Heuristics · Harness only
- [ ] 1.3 Dead code and its tests are gone — no source file references the deleted modules; build and tests pass without them
- [ ] 1.4 Tooltip matches reality — the score column tooltip describes the score without promising a breakdown view
- [ ] 1.5 Suite passes after removal — type-check, build, and all tests green with no test expecting `/workflow` in the sitemap

## 2. Prototype shell

- [ ] 2.1 N/A — hub app change, no experiment prototype (see design.md)

## 3. Implementation

- [ ] 3.1 Delete `app/workflow/` and add a permanent redirect `/workflow` → `/` in `next.config` (308)
- [ ] 3.2 Remove the Workflow entry from `navLinks` in `components/Header.tsx` (single array covers desktop + mobile)
- [ ] 3.3 Re-verify orphan status (grep for imports), then delete `components/WorkflowCells.tsx`, `lib/workflow-states.ts`, `components/ScoreDisplay.tsx`, `components/ExperimentList.tsx` and `tests/workflow-sync.test.tsx`, `tests/components/WorkflowCells.test.tsx`, `tests/lib/workflow-states.test.ts`
- [ ] 3.4 Correct the score tooltip copy in `app/page-client.tsx` (design decision 3: plain description, points at `/scoring`)
- [ ] 3.5 Update `tests/ci/sitemap-workflow.test.ts` for the route's removal (assert redirect or drop the route from the expected sitemap)

## 4. QA

- [ ] 4.1 Automated: `tsc --noEmit` clean; `vitest` suite passes
- [ ] 4.2 Manual walkthrough (dev server): `/workflow` redirects to `/`; header shows four items on desktop and in the mobile menu; score tooltip shows the new copy
