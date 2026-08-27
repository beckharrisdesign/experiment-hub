## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: Every recorded session is shown

The dashboard SHALL include every stored session for a track in its trend series, session count, and Latest / Best / Change figures, with no session suppressed, discounted or relabelled on the basis of its score.

**Fails until:** The Corsi backward card reports two sessions, and the run scoring 0 is drawn on the chart as a point like any other.

#### Scenario: A zero-scoring session is plotted and counted

- **WHEN** a track holds a session whose headline value is 0 alongside a session with a positive value
- **THEN** the card SHALL report a session count of 2, plot both as points, and derive Latest, Best and Change from the full set

#### Scenario: No score-based filtering is applied

- **WHEN** any track's sessions are summarized for display
- **THEN** the set of sessions reaching the chart and the table SHALL equal the set stored for that track

### Requirement: Sessions taken on the same day appear as separate points on the trend

The trend chart SHALL position points by the instant a session was recorded rather than by its calendar day, so that two sessions on one day occupy different horizontal positions, and a series confined to a single day SHALL spread across the plot instead of collapsing to a single position.

**Fails until:** A track with two sessions on one date draws two marks with a sloped line between them, not a vertical line at the plot centre.

#### Scenario: Two same-day sessions do not stack

- **WHEN** a track's series holds two sessions recorded at different times on the same date
- **THEN** the two points SHALL be drawn at different x positions, in recorded order

#### Scenario: A single-day series uses the full plot width

- **WHEN** every session in a series falls on one calendar date
- **THEN** the points SHALL be distributed across the plot area rather than all placed at its centre

#### Scenario: Gaps between days stay proportional

- **WHEN** a series spans dates with days holding no sessions
- **THEN** the horizontal distance between points SHALL remain proportional to elapsed time, so an empty week still reads as a gap

### Requirement: The date axis names a one-day series once

The chart's date axis SHALL show a single date label when the first and last session in the series fall on the same day, rather than printing that date at both ends of the axis.

**Fails until:** A one-day series no longer reads "8/25 … 8/25" across the bottom of the chart.

#### Scenario: A one-day series labels the axis once

- **WHEN** the first and last session in a series share a calendar date
- **THEN** the axis SHALL carry that date once

#### Scenario: A multi-day series keeps both labels

- **WHEN** the first and last session fall on different dates
- **THEN** the axis SHALL carry the first date at its left end and the last at its right, as it does today

### Requirement: Session rows carry enough context to tell two runs apart

Each row in a track's session table SHALL show the local time the session was recorded, how long it ran, and how many trials were administered, alongside its date and headline value.

**Fails until:** The two 8/25 Corsi rows are visibly a 9.5-second, 2-trial run and a 65-second, 8-trial run.

#### Scenario: Same-day rows are distinguishable

- **WHEN** the session table holds two sessions recorded on the same date
- **THEN** each row SHALL show its own recorded time, duration and trial count, so the rows differ from one another without opening the stored detail

#### Scenario: Every row keeps its headline value

- **WHEN** any session row is rendered, including one whose headline value is 0
- **THEN** the row SHALL show that value in the measure column unchanged

### Requirement: The trend chart fills the width available to it

The chart SHALL occupy the full width of its container at every breakpoint, and its rendered height SHALL be fixed rather than derived from its width, so widening the card widens the plot without deepening it.

**Fails until:** The chart's right edge meets the card's content edge at 1024px, with no dead band beside it.

#### Scenario: The chart spans its container

- **WHEN** a track card renders at any viewport width
- **THEN** the chart SHALL be as wide as the card's content area, with no fixed maximum width holding it narrower

#### Scenario: Height does not track width

- **WHEN** the container width changes
- **THEN** the chart's rendered height SHALL stay constant and the plot area SHALL absorb the additional width

#### Scenario: Labels and marks keep their intended size

- **WHEN** the chart renders at 480px and at 1024px
- **THEN** axis labels and point marks SHALL render at the same size at both widths rather than scaling with the container
