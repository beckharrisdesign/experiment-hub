## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: The check-in states the period it asks about

The everyday check-in SHALL state its recall window to the person answering, positioned with the items rather than only in documentation, and that window SHALL be the past week — matching the weekly cadence, so consecutive administrations do not share a referent period.

**Fails until:** Opening the check-in shows what period the answers are meant to cover, without reading the source.

#### Scenario: The window is stated with the items

- **WHEN** the check-in is opened
- **THEN** the recall window SHALL appear where it is read before answering, and SHALL name the past week

#### Scenario: Documentation matches the form

- **WHEN** the experiment README or the schedule explains why the check-in runs weekly
- **THEN** the window it cites SHALL be the one the form actually asks for

### Requirement: Stored check-ins record the window they were answered under

Each stored check-in SHALL record the recall window in force when it was taken, so a score gathered under one window is never silently compared against a score gathered under another.

**Fails until:** The check-in stored on 2026-08-26 is distinguishable from every check-in taken after this change.

#### Scenario: A new check-in records its window

- **WHEN** a check-in is completed after this change
- **THEN** the stored session SHALL record the window it was answered under

#### Scenario: Earlier check-ins remain identifiable

- **WHEN** a check-in stored before any window was stated is read back
- **THEN** it SHALL be identifiable as having no declared window, rather than being assumed to match the current one
