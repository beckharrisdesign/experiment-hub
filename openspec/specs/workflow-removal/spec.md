# workflow-removal

## Purpose

The hub no longer claims a gated four-step workflow: `/workflow` permanently redirects home instead of rendering, the header offers no Workflow link, the gating-era dead code is gone from the repo, and the score tooltip describes only what exists. The method narrative is authored and maintained in Notion, not hardcoded in the app.

## Requirements

### Requirement: /workflow redirects instead of rendering

Visiting `/workflow` SHALL permanently redirect (308) to `/`; no workflow content renders on any route.

#### Scenario: Old links land on the homepage

- **WHEN** a visitor opens `https://labs.beckharrisdesign.com/workflow` from an old link
- **THEN** they are permanently redirected to `/` and no workflow content renders

### Requirement: Navigation no longer offers Workflow

The site header SHALL NOT link to a workflow page on any route, in desktop or mobile navigation.

#### Scenario: Header has no Workflow link

- **WHEN** a visitor views any public page
- **THEN** the header nav contains no link to `/workflow` (or `/method`)

### Requirement: Orphaned workflow code stays deleted

The gating-era modules (`WorkflowCells`, `workflow-states`, `ScoreDisplay`, `ExperimentList`) and their tests SHALL remain deleted; no source file references them.

#### Scenario: Dead code and its tests are gone

- **WHEN** the repo is searched for the deleted modules
- **THEN** no source file references them, and the build and test suite pass without them

### Requirement: Score tooltip stops promising a breakdown

The homepage score tooltip SHALL describe the score without promising a breakdown view, pointing at `/scoring` for the rubric.

#### Scenario: Tooltip matches reality

- **WHEN** a visitor hovers the score column on the homepage
- **THEN** the tooltip describes the total across the five scoring dimensions and references `/scoring`, without promising a breakdown view
