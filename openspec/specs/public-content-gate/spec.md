# public-content-gate

## Purpose

Public experiment pages render only content intended for outsiders: a Notion row not marked public never appears on any public route, the detail page shows a curated narrative drawn from an enumerated allowlist (guiding statements only, no bookkeeping fields), internal process indicators (OpenSpec phase chips, content-gap prompts) stay admin-only, and manual copy fixes are verified on the live pages.

## Requirements

### Requirement: Private rows never render publicly

A Notion experiment row not explicitly marked public is invisible on every public route.

#### Scenario: Private row is hidden from public routes

- **WHEN** an anonymous visitor requests the detail page of a row whose `Public` property is No or unset
- **THEN** the route responds 404 and the row does not appear in the homepage experiment table

#### Scenario: Backfilled public rows still render

- **WHEN** the enforcement deploys after the `Public` = Yes backfill task is complete
- **THEN** every intended-public experiment renders exactly as before, and the homepage table row count is unchanged

### Requirement: Detail fields render from an enumerated allowlist

The public detail page shows only the guiding statements — Why this matters, Hypothesis, Exec Summary — and nothing else, enforced by an exported, tested constant.

#### Scenario: Bookkeeping fields are filtered out

- **WHEN** the detail page renders a row whose properties include `Hypothesis` plus `Last edited time`, `Name alt`, `Score tag`, and `Public`
- **THEN** the rendered page contains the Hypothesis label and value and none of the other four labels or values

#### Scenario: New Notion properties stay private by default

- **WHEN** a new property (e.g. `Internal notes`) is added to the Notion database with no code change
- **THEN** it does not appear on any public route

### Requirement: Curated presentation with silent empty states

Guiding statements read as an intentional narrative — ordered, with Status as a hero chip and missing fields omitted rather than dashed. (Demo/code link buttons are deferred to `clickable-artifacts`.)

#### Scenario: Statements render in narrative order

- **WHEN** a public row has all three guiding statements plus a Status
- **THEN** the page renders Why this matters, Hypothesis, Exec Summary in that order and Status as a chip beside the type badge in the hero — with no field-row rendering of Status and no demo/code link buttons (links deferred to `clickable-artifacts`)

#### Scenario: Missing fields are omitted silently

- **WHEN** a public row has no Hypothesis value
- **THEN** no Hypothesis label, row, or placeholder dash renders; and when all three statements are empty, the page shows the hero statement alone

### Requirement: Internal process indicators are admin-only

OpenSpec phase chips and content-gap prompts exist for Katy in edit mode and never for anonymous visitors.

#### Scenario: Phase chip gated to edit mode

- **WHEN** the homepage renders a row that has an OpenSpec phase, with no `hub-edit` cookie present
- **THEN** no phase chip renders; and with a valid `hub-edit` cookie, the chip renders in its non-CTA admin styling

#### Scenario: Ghost prompts appear only in edit mode

- **WHEN** Katy views a detail page in edit mode for a row missing a Hypothesis
- **THEN** a ghost prompt ("Add a hypothesis →") renders in its place, and the same page without the cookie renders nothing there

### Requirement: Notion content is corrected and verified manually

The live copy fixes land with this change and are verified by loading the pages, since external-system edits cannot be code-tested.

#### Scenario: Copy fixes verified on live pages

- **WHEN** the change is ready to archive and the live pages are loaded
- **THEN** `/experiments/best-day-ever` contains "got to be a better way" and not "got to a better way"; `/experiments/mvds` contains "a minimally viable" and not "an minimally viable"; and the homepage hero contains no `--` sequences
