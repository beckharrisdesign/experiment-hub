## 1. User outcomes

- [x] 1.1 User with only `explore.md` sees a single **Explore** tab (not Lifecycle, Propose, Apply, or Archive)
- [x] 1.2 User with `explore.md` and `propose.md` sees **Explore** and **Propose** tabs in schema order
- [x] 1.3 User on Pomodoro Maker (no business case file) does not see a **Business Case** tab or empty-state placeholder
- [x] 1.4 User on an experiment without `docs/PRD.md` does not see a **PRD** tab
- [x] 1.5 User opening a BHD-linked experiment in Explore phase lands on the **Explore** tab active (not Business Case or PRD)
- [x] 1.6 User on the Explore tab sees only Explore markdown in the panel (not stacked propose/apply/archive)
- [x] 1.7 User on Explore-only linked change sees Explore content and **Current phase** indicator for Explore
- [x] 1.8 User on an experiment with no linked OpenSpec change sees only legacy tabs that have file content (hide-if-empty)

## 2. Tab model and detail shell

- [x] 2.1 Add `buildExperimentDetailTabs` (and `resolveDefaultDetailTab`) in `lib/openspec-shared.ts` — phase order, legacy append, trim-empty guard
- [x] 2.2 Update `detail-client.tsx`: build tabs from helper; default `activeTab` from `currentPhase`; remove Lifecycle tab
- [x] 2.3 Handle zero-tab edge case: short message in `main` when no BHD or legacy content

## 3. Phase content panel

- [x] 3.1 Refactor `tabs-content.tsx`: per-phase branch (`explore` | `propose` | `apply` | `archive`) with header bar + `MarkdownContent`; remove stacked Lifecycle layout
- [x] 3.2 Keep legacy Business Case / PRD panels behind hide-if-empty (no placeholder when tab absent)

## 4. QA

- [x] 4.1 Vitest: tab builder — explore-only, multi-phase, legacy append, default tab, no linked change
- [x] 4.2 Manual: `/experiments/pomodoro-maker` — Explore tab only, Explore active, markdown renders; experiment with PRD only still shows PRD tab
