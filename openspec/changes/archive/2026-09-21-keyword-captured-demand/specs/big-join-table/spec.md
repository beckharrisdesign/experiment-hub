# big-join-table

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: the join stays readable as it widens — every column hugs, nothing is hidden, filters and sorts compound, scroll has controls, and the whole table exports.

## ADDED Requirements

### Requirement: Every column hugs its contents and nothing is hidden

The table shows everything it has, sized to its content, and scrolls rather than editing itself down.

**Fails until:** any column absorbs surplus width while others are cramped, or any column is dropped, truncated or collapsed behind a toggle to save space.

#### Scenario: No column absorbs the surplus

- **WHEN** the table renders at any viewport width
- **THEN** every column is sized to its own widest value, and no column carries a grow rule that claims leftover space

#### Scenario: The table is never narrower than its container

- **WHEN** the content is narrower than the viewport
- **THEN** the table still fills the viewport rather than collapsing to its content width

#### Scenario: Long values are shown in full

- **WHEN** a cell holds a long value such as a multi-query Found via string
- **THEN** it renders in full on one line and the table grows wider, rather than wrapping, truncating or being hidden

### Requirement: Filters compound and sorting carries more than one key

Several conditions narrow together, and ties break on a second column.

**Fails until:** adding a second filter clears the first, or setting a second sort key discards the first.

#### Scenario: Several filters narrow together

- **WHEN** a reader applies more than one filter
- **THEN** only rows satisfying all of them remain, and each stays visible and individually removable

#### Scenario: A second sort key breaks ties

- **WHEN** a reader sorts by one column and adds a second
- **THEN** rows order by the first key and ties resolve by the second, with both keys and their directions shown

#### Scenario: Blanks still sort last under every key

- **WHEN** a compound sort includes a column where some rows are blank
- **THEN** blank rows collect at the end regardless of direction or key position, never treated as zero

### Requirement: The whole table exports at any time

A download reproduces what is on screen, in full.

**Fails until:** the export omits a column that is on the table, or writes a value the table does not show.

#### Scenario: Export writes every column of the visible rows

- **WHEN** a reader exports with filters and a sort applied
- **THEN** the file contains exactly the rows the table is showing, in the table's order, with every column present

#### Scenario: Export preserves the table's honesty rules

- **WHEN** a row has blanks, a censored value or a misspelled captured term
- **THEN** the export carries a blank, the censored text and the misspelling exactly as rendered, never a fabricated zero or a corrected spelling

### Requirement: Scrolling has controls rather than choreography

The reader moves the table; the table does not move itself.

**Fails until:** the table auto-scrolls to a position on load, or a wide table gives no visible sign that more columns exist.

#### Scenario: The table rests at the start

- **WHEN** the page loads
- **THEN** the table is scrolled to its leftmost position and no band is auto-revealed

#### Scenario: A scrollbar is always visible

- **WHEN** the table is wider than its viewport
- **THEN** a horizontal scrollbar is rendered as part of the table and stays visible without hovering, sized to show how much of the join is in view

#### Scenario: A band can be jumped to without hiding the others

- **WHEN** a reader chooses a source band from the jump control
- **THEN** the table scrolls that band into view and every other column remains present and reachable

#### Scenario: Freezing the keyword is the reader's choice

- **WHEN** the page loads
- **THEN** the keyword column is not frozen, and a control offers to freeze it; enabling it keeps the keyword visible while the rest scrolls
