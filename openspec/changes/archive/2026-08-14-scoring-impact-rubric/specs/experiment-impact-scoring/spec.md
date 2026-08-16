# experiment-impact-scoring

## Outcomes

See [proposal.md](../../proposal.md) — Katy scores experiments with three 1–5 impact proxies (Personal, Social, Business), edits each score and its justification in the existing Labs Notion database, sees that profile on the hub, keeps v1 five-dimension scores as untouched history, and stops maintaining redundant rubric descriptions in the hub UI while she iterates on the system.

## ADDED Requirements

### Requirement: Rubric store speaks three impact proxies

The scoring rules file describes the edited rubric — Personal, Social, and Business Impact, 1–5 each, total 3–15 — and the archive re-grade line matches it.

**Fails until:** `rules/scoring-criteria.mdc` anchors three dimensions (Business Impact merging market opportunity and differentiation), and `skills/openspec-archive-change.md` shows the re-grade example in the new format instead of `M3 P2 S2`.

The rubric store SHALL define exactly three dimensions — Personal Impact, Social Impact, Business Impact — scored 1–5 with an at-archive Predicted/Actual/Missed re-grade, with v1 scores declared read-only history.

#### Scenario: rubric store rewritten

- **WHEN** the scoring rules and archive skill are read after this change
- **THEN** they describe only the three-proxy rubric (1–5 each, total 3–15) with a matching re-grade line format, and no active Mission/Pull/Speed or platformCost/TAM-anchor language remains in store files

### Requirement: Score display matches the shape

An experiment scored under the new rubric shows its three impact dimensions with justifications on its detail page and its `n/15` total on the landing list, while v1-only experiments keep exactly the score presentation they have today — the landing badge — labeled as v1 history, and no shape combination breaks a page. (The old five-dimension detail display turned out to be dead code and is deleted, not revived — see design.md Decision 5.)

**Fails until:** a new `ImpactScores` block renders an `IMPACT SCORE n/15` heading and a Personal / Social / Business / History tab bar — each dimension tab carrying its 1–5 score badge, selected tab rendering its content — on the detail page at both breakpoints, the landing badge is shape-aware (`n/15` impact / `n/25` v1-history with label), dead `components/ExperimentScores.tsx` is removed, and every combination (new, v1, both, partial, none) renders without runtime errors.

The hub SHALL render Personal/Social/Business dimensions with justifications for new-shape scores, preserve the v1 landing-badge presentation labeled as history, and degrade gracefully for mixed, partial, or absent scores.

#### Scenario: impact profile renders

- **WHEN** an experiment has the new scores (`personal`, `social`, `business` impact, each 1–5)
- **THEN** the detail page Overview shows the `IMPACT SCORE n/15` heading and a tab bar in Personal → Social → Business → History order, each dimension tab carrying its 1–5 score badge — the selected tab rendering its full content, from a single paragraph to a complete business case with structure preserved, ending with that dimension's 1–5 anchor legend with the scored anchor highlighted — at both S·480 and L·1024 breakpoints, and the landing badge shows the `n/15` total

#### Scenario: v1-only experiment renders unchanged

- **WHEN** an experiment has only v1 scores (`businessOpportunity` … `socialImpact`)
- **THEN** its landing badge renders the `n/25` total as it does today, labeled as the v1 historical record, and no five-dimension display is introduced or revived

#### Scenario: every shape combination is safe

- **WHEN** experiments with new-only, v1-only, both, partial, and no scores render on hub pages
- **THEN** each renders its correct display (new shape wins when both exist; no score section for unscored rows) with no runtime errors

### Requirement: Totals match the shape

Score totals reflect the rubric the experiment was scored under: new-shape totals range 3–15, v1 totals range 5–25, and incomplete scores show no total rather than a misleading one.

**Fails until:** the totals function returns 3–15 for complete new shapes, 5–25 for complete v1 shapes, and null for partial or absent scores — and the landing tooltip no longer hardcodes "/25 across five scoring dimensions."

Total computation SHALL sum whichever complete shape a row carries (preferring the new shape) and return null otherwise.

#### Scenario: totals computed per shape

- **WHEN** totals are computed for a new-shape, a v1-shape, and a partially scored experiment
- **THEN** the new-shape experiment totals within 3–15, the v1 experiment totals within 5–25, and the partial one yields no total

### Requirement: Notion sync reads impact scores

An experiment row in the Notion Labs database carrying the new score properties syncs its Personal/Social/Business values into the hub, and a row carrying both shapes syncs as the new shape.

**Fails until:** `mapNotionPageToExperiment` returns new-shape scores for rows with the new columns populated (preferring them when v1 `Score:B/P/C/D/S` columns are also populated), and the sync fetches each dimension's justification from the row's conventionally-titled `Why:` child page when one exists.

The Notion sync SHALL map the new score properties when present (column names per design.md), read justification content from `Why:` child pages of the experiment's row (titles per design.md), fall back to v1 mapping otherwise, and never fabricate values for partial rows or missing pages.

#### Scenario: impact-scored Notion row syncs

- **WHEN** a Notion row has the new score properties populated, with zero or more `Why:` justification child pages
- **THEN** the synced experiment carries the three impact values and the content of each existing justification page (structure preserved), the new shape wins if the row also has v1 score columns, and dimensions without a page carry no justification

### Requirement: Redundant documentation pages removed

The hub no longer serves the `/scoring`, `/heuristics`, or `/harness` pages, and nothing in the UI links to them.

**Fails until:** the three `app/` routes are deleted along with their Header nav entries, landing-page cards, `lib/agent-rubrics.ts`, and `tests/agents/heuristics.test.ts`, with no dangling references in code.

The hub SHALL NOT serve or link to the scoring, heuristics, or harness documentation pages; the rubric's single source of truth is `rules/scoring-criteria.mdc`.

#### Scenario: doc pages and links are gone

- **WHEN** the hub is browsed after this change
- **THEN** `/scoring`, `/heuristics`, and `/harness` return the app's not-found response, the Header and landing page show no links to them, and no code references the deleted modules
