# big-join-table

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: the join gets all the width the screen has, and a reader who scrolls into it keeps hold of the keyword and the headers.

## ADDED Requirements

### Requirement: The table fills the available width

`/keyword-explorer` breaks the page's usual maximum width, because every pixel withheld is a column the reader has to scroll for.

**Fails until:** the table is still constrained by the page's standard maximum width.

#### Scenario: The table ignores the page's width cap

- **WHEN** `/keyword-explorer` renders on a viewport wider than the site's standard maximum
- **THEN** the table extends to the full viewport width rather than being centred inside the cap

#### Scenario: Width does not remove the need to scroll

- **WHEN** the table is wider than the viewport even at full bleed
- **THEN** it still scrolls horizontally, and nothing is hidden or collapsed to make it fit

### Requirement: The keyword column and the header tiers freeze together

Freezing is a corner, not a column: the keyword stays while scrolling sideways, the headers stay while scrolling down, and the two overlap.

**Fails until:** freezing the keyword pins only part of the header stack, or the header tiers scroll out of view vertically.

#### Scenario: All three header tiers pin, not just the column headers

- **WHEN** the keyword column is frozen and the reader scrolls sideways
- **THEN** the bucket tier, the band tier and the column headers all stay aligned above their columns

#### Scenario: Headers stay while the rows scroll

- **WHEN** the reader scrolls down past the first rows
- **THEN** the header tiers remain visible at the top of the table

#### Scenario: The corner holds both

- **WHEN** the reader is scrolled in both directions at once
- **THEN** the frozen keyword column and the frozen headers meet in a corner that stays put

#### Scenario: Freezing stays the reader's choice

- **WHEN** the page first loads
- **THEN** the keyword column is not frozen, and freezing remains a toggle
