# keyword-explorer

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: one table over the corpus, sortable and filterable on every field.

## ADDED Requirements

### Requirement: One table, sortable and filterable on every field, without pagination

The whole corpus is on one scrolling surface; sorting and filtering are the only reduction.

**Fails until:** any column cannot be sorted or filtered, or the surface pages its rows.

#### Scenario: Every column sorts and filters

- **WHEN** a column header is used to sort, or a filter is set on any field
- **THEN** the table reorders or narrows on that field, including the computed columns

#### Scenario: The corpus is not paginated

- **WHEN** the corpus grows past a single screen
- **THEN** rows remain on one scrolling surface with no page controls

#### Scenario: Current and stale rows are distinguishable

- **WHEN** the table shows rows from more than one capture
- **THEN** each row's capture date and status are legible, and superseded rows are marked as such

### Requirement: Table presentation follows the standing table rules

Cells do not wrap, every cell uses one type size, the keyword column takes the remaining width, and no value is colour-coded until asked for.

**Fails until:** a cell wraps, a second type size appears anywhere in the table — **header row included** — or a value is colour-coded.

#### Scenario: Cells do not wrap and share one type size

- **WHEN** any row renders
- **THEN** no cell wraps to a second line and every cell uses the same type size

#### Scenario: The keyword column absorbs the remaining width

- **WHEN** the viewport is wider than the fixed columns require
- **THEN** the surplus goes to the keyword column and the others hold their width

#### Scenario: Values are not colour-coded

- **WHEN** rows render
- **THEN** no cell value carries a colour band, the schema being noted in the proposal but not applied
