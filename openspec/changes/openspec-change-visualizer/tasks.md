# Tasks — openspec-change-visualizer

## 1. User outcomes (from spec scenarios)

- [x] 1.1 An active change opens
      ↳ verified 2026-08-28 · test 'opens an active change'
- [x] 1.2 An archived change opens
      ↳ verified 2026-08-28 · test 'opens an archived change by its bare id' — resolves exec-function-per-track-cadence from the archive
- [ ] 1.3 A barely-started change still opens
      ↳ not done — no proposal-only fixture is asserted — the code path exists but nothing pins it
- [x] 1.4 The current stage is marked
      ↳ verified 2026-08-28 · test 'marks build as current' on tell-the-story
- [x] 1.5 A gate that was revisited is marked as revisited
      ↳ verified 2026-08-28 · test 'marks a gate that was touched again' — proposal and requirements both revisited by #314
- [x] 1.6 A gate older than its rule is not counted against the change
      ↳ verified 2026-08-28 · test 'reports a gate older than the rule' — design predates the Figma gate by 43 minutes
- [x] 1.7 Each outcome carries its evidence kind
      ↳ verified 2026-08-28 · test 'carries an evidence kind on every outcome'
- [x] 1.8 Outcomes that cannot be mapped say so
      ↳ verified 2026-08-28 · test 'says a workstream task list cannot be split' — pdf-metadata-viewer-cloud, 34/67
- [x] 1.9 Each capability is listed with its requirements
      ↳ verified 2026-08-28 · test 'lists every capability with its requirement count' — 6/7/5
- [x] 1.10 Every event names its stage
      ↳ verified 2026-08-28 · test 'gives every event a stage'
- [x] 1.11 A quiet stretch is shown with its length
      ↳ verified 2026-08-28 · test 'shows a long silence with its real length' — 31 days
- [x] 1.12 Two gates in one commit are named together
      ↳ verified 2026-08-28 · test 'names two gates that landed in one commit' — design + specs share #304
- [ ] 1.13 A committed image is shown
      ↳ not done — assets are listed but not rendered
- [ ] 1.14 A recorded Figma frame is fetched
      ↳ not done — the Figma reference is parsed but not fetched
- [ ] 1.15 No artifact means no empty frame
      ↳ not done — follows 1.13 and 1.14
- [x] 1.16 Work that shipped but is still unchecked
      ↳ verified 2026-08-28 · test 'catches work that shipped while its task stayed unchecked' — 3.11
- [x] 1.17 A task still waiting on a pull request that merged
      ↳ verified 2026-08-28 · test 'catches a task still waiting on a pull request that merged' — 2.1b / #389
- [x] 1.18 Sources that agree produce nothing
      ↳ verified 2026-08-28 · test 'says nothing when a change and the record agree'
- [x] 1.19 Both readings are stated
      ↳ verified 2026-08-28 · test 'states both readings and never picks one'
- [x] 1.20 Nothing is written back
      ↳ verified 2026-08-28 · structural test — no write call and no mutating git command in the module graph

## 2. Reading the sources

**No prototype shell.** This ships as a route in the hub app, not under `experiments/<slug>/prototype/`. Dev command is the README's: `pnpm dev` → <http://localhost:3000>.

- [x] 2.1 Change resolver: `<id>` → `openspec/changes/<id>/`, falling back to `openspec/changes/archive/YYYY-MM-DD-<id>/`. Extend `lib/openspec-server.ts`, which already resolves change directories for the experiment bridge. (→ 1.1, 1.2)
      ↳ lib/change-visualizer/index.ts reuses resolveChangeDir from lib/openspec-server.ts, now exported rather than duplicated
- [x] 2.2 Artifact history from git: first commit that added each artifact, **and every later commit that touched it**, so a revisit is visible rather than collapsed to one date. Do not pipe `git log` through `head`/`tail` — RTK truncates before the pipe and gives confidently wrong answers; use `rev-list` / explicit formats. (→ 1.4, 1.5, 1.12)
      ↳ lib/change-visualizer/git.ts — execFile, never a shell pipe; every commit per artifact, not just the first
- [ ] 2.3 Consume `openspec status --change <id> --json` for gate definition and completion, rather than re-deriving it from file presence. (→ 1.4)
      ↳ not done — the gate set is derived from file presence, not from openspec status --json
- [x] 2.4 `tasks.md` parser: checkbox states including `[~]` partial, section headings, and the `(→ 1.4, 1.5)` back-references. (→ 1.7, 1.8)
      ↳ lib/change-visualizer/tasks.ts — states incl. [~], sections, and (→ 1.4, 1.5) back-references
- [x] 2.5 Spec parser: capability folders, `### Requirement:` counts, `#### Scenario:` titles per capability. (→ 1.9)
      ↳ lib/change-visualizer/specs.ts
- [x] 2.6 **Evidence-kind classification from back-references.** The kind is derivable, not guessed: a §4 item naming a test file → `automated test`; a §2/§3 implementation item → `code path`; an item marked authoring-time or not-enforced-by-code → `human review`; an item marked DEFERRED → `deferred`. An outcome with no back-reference pointing at it → `not stated`. Validate against `tell-the-story` — derived, it is 8 test / 2 human / 1 deferred (see §5). (→ 1.7)
      ↳ lib/change-visualizer/tasks.ts — and it corrected the design's own claim, see the note below
- [x] 2.7 Detect when §1 is not spec scenarios — `pdf-metadata-viewer-cloud` organises ten workstreams — and report the honest total instead of splitting. (→ 1.8)
      ↳ parseTasks().outcomesAreScenarios — false for pdf-metadata-viewer-cloud
- [~] 2.8 Pull request attribution. **The weakest link (design.md risk 1).** Rule: branch name `<harness>/<change-name>`, plus commits touching `openspec/changes/<id>/`, plus an optional explicit list in the change folder. Log what the rule drops rather than silently under-reporting. Check against `tell-the-story` (11 PRs) and `pdf-metadata-viewer-cloud` (2). (→ 1.10)
      ↳ commits touching the change folder, with the method and any unattributed commits reported on the page. Finds 10 PRs for tell-the-story where title-matching found 11 — branch-name matching and an explicit override list are still unbuilt
- [x] 2.9 Rule-start dates so a gate can report **predates the gate**: the Figma gate merged 2026-07-20 19:10:11Z in #305, and `tell-the-story`'s design merged 43 minutes earlier in #304. Fifteen archived changes are older still. (→ 1.6)
      ↳ lib/change-visualizer/gates.ts RULE_STARTS
- [x] 2.10 `design.md` Figma reference parser: file key, page name, frame node id from the Visual design table. (→ 1.14)
      ↳ lib/change-visualizer/design-ref.ts — file key, page and node id

## 3. Implementation

- [x] 3.1 Route `app/changes/[id]/page.tsx` inside the hub shell. Use a literal segment name that does not collide with an existing dynamic param convention (`project_api_route_param_convention` — `[id]` vs `[slug]` conflicts pass build and 504 in production). (→ 1.1, 1.2, 1.3)
      ↳ app/changes/[id]/page.tsx, literal changes/ segment
- [~] 3.2 Intent statement: anchor text verbatim at the ends, generated summary in the middle, three sentences, opening `This change is about…`. Never paraphrase the anchor — it must stay checkable against `proposal.md`. (→ 1.1)
      ↳ the anchor renders verbatim; the three-sentence blend with a generated middle sentence is not built
- [x] 3.3 Stage rail with the display mapping from design.md decision 1 (`specs`→requirements, `apply`→build, `archive`→archived), plus revisited and predates-the-gate states. (→ 1.4, 1.5, 1.6)
      ↳ gates.ts GATE_LABELS + revisited / predatesRule / sharedCommitWith
- [x] 3.4 Outcome list — every outcome, its evidence kind, its colour; no aggregate count. Capability rows with requirement counts. (→ 1.7, 1.8, 1.9)
      ↳ ChangePageView Outcomes + Capabilities
- [x] 3.5 Timeline assembly: stage per event, gaps as their own rows with real durations, two-gates-in-one-commit named together, loops marked. (→ 1.10, 1.11, 1.12)
      ↳ index.ts buildTimeline — stage per event, gaps over 3 days, revisits marked
- [ ] 3.6 Artifact resolution: committed PNG under the change's `assets/` first, recorded Figma node id second, nothing third. (→ 1.13, 1.14, 1.15)
      ↳ not done — no artifact rendering yet
- [x] 3.7 Drift comparator: unchecked task whose behaviour exists in the codebase; task naming a PR that has merged. Cite file and PR. Silent when sources agree. (→ 1.16, 1.17, 1.18)
      ↳ lib/change-visualizer/drift.ts, batched to one git grep per page
- [x] 3.8 Findings state both readings and never assert which is right. (→ 1.19)
      ↳ Finding carries claims and record separately; a test asserts no should/must/wrong/fix in either
- [ ] 3.9 Info affordance for provenance — node ids, file paths, commit stats. Findings stay on the row. Reuse `components/Tooltip.tsx`. (→ 1.7, 1.13)
      ↳ not done — no info affordance yet
- [x] 3.10 Responsive per design.md: stage rail stacks, stage lane becomes a chip, meta drops under the title, evidence kind takes its own line, gutter 34→28, `px-16`→`px-4`. (→ 1.10)
      ↳ ChangePageView responsive classes; visual check is 4.7, still open
- [x] 3.11 Read-only by construction: no write path to `openspec/changes/`, asserted structurally the way `tests/lib/append-history.test.ts` asserts insert-only. (→ 1.20)
      ↳ no write call in lib/change-visualizer, asserted structurally

## 3b. Artifacts on the experiment detail page

Added 2026-08-29 at Katy's request, after the planning artifacts were approved.

- [x] 3b.1 A linked change's artifacts render on `/experiments/[slug]` — its page on the hub, the OpenSpec files, and the committed renders, grouped
      ↳ lib/change-visualizer/artifacts.ts + components/change-visualizer/ChangeArtifacts.tsx, wired into app/experiments/[slug]/page.tsx
- [x] 3b.2 An experiment with no linked change renders no heading at all, matching the detail page's habit of dropping empty bands
      ↳ verified 2026-08-29 · test 'returns nothing for an experiment with no linked change'
- [x] 3b.3 Repo links are absolute so they survive the branch being deleted; only the change page is internal
      ↳ verified 2026-08-29 · asserted in 'lists the change's artifacts, its renders, and its page on the hub'
- [x] 3b.4 The experiment is registered so the page exists — Notion row `OpenSpec Change Visualizer`, `repo` = `openspec-change-visualizer`, which is what resolveOpenSpecChangeId falls back to
      ↳ created 2026-08-29 with three Why: pages · PI 4 / SI 3 / BI 2

## 3c. Known gap, found when another change landed on this branch

`generative-sandbox` uses the `bhd-experiment` schema — `explore.md`, `propose.md`,
`apply.md`, `archive.md` — and the rail is built for the lite artifacts, so it
renders with no dated gates at all. The page still resolves and its history is
right; only the rail is empty.

- [ ] 3c.1 Read the schema from `.openspec.yaml` and build the rail from that
      schema's artifacts, rather than assuming proposal / specs / design / tasks
      ↳ not done — affects any `bhd-experiment` change; two exist today

## 4. QA

- [ ] 4.1 Manual walkthrough on `pnpm dev`: `tell-the-story` (mid-flight, one capability, a loop, two silences), `pdf-metadata-viewer-cloud` (three capabilities, workstream tasks, apply→design loop), an archived change, and a change with only a proposal.
      ↳ not done — manual walkthrough not run — pnpm dev dies in op run on a stale vault reference (project_dev_server_supabase_ref)
- [x] 4.2 Automated (vitest, `tests/lib/`): change resolution active + archive + missing; artifact history including a revisit; evidence-kind classification against `tell-the-story`'s known 5/3/2/1 split; workstream detection on `pdf-metadata-viewer-cloud`; gap computation; predates-the-gate against the #304/#305 pair.
      ↳ verified 2026-08-28 · tests/lib/change-visualizer/tasks.test.ts + page.test.ts
- [x] 4.3 Automated: drift comparator against two known fixtures — `tell-the-story` 3.11 (unchecked, shipped in #399) and `pdf-metadata-viewer-cloud` 2.1b (waiting on #389, merged 2026-08-18) — plus a change with no drift, asserting silence.
      ↳ verified 2026-08-28 · both fixtures plus a no-drift change
- [x] 4.4 Smoke: render all 46 changes (13 active + 33 archived) without error, and report any that resolve to an empty page.
      ↳ verified 2026-08-28 · all 47 change ids resolve and render, none empty
- [x] 4.5 Structural: assert no module in the page's import graph writes under `openspec/changes/`.
      ↳ verified 2026-08-28 · structural test
- [x] 4.6 `tsc --noEmit` clean and lint green. Ignore the known environmental failures (`EtsySyncPanel` against `@beckharrisdesign/mvds`, stale `.next/` types) per `project_fresh_worktree_env_noise`.
      ↳ verified 2026-08-28 · tsc reports 0 errors in this change's files (2 pre-existing errors inside node_modules/@vitejs/plugin-react); eslint clean
- [ ] 4.7 Visual check against `02.12` at Desktop 1024 and Mobile 480.
      ↳ not done — visual check against 02.13 not run, for the same reason

## 5. Correction found by building this

Task 2.6 was written expecting `tell-the-story` to derive as **5 automated test /
3 code path / 2 human review / 1 deferred**. That split was hand-made by reading
the scenarios. Derived from the back-references the change actually records, it is
**8 automated test / 0 code path / 2 human review / 1 deferred** — every checked
outcome is claimed by a test, and the three open ones are precisely the ones no
test could settle.

The hand-made number was wrong, and it had already reached `proposal.md`,
`design.md` and the Figma frames before the code contradicted it. Corrected in all
three. The page reports the **strength of the claim recorded in `tasks.md`**, not
an independent audit of the test suite — the distinction matters, and it is why a
finding never resolves a disagreement.
