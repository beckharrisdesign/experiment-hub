# exec-function-session-cadence

## Purpose

Availability is decided per track, not per day. Each track carries its own minimum interval — one day for the timed measures, seven for the everyday check-in — so finishing one measure never hides another. The guard that survives is narrow: the same measure cannot be repeated inside its interval, which is what would let a bad run be re-rolled until it looked better. A session that is not its day's first is marked rather than prevented, its ordinal derived from stored timestamps.

## Requirements

### Requirement: Each track offers its own task when that track is due

Every track card SHALL offer a way to run its own task whenever that track is due, using the destination already defined for it. The day's assigned block SHALL keep its place at the top of the page as the suggestion, not as the only route in.

**Fails until:** Finishing the assigned Corsi block still leaves a way to start the n-back from its own card.

#### Scenario: A due track offers its task

- **WHEN** a track has not been run within its minimum interval
- **THEN** that track's card SHALL offer a control that starts that track's task

#### Scenario: A track that is not due offers nothing

- **WHEN** a track has been run within its minimum interval
- **THEN** that track's card SHALL NOT offer a control to run it, and SHALL say when it is next due

#### Scenario: The assigned block keeps its place

- **WHEN** the day's assignment has not been completed
- **THEN** the page SHALL still present it at the top as the day's suggested block

### Requirement: Availability is decided per track, on a per-track interval

Whether a task can be started SHALL be decided per track rather than per day. Each track SHALL carry its own minimum interval — one calendar day for the timed measures, seven for the everyday check-in — and a track SHALL be due when its most recent session falls at least that many days before the current one.

**Fails until:** Completing any one session no longer removes every other task from the page.

#### Scenario: Finishing one track leaves the others available

- **WHEN** exactly one track has been run today and the others have not
- **THEN** the other tracks SHALL remain available to run

#### Scenario: The same measure cannot be re-run for a better score

- **WHEN** a track has already been run today and its interval is one day
- **THEN** that track SHALL NOT be available again until the next calendar day

#### Scenario: The check-in holds to a week

- **WHEN** the everyday check-in was run within the last seven days
- **THEN** it SHALL NOT be available, regardless of what else has been run

### Requirement: A day's later session is recorded, not prevented

A session that is not the first of its calendar day SHALL be saved like any other and shown as a later session, so that fatigue carryover is visible rather than designed out. Nothing SHALL block it. The ordinal SHALL be derived from the stored timestamps at read time rather than written alongside them, so it cannot drift from them and applies to sessions recorded before this change.

**Fails until:** A second task taken ten minutes after the first is stored, and its row says it was not that day's first.

#### Scenario: A later session is saved

- **WHEN** a session finishes on a day that already holds a completed session
- **THEN** it SHALL be written to the log with the same guarantees as a first session

#### Scenario: A later session is marked

- **WHEN** a session is not the first completed on its calendar day, counting across every track
- **THEN** its row in the session table SHALL show its position in that day

#### Scenario: The first session of a day is not marked

- **WHEN** a session is the first completed on its calendar day
- **THEN** its row SHALL carry no such marker
