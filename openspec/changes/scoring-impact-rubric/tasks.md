# scoring-impact-rubric — tasks

## 1. User outcomes (from spec scenarios)

- [x] 1.1 **Rubric store rewritten** — reading the scoring rules and archive skill shows only the three-proxy rubric (1–5 each, total 3–15) with a matching re-grade line format; no active Mission/Pull/Speed or platformCost/TAM-anchor language remains in store files
- [x] 1.2 **Impact profile renders** — an impact-scored experiment's detail page shows the `IMPACT SCORE n/15` heading and the Personal / Social / Business / History tab bar with score badges; the selected tab renders its full justification (a paragraph or a whole business case, structure preserved) at both breakpoints, and the landing badge shows `n/15`
- [x] 1.3 **V1-only experiment renders unchanged** — a v1-only experiment's landing badge shows its `n/25` total as today, labeled as the v1 historical record; no five-dimension display is introduced or revived
- [x] 1.4 **Every shape combination is safe** — experiments with new-only, v1-only, both, partial, and no scores all render their correct display with no runtime errors
- [x] 1.5 **Totals computed per shape** — new-shape totals land in 3–15, v1 totals in 5–25, partial scores yield no total, and no tooltip hardcodes "/25 … see /scoring"
- [x] 1.6 **Impact-scored Notion row syncs** — filling the three score columns (and optionally writing `Why:` child pages) on a Labs database row puts the scores, justifications, and total on the hub; the new shape wins when v1 columns are also filled
- [x] 1.7 **Doc pages and links are gone** — `/scoring`, `/heuristics`, and `/harness` return the app's not-found response and nothing in the header or landing page links to them

## 2. Prototype shell

- [x] 2.1 N/A — this change modifies the hub itself (no `experiments/<slug>/prototype/`); dev command: `npm run dev`

## 3. Implementation

- [x] 3.1 Rewrite `rules/scoring-criteria.mdc` as v3: Personal / Social / Business Impact, 1–5 anchors (Business merges opportunity + differentiation, no TAM dollar gates), re-grade line `**Predicted:** PI4 SI3 BI2 · …`, v1 declared read-only history
- [x] 3.2 Update the re-grade example in `skills/openspec-archive-change.md` to the new format
- [x] 3.3 Add `impactScores` / `impactRationale` types in `types/index.ts` (design.md Decision 1); leave v1 `ExperimentScores` untouched
- [x] 3.4 Add `calculateImpactTotal` (3–15 / null) and an impact-first total resolver in `lib/scoring.ts`; rescale `getTotalBadgeColor` by total/max fraction
- [x] 3.5 Notion sync (`lib/notion-experiments.ts`): exported constants for `Score:PI/SI/BI` and `Why: Personal/Social/Business` titles; map score columns (new shape wins); fetch `Why:` child-page blocks (allowlist: paragraphs, headings 1–3, lists, quotes, dividers) with a short-TTL memoized cache
- [x] 3.6 Build `components/ImpactScores.tsx` per Figma `02.8` (17:3): `IMPACT SCORE n/15` head, badged tab bar (Katy's spacing: tabs p-4, badge px-2.5 py-2 rounded, 6px gap; badge-less tabs stretch to row height), tab content at `max-w-[720px]` opening with the dimension's 1–5 anchor legend as a white card above the justification (scored anchor bold, others regular, all dark green; anchors from `lib/rubric.ts` constants), History tab rendering the milestone list; client-island tab switcher
- [x] 3.7 Wire into `app/experiments/[slug]/page.tsx`: Impact block after statements, standalone History section removed (its data feeds the History tab); graceful for every shape combination
- [x] 3.8 Landing (`app/page-client.tsx`): shape-aware badge total, sort, and tooltip (impact dims for new shape, v1-history label otherwise)
- [x] 3.9 Deletions: `app/scoring/`, `app/heuristics/`, `app/harness/`, `components/ExperimentScores.tsx`, `lib/agent-rubrics.ts`, `tests/agents/heuristics.test.ts`, Header nav entries (keep `Experiments`), commented-out Scaffolding section in `app/page-client.tsx`
- [x] 3.10 Add `Score:PI` / `Score:SI` / `Score:BI` number columns to the BHD Labs Projects database via the Notion connector — **confirm with Katy immediately before this schema change; no rows touched**
- [x] 3.11 Tests (vitest, per `rules/vitest-conventions.mdc`): impact totals + badge rescale, Notion mapping with property/block fixtures (incl. title-drift and partial rows), `ImpactScores` render states, doc-route removal, and a rubric-drift guard asserting `lib/rubric.ts` anchors match `rules/scoring-criteria.mdc`

## 4. QA

- [x] 4.1 Manual walkthrough: score an experiment in Notion (3 columns + one `Why:` page) → hub detail shows tabs and total; check a v1-only row's badge; visit `/scoring` → 404; both breakpoints
- [x] 4.2 Automated smoke: full vitest suite green in CI (fresh-worktree tsc/vitest noise is known — CI is authoritative)
