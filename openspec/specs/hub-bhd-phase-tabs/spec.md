# hub-bhd-phase-tabs

## Purpose

BHD phase tabs on the hub experiment detail page — one tab per non-empty OpenSpec phase artifact, with hide-if-empty legacy tabs.

## Requirements

### Requirement: Phase tabs match BHD schema artifacts

When a linked `bhd-experiment` OpenSpec change has phase artifacts, the experiment detail page SHALL show one tab per loaded phase (`explore`, `propose`, `apply`, `archive`) using labels Explore, Propose, Apply, and Archive.

**Fails until:** A user with only `explore.md` sees a single Explore tab, not a combined Lifecycle tab.

#### Scenario: Explore-only experiment tabs

- **WHEN** the linked change has only non-empty `explore.md`
- **THEN** the detail header SHALL show an Explore tab and SHALL NOT show Propose, Apply, or Archive tabs

#### Scenario: Multiple phase tabs

- **WHEN** the linked change has non-empty `explore.md` and `propose.md`
- **THEN** the detail header SHALL show Explore and Propose tabs in schema order

### Requirement: Hide tabs without content

The experiment detail page SHALL NOT render a tab (BHD phase or legacy) when the backing file is missing or empty, and SHALL NOT show placeholder copy for absent artifacts.

**Fails until:** Pomodoro Maker with no `docs/business-case.md` shows no Business Case tab.

#### Scenario: No empty Business Case tab

- **WHEN** `docs/business-case.md` is missing or whitespace-only
- **THEN** the Business Case tab SHALL NOT appear

#### Scenario: No empty PRD tab

- **WHEN** `docs/PRD.md` is missing or whitespace-only
- **THEN** the PRD tab SHALL NOT appear

### Requirement: Default tab is current BHD phase

When BHD phase tabs are shown, the initially selected tab SHALL be the linked change `currentPhase`; if that phase tab is unavailable, the page SHALL select the first available phase tab in schema order.

**Fails until:** Pomodoro Maker (Explore current) opens with Explore selected, not Business Case or PRD.

#### Scenario: Opens on current phase

- **WHEN** the user opens an experiment whose linked change current phase is Explore and Explore tab exists
- **THEN** the Explore tab SHALL be active on first paint

### Requirement: One phase markdown panel per tab

Each active BHD phase tab SHALL render only that phase markdown via `MarkdownContent` (`variant="light"`) in the light content area, with a phase header and optional "Current phase" indicator when the tab matches `currentPhase`.

**Fails until:** Switching tabs changes a single phase body, not a stacked multi-phase scroll.

#### Scenario: Single-phase body on Explore tab

- **WHEN** the user selects the Explore tab
- **THEN** the panel SHALL render `explore.md` content only and SHALL NOT include propose, apply, or archive bodies in the same view
