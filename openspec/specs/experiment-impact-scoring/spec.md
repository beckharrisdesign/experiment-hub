# experiment-impact-scoring

## Purpose

Experiments are scored with three 1–5 impact proxies — Personal, Social, Business (total 3–15, `rules/scoring-criteria.mdc` v3) — stored in the BHD Labs Notion database with per-dimension justifications as `Why:` child pages, rendered in place on the hub. v1 five-dimension scores remain a read-only historical record. The rubric's standalone documentation pages are gone; the rubric reads where scores are consumed.

## Requirements

### Requirement: Rubric store speaks three impact proxies

The scoring rules SHALL define exactly three dimensions — Personal Impact, Social Impact, Business Impact — scored 1–5 with an at-archive Predicted/Actual/Missed re-grade (`PI4 SI3 BI2` format), with v1 scores declared read-only history.

#### Scenario: rubric store rewritten

- **WHEN** the scoring rules and archive skill are read
- **THEN** they describe only the three-proxy rubric (1–5 each, total 3–15) with a matching re-grade line format, and no active Mission/Pull/Speed or platformCost/TAM-anchor language remains in store files

### Requirement: Score display matches the shape

The hub SHALL render an `IMPACT SCORE n/15` block on the detail page — a Personal / Social / Business / History tab bar, each dimension tab carrying its 1–5 score badge, the selected tab opening with the dimension's anchor legend (scored anchor bold) above its justification — while v1-only experiments keep their landing-badge presentation labeled as history, degrading gracefully for mixed, partial, or absent scores.

#### Scenario: impact profile renders

- **WHEN** an experiment has impact scores (`personal`, `social`, `business`, each 1–5)
- **THEN** the detail page shows the `IMPACT SCORE n/15` heading and the tab bar in Personal → Social → Business → History order, the selected tab rendering its legend and full justification (a paragraph to a complete business case, structure preserved) at both S·480 and L·1024 breakpoints, and the landing shows the `n/15` badge plus per-dimension sub-score columns

#### Scenario: v1-only experiment renders unchanged

- **WHEN** an experiment has only v1 scores (`businessOpportunity` … `socialImpact`)
- **THEN** its landing badge renders the `n/25` total labeled as the v1 historical record, and no five-dimension display is introduced or revived

#### Scenario: every shape combination is safe

- **WHEN** experiments with impact-only, v1-only, both, partial, and no scores render on hub pages
- **THEN** each renders its correct display (impact wins when both exist; no score section for unscored rows) with no runtime errors

### Requirement: Totals match the shape

Total computation SHALL sum whichever complete shape a row carries (impact preferred: 3–15; v1 history: 5–25) and return null otherwise; badge colors scale by fraction of the shape's max.

#### Scenario: totals computed per shape

- **WHEN** totals are computed for an impact-shape, a v1-shape, and a partially scored experiment
- **THEN** the impact experiment totals within 3–15, the v1 experiment within 5–25, and the partial one yields no total

### Requirement: Notion sync reads impact scores

The Notion sync SHALL map the `Score:PI` / `Score:SI` / `Score:BI` columns when present (impact wins over populated v1 columns), read justification content from the row's `Why: Personal` / `Why: Social` / `Why: Business` child pages, and never fabricate values for partial rows or missing pages. Column and page-title names live as exported constants pinned by tests.

#### Scenario: impact-scored Notion row syncs

- **WHEN** a Notion row has the impact score columns populated, with zero or more `Why:` child pages
- **THEN** the synced experiment carries the three values and each existing page's content (structure preserved), and dimensions without a page carry no justification

### Requirement: Redundant documentation pages removed

The hub SHALL NOT serve or link to the scoring, heuristics, or harness documentation pages; the rubric's single source of truth is `rules/scoring-criteria.mdc`, with anchors mirrored in `lib/rubric.ts` under a drift-test guard.

#### Scenario: doc pages and links are gone

- **WHEN** the hub is browsed
- **THEN** `/scoring`, `/heuristics`, and `/harness` return the app's not-found response, the header and landing page show no links to them, and no code references the deleted modules
