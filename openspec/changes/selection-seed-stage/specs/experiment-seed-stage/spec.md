## Outcomes

See [`proposal.md`](../../proposal.md) Outcomes. In short: capture an idea in
Katy's own words at the moment it arrives, without paying for a scaffold, and
have a soft written rule for when a seed becomes an experiment.

## ADDED Requirements

### Requirement: Capture a seed without a scaffold

An idea can be written down as a seed in under a few minutes, with no repo,
directory, score, or OpenSpec artifact required.

**Fails until:** the BHD Labs Database contains at least one row at
`Status = Ideation` that has no corresponding `experiments/` directory and no
`explore.md`.

#### Scenario: An idea is captured as a seed

- **WHEN** Katy has an idea and opens the BHD Labs Database
- **THEN** she can create a row at `Status = Ideation` filling only Hypothesis,
  Why this matters, and Who it's for, and nothing else is required of her

### Requirement: A seed carries the founder's own words

The seed's Why this matters is Katy's prose, not a rewritten or agent-generated
summary of it.

**Fails until:** a seed exists whose Why this matters is written in first person
and names something that happened to a specific person.

#### Scenario: A seed records the moment rather than a category

- **WHEN** a seed is written
- **THEN** its Why this matters names a concrete moment ("my kids missed the
  Kona Ice Truck") rather than a market statement ("parents need better
  reminders")

### Requirement: Leaving Ideation is a judged decision, not a threshold

A seed is promoted out of Ideation by a human applying two soft checks, and no
tool blocks or auto-advances it.

**Fails until:** `docs/SELECTION.md` states both checks and states that neither
is enforced.

#### Scenario: A seed is promoted out of Ideation

- **WHEN** a seed's Why this matters names a concrete moment, and a score shape
  has been named over `Score:PI` / `Score:SI` / `Score:BI`
- **THEN** the seed can move to Discovery, and the shape is what gets recorded
  and discussed rather than the total out of 15

#### Scenario: A seed that names no moment is held, not rejected

- **WHEN** a seed's Why this matters names only a category
- **THEN** it stays at `Status = Ideation` and is left to wait for its moment,
  rather than being deleted or marked abandoned

### Requirement: Seeds do not reach the public catalog

An unpromoted seed is not visible on the public site, even though the hub reads
the same Notion database it lives in.

**Fails until:** a seed row exists at `Status = Ideation` and
`labs.beckharrisdesign.com` does not list it.

#### Scenario: A seed stays off the public catalog

- **WHEN** a seed row is created at `Status = Ideation` with `Public` left
  unchecked, which is Notion's default for a new row
- **THEN** it is excluded from the public experiment list and its detail route
  returns 404, because `lib/notion-experiments.ts` reads an unset checkbox as
  `public: false` and both surfaces gate on that

#### Scenario: A seed is visible to Katy in edit mode

- **WHEN** Katy is signed in to admin edit mode
- **THEN** the seed is listed, carrying hub status `Active` — because
  `STATUS_MAP` collapses all five pre-launch Notion phases, Ideation included,
  onto `Active`

### Requirement: The convention is reversible

Adopting the seed stage introduces nothing that must be migrated or unwound to
abandon it.

**Fails until:** the change can be reverted by deleting files only, with no
Notion property, CI job, or schema edit to undo.

#### Scenario: The seed stage is abandoned

- **WHEN** the seed stage is judged not to work
- **THEN** deleting `docs/SELECTION.md` and this change directory returns the
  system to its prior state, and every Notion field used remains one the
  database already had
