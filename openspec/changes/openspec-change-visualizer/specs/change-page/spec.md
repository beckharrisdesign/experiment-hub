# change-page

## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: One change renders as one page

Any change in the working queue or the archive SHALL resolve to a page at `/changes/[id]` that leads with a plain statement of what the change is for, then its standing state, then what happened — assembled on read, with nothing written back into the change folder.

**Fails until:** A change with only a `proposal.md` renders a usable page instead of an error.

#### Scenario: An active change opens

- **WHEN** a change exists under `openspec/changes/<id>/`
- **THEN** the page SHALL render its intent statement, standing state and history

#### Scenario: An archived change opens

- **WHEN** a change exists only under `openspec/changes/archive/YYYY-MM-DD-<id>/`
- **THEN** the page SHALL resolve it by id and render it, including its recorded outcome

#### Scenario: A barely-started change still opens

- **WHEN** a change has a proposal and no specs, design or tasks
- **THEN** the page SHALL render what exists and name what is absent, rather than failing

### Requirement: The rail says which stage the change is in

The page SHALL show every gate the schema defines, mark the one the change currently sits in, and date each from the first commit that produced its artifact.

**Fails until:** Opening a change mid-apply shows `apply` marked as current without reading any other source.

#### Scenario: The current stage is marked

- **WHEN** a change has tasks but no archive record
- **THEN** the rail SHALL mark `apply` as the stage it is in, and `archive` as not reached

#### Scenario: A gate that was revisited is marked as revisited

- **WHEN** an artifact was committed again after a later gate's artifact first appeared
- **THEN** that gate SHALL carry both dates and be marked as reopened, not shown as a single date

#### Scenario: A gate older than its rule is not counted against the change

- **WHEN** a change's artifact predates the rule that would have governed it
- **THEN** the rail SHALL say so rather than reporting the gate as missed

### Requirement: Every outcome is shown with the evidence behind it

The page SHALL list each user outcome individually with the kind of evidence supporting it — an automated test, a code path, a human check at authoring time, or none yet — and SHALL NOT reduce them to a single count.

**Fails until:** A change with eight of eleven outcomes checked shows how many of the eight a test would catch regressing.

#### Scenario: Each outcome carries its evidence kind

- **WHEN** a change's outcomes are rendered
- **THEN** each SHALL show whether it is held up by a test, a code path, a human check, or nothing yet

#### Scenario: Outcomes that cannot be mapped say so

- **WHEN** a change organises its tasks by workstream rather than by spec scenario
- **THEN** the page SHALL report the honest overall total and state that a per-capability split is not derivable

#### Scenario: Each capability is listed with its requirements

- **WHEN** a change carries more than one capability
- **THEN** the page SHALL list each with its requirement count and any event particular to it

### Requirement: The history names its stage and keeps its silences

Every event on the history SHALL carry the stage the change was in at that moment, and a gap between events SHALL be shown at full weight with its real duration rather than closed up.

**Fails until:** A change untouched for a month shows that month rather than putting two bursts of work next to each other.

#### Scenario: Every event names its stage

- **WHEN** the history is rendered
- **THEN** each event SHALL show which stage the change was in, without the reader inferring it

#### Scenario: A quiet stretch is shown with its length

- **WHEN** no artifact, commit or pull request touched a change between two events
- **THEN** the page SHALL show that stretch and state how long it ran

#### Scenario: Two gates in one commit are named together

- **WHEN** a single commit produced the artifacts for two gates
- **THEN** the page SHALL name both as one moment rather than implying a sequence the record does not hold

### Requirement: A row that produced a design shows it

Where an event produced a design artifact, the page SHALL show the image itself, preferring a file committed with the change and falling back to the Figma frame recorded in `design.md`.

**Fails until:** The design event on a change with a recorded frame shows that frame, not a link to it.

#### Scenario: A committed image is shown

- **WHEN** the change carries an image under its `assets/` directory
- **THEN** the page SHALL render that image on the event that added it

#### Scenario: A recorded Figma frame is fetched

- **WHEN** no image is committed but `design.md` records a file key, page and frame node id
- **THEN** the page SHALL fetch and render that frame

#### Scenario: No artifact means no empty frame

- **WHEN** neither a committed image nor a recorded frame exists
- **THEN** the event SHALL render without an artifact and without a placeholder
