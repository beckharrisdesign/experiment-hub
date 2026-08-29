# Tasks — openspec-change-visualizer

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 An active change opens
- [ ] 1.2 An archived change opens
- [ ] 1.3 A barely-started change still opens
- [ ] 1.4 The current stage is marked
- [ ] 1.5 A gate that was revisited is marked as revisited
- [ ] 1.6 A gate older than its rule is not counted against the change
- [ ] 1.7 Each outcome carries its evidence kind
- [ ] 1.8 Outcomes that cannot be mapped say so
- [ ] 1.9 Each capability is listed with its requirements
- [ ] 1.10 Every event names its stage
- [ ] 1.11 A quiet stretch is shown with its length
- [ ] 1.12 Two gates in one commit are named together
- [ ] 1.13 A committed image is shown
- [ ] 1.14 A recorded Figma frame is fetched
- [ ] 1.15 No artifact means no empty frame
- [ ] 1.16 Work that shipped but is still unchecked
- [ ] 1.17 A task still waiting on a pull request that merged
- [ ] 1.18 Sources that agree produce nothing
- [ ] 1.19 Both readings are stated
- [ ] 1.20 Nothing is written back

## 2. Reading the sources

**No prototype shell.** This ships as a route in the hub app, not under `experiments/<slug>/prototype/`. Dev command is the README's: `pnpm dev` → <http://localhost:3000>.

- [ ] 2.1 Change resolver: `<id>` → `openspec/changes/<id>/`, falling back to `openspec/changes/archive/YYYY-MM-DD-<id>/`. Extend `lib/openspec-server.ts`, which already resolves change directories for the experiment bridge. (→ 1.1, 1.2)
- [ ] 2.2 Artifact history from git: first commit that added each artifact, **and every later commit that touched it**, so a revisit is visible rather than collapsed to one date. Do not pipe `git log` through `head`/`tail` — RTK truncates before the pipe and gives confidently wrong answers; use `rev-list` / explicit formats. (→ 1.4, 1.5, 1.12)
- [ ] 2.3 Consume `openspec status --change <id> --json` for gate definition and completion, rather than re-deriving it from file presence. (→ 1.4)
- [ ] 2.4 `tasks.md` parser: checkbox states including `[~]` partial, section headings, and the `(→ 1.4, 1.5)` back-references. (→ 1.7, 1.8)
- [ ] 2.5 Spec parser: capability folders, `### Requirement:` counts, `#### Scenario:` titles per capability. (→ 1.9)
- [ ] 2.6 **Evidence-kind classification from back-references.** The kind is derivable, not guessed: a §4 item naming a test file → `automated test`; a §2/§3 implementation item → `code path`; an item marked authoring-time or not-enforced-by-code → `human review`; an item marked DEFERRED → `deferred`. An outcome with no back-reference pointing at it → `not stated`. Validate against `tell-the-story` (5 test / 3 code / 2 human / 1 deferred). (→ 1.7)
- [ ] 2.7 Detect when §1 is not spec scenarios — `pdf-metadata-viewer-cloud` organises ten workstreams — and report the honest total instead of splitting. (→ 1.8)
- [ ] 2.8 Pull request attribution. **The weakest link (design.md risk 1).** Rule: branch name `<harness>/<change-name>`, plus commits touching `openspec/changes/<id>/`, plus an optional explicit list in the change folder. Log what the rule drops rather than silently under-reporting. Check against `tell-the-story` (11 PRs) and `pdf-metadata-viewer-cloud` (2). (→ 1.10)
- [ ] 2.9 Rule-start dates so a gate can report **predates the gate**: the Figma gate merged 2026-07-20 19:10:11Z in #305, and `tell-the-story`'s design merged 43 minutes earlier in #304. Fifteen archived changes are older still. (→ 1.6)
- [ ] 2.10 `design.md` Figma reference parser: file key, page name, frame node id from the Visual design table. (→ 1.14)

## 3. Implementation

- [ ] 3.1 Route `app/changes/[id]/page.tsx` inside the hub shell. Use a literal segment name that does not collide with an existing dynamic param convention (`project_api_route_param_convention` — `[id]` vs `[slug]` conflicts pass build and 504 in production). (→ 1.1, 1.2, 1.3)
- [ ] 3.2 Intent statement: anchor text verbatim at the ends, generated summary in the middle, three sentences, opening `This change is about…`. Never paraphrase the anchor — it must stay checkable against `proposal.md`. (→ 1.1)
- [ ] 3.3 Stage rail with the display mapping from design.md decision 1 (`specs`→requirements, `apply`→build, `archive`→archived), plus revisited and predates-the-gate states. (→ 1.4, 1.5, 1.6)
- [ ] 3.4 Outcome list — every outcome, its evidence kind, its colour; no aggregate count. Capability rows with requirement counts. (→ 1.7, 1.8, 1.9)
- [ ] 3.5 Timeline assembly: stage per event, gaps as their own rows with real durations, two-gates-in-one-commit named together, loops marked. (→ 1.10, 1.11, 1.12)
- [ ] 3.6 Artifact resolution: committed PNG under the change's `assets/` first, recorded Figma node id second, nothing third. (→ 1.13, 1.14, 1.15)
- [ ] 3.7 Drift comparator: unchecked task whose behaviour exists in the codebase; task naming a PR that has merged. Cite file and PR. Silent when sources agree. (→ 1.16, 1.17, 1.18)
- [ ] 3.8 Findings state both readings and never assert which is right. (→ 1.19)
- [ ] 3.9 Info affordance for provenance — node ids, file paths, commit stats. Findings stay on the row. Reuse `components/Tooltip.tsx`. (→ 1.7, 1.13)
- [ ] 3.10 Responsive per design.md: stage rail stacks, stage lane becomes a chip, meta drops under the title, evidence kind takes its own line, gutter 34→28, `px-16`→`px-4`. (→ 1.10)
- [ ] 3.11 Read-only by construction: no write path to `openspec/changes/`, asserted structurally the way `tests/lib/append-history.test.ts` asserts insert-only. (→ 1.20)

## 4. QA

- [ ] 4.1 Manual walkthrough on `pnpm dev`: `tell-the-story` (mid-flight, one capability, a loop, two silences), `pdf-metadata-viewer-cloud` (three capabilities, workstream tasks, apply→design loop), an archived change, and a change with only a proposal.
- [ ] 4.2 Automated (vitest, `tests/lib/`): change resolution active + archive + missing; artifact history including a revisit; evidence-kind classification against `tell-the-story`'s known 5/3/2/1 split; workstream detection on `pdf-metadata-viewer-cloud`; gap computation; predates-the-gate against the #304/#305 pair.
- [ ] 4.3 Automated: drift comparator against two known fixtures — `tell-the-story` 3.11 (unchecked, shipped in #399) and `pdf-metadata-viewer-cloud` 2.1b (waiting on #389, merged 2026-08-18) — plus a change with no drift, asserting silence.
- [ ] 4.4 Smoke: render all 46 changes (13 active + 33 archived) without error, and report any that resolve to an empty page.
- [ ] 4.5 Structural: assert no module in the page's import graph writes under `openspec/changes/`.
- [ ] 4.6 `tsc --noEmit` clean and lint green. Ignore the known environmental failures (`EtsySyncPanel` against `@beckharrisdesign/mvds`, stale `.next/` types) per `project_fresh_worktree_env_noise`.
- [ ] 4.7 Visual check against `02.12` at Desktop 1024 and Mobile 480.
