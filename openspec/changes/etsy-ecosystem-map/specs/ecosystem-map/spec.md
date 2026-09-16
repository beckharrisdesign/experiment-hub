# Spec: ecosystem-map

## Outcomes

See `proposal.md` Outcomes — Katy holds the whole Etsy ecosystem in one legible, governed picture; done when the map is a spec'd capability with named seams and homes for the fragment layers; explicitly not product strategy or new tooling.

## ADDED Requirements

### Requirement: The map lives as a versioned FigJam board, first, with the doc in lockstep

The visual map is the front door: a single canonical FigJam board (`ln6p2z1vppiTdqDPNVdoOZ`) whose Index page links every iteration, newest first, with the current version calloutted and every archived page bannered back to the current one — and the repo doc (`docs/ETSY_ECOSYSTEM_MAP_*.md`) says the same things in prose.

**Fails until:** the board and doc disagree on any surface, seam, or layer, or the board's Index/callout/archive conventions lapse.

The map SHALL exist in both forms with identical content, the FigJam board treated as the primary review surface.

#### Scenario: Board and doc stay synchronized

- **WHEN** the map changes structurally (a surface added, moved, or reframed)
- **THEN** a new FigJam version page is created per the living-diagram conventions and the doc is updated in the same change

### Requirement: Surface changes update the map

Any PR that adds, removes, or relocates an ecosystem surface updates the map in that same PR.

**Fails until:** a merged PR introduces a surface the map doesn't show.

A surface-touching PR SHALL update the map doc (and board, when structural).

#### Scenario: New surface lands with its map entry

- **WHEN** a PR adds a new pipeline surface (a store, tool, sync, or intelligence source)
- **THEN** the PR includes the map update naming the surface's role, home, and seams

### Requirement: Every data pull lands in the distilled model

Intelligence pulls — manual captures and structured exports alike — become dated notes in `docs/pulls/` carrying the source-agnostic shape (source, captured-at, subject, measures, limits, findings), with heavy source files flat-named in Drive's `W+H Data Pulls/`, never in git.

**Fails until:** a pull's findings are cited anywhere without a pull note behind them.

Reviews and readouts SHALL cite pull notes, not raw files.

#### Scenario: A manual capture is archived and distilled

- **WHEN** Katy captures a surface with no API (eRank, Search Analytics, statements)
- **THEN** the files land flat-named in Drive and a distilled note lands in docs/pulls/, and downstream documents cite the note

### Requirement: The live-state table stays true

The map's live-state table reflects reality at every monthly review — zero stale rows.

**Fails until:** a monthly review finds a row describing a state that no longer holds.

Each monthly review SHALL verify or correct every live-state row.

#### Scenario: Monthly review audits live state

- **WHEN** the monthly ecosystem review runs
- **THEN** every live-state row is confirmed current or corrected, and the review records the check

### Requirement: The ledger records, never targets

Each monthly review appends one observation row per ledger line — shop-wide completeness (automatic), engagement rate as favorites-per-view (automatic), net revenue + month-over-month (Katy's statement pull) — with no line promoted to a target.

**Fails until:** the ledger series lapses a month, or any ledger line acquires a goal.

The monthly review SHALL append ledger observations without setting targets on them.

#### Scenario: Monthly ledger append

- **WHEN** the monthly review runs
- **THEN** the completeness, engagement, and revenue observations are appended to the series with their capture provenance
