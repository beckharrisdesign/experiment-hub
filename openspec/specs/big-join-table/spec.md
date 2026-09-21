# big-join-table

## Purpose

The join stays readable as it widens. Every column hugs its content, nothing
is hidden to save width, filters and sorts compound, scrolling has controls
rather than choreography, the keyword column and the header tiers freeze
together, and the whole table exports at any time.

Promoted 2026-09-21 from `keyword-captured-demand` (2026-09-20, #508) and
`keyword-table-restructure` (2026-09-20, #510), with the scroll-region fixes
from #511. Where the two changes disagreed, the later one is recorded and the
reversal is noted.

## Requirements

### Requirement: Every column hugs its contents and nothing is hidden

**Fails until:** any column absorbs surplus width while others are cramped, or
any column is dropped, truncated or collapsed behind a toggle.

#### Scenario: No column absorbs the surplus

- **WHEN** the table renders at any viewport width
- **THEN** every column is sized to its own widest value and none carries a
  grow rule

#### Scenario: Long values are shown in full

- **WHEN** a cell holds a long value such as a multi-query `Found via` string
- **THEN** it renders in full on one line and the table grows wider

### Requirement: The table fills the available width

`/keyword-explorer` breaks the site's `max-w-[1200px]` cap; no other route
does.

**Fails until:** the table is still constrained by the page's standard maximum
width.

#### Scenario: Width does not remove the need to scroll

- **WHEN** the table is wider than the viewport even at full bleed (4,056px
  measured on 2026-09-21)
- **THEN** it still scrolls horizontally, and nothing is hidden to make it fit

### Requirement: Filters compound and sorting carries more than one key

**Fails until:** adding a second filter clears the first, or setting a second
sort key discards the first.

#### Scenario: Several filters narrow together

- **WHEN** a reader applies more than one filter — range, presence/absence,
  source, query or keyword text
- **THEN** only rows satisfying all of them remain, and each is shown as a
  chip that removes only itself

#### Scenario: A header click makes that column primary

- **WHEN** a reader clicks a column header
- **THEN** that column becomes the first sort key and the previous primary
  demotes to a tie-breaker, with every key and direction shown — found while
  building #508: appending instead of promoting left a single click on Ranked
  still ordered by Searches

#### Scenario: Blanks sort last under every key

- **WHEN** a compound sort includes a column where some rows are blank
- **THEN** blanks collect at the end regardless of direction or key position

### Requirement: The whole table exports at any time

**Fails until:** the export omits a column that is on the table, or writes a
value the table does not show.

#### Scenario: Export writes every column of the visible rows

- **WHEN** a reader exports with filters and a sort applied
- **THEN** the CSV contains exactly the rows shown, in the table's order, with
  every column present

#### Scenario: Export preserves the table's honesty rules

- **WHEN** a row has blanks, a censored value or a misspelled captured term
- **THEN** the export carries a blank, the censored text and the misspelling —
  never a fabricated zero or a corrected spelling

### Requirement: Scrolling has controls rather than choreography

**Fails until:** the table auto-scrolls on load, a wide table gives no visible
sign that more columns exist, or the horizontal scrollbar is unreachable.

#### Scenario: The table rests at the start

- **WHEN** the page loads
- **THEN** the table is scrolled to its leftmost position and no band is
  auto-revealed

#### Scenario: The scroll region is the viewport, not the corpus

- **WHEN** the corpus is taller than the screen
- **THEN** the scroll region is capped to the viewport and scrolls in both
  axes, so the horizontal scrollbar is always on screen and the page itself
  does not scroll — #511, after an 88,878px-tall region put the scrollbar
  below every row and defeated the sticky headers

#### Scenario: A band can be jumped to without hiding the others

- **WHEN** a reader chooses a band from the jump control
- **THEN** the table scrolls that band into view and every other column
  remains reachable; a `Keyword` chip returns to the very start (#511 — the
  first labelled band begins 496px in, so band chips alone could never get
  back to 0)

### Requirement: The keyword column and the header tiers freeze together

Freezing is a corner, not a column: the keyword stays while scrolling
sideways, the headers stay while scrolling down, and the two overlap. The
frozen column carries a shadow and border so it reads as a column holding its
ground rather than a gap in the data.

**Fails until:** freezing the keyword pins only part of the header stack, the
header tiers scroll out of view, or there is a toggle for either.

#### Scenario: All three header tiers pin

- **WHEN** the reader scrolls sideways
- **THEN** the bucket tier, the band tier and the column headers all stay
  aligned above their columns

#### Scenario: Headers stay while the rows scroll

- **WHEN** the reader scrolls down past the first rows
- **THEN** the header tiers remain visible at the top of the scroll region

#### Scenario: The keyword column is always stuck to the left

- **WHEN** the reader scrolls sideways
- **THEN** the keyword column stays at the left edge with no control to turn
  that off

**Reversed twice, 2026-09-21.** #508 shipped "freezing is the reader's choice"
(a toggle, off by default). Katy: *"that toggle is hidden and breaks a rule of
making things that are clickable look clickable. and I shouldn't have to toggle
it."* The toggle is gone; the column is simply sticky, like the header.

**Correction recorded in #511.** Outcome 1.35 of the restructure ("headers
stay while the rows scroll") was ticked in #510 on a computed `position:
sticky` alone; the header still scrolled away because the scrollport was the
whole corpus. Verified in a real viewport before this promotion.
