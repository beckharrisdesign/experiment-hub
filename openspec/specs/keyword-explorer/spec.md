# keyword-explorer

## Purpose

`/keyword-explorer`: one table over the whole corpus, sortable and filterable
on every column, with no pagination. The table's structure (buckets, bands,
frozen corner) is specified in `keyword-table-grouping` and `big-join-table`;
its row grain in `keyword-listing-subrows`. This spec holds the surface's
standing rules.

Promoted 2026-09-21 from `keyword-explorer` (2026-09-17, shipped in #500)
as modified by `keyword-explorer-unified-view` (#505). Two of the original
requirements were withdrawn by later changes and are noted below rather than
promoted.

## Requirements

### Requirement: One table, sortable and filterable on every field, without pagination

**Fails until:** any column cannot be sorted or filtered, or the surface pages
its rows.

#### Scenario: Every column sorts and filters

- **WHEN** a column header is used to sort, or a filter is set on any field
- **THEN** the table reorders or narrows on that field, computed columns
  included

#### Scenario: The corpus is not paginated

- **WHEN** the corpus grows past a single screen
- **THEN** rows remain on one scrolling surface with no page controls

### Requirement: Columns are grouped under a band per source

**Fails until:** the page renders more than one keyword table, or a column's
source can only be identified by reading the component.

#### Scenario: Every source is a band on one table

- **WHEN** a reader opens the page
- **THEN** one table renders with a band naming each source — eRank,
  Targeting, Ranked, Shop, Etsy Ads — above short unprefixed column headers

#### Scenario: Colliding column names are told apart by their band

- **WHEN** two columns share a name across bands (`Revenue` / `L. revenue`,
  `Google` / `Google Volume`, `Etsy` / `Etsy SEO`)
- **THEN** the band names the instrument, and no header carries a source prefix

#### Scenario: A row is mostly blank without looking broken

- **WHEN** a row carries data from only one source (the normal case)
- **THEN** the populated columns read normally and the rest are blank, with no
  empty-state, warning or placeholder

### Requirement: Sorting and filtering never rank a blank as zero

**Fails until:** sorting any numeric column ascending places a blank above a
real low value, or a range filter's lower bound admits blanks.

#### Scenario: Blanks sort last on any numeric column

- **WHEN** a reader sorts by any numeric column in either direction, at any
  key position
- **THEN** rows with a value order among themselves and blanks collect at the
  end

#### Scenario: A range filter excludes blanks

- **WHEN** a reader sets a numeric range
- **THEN** only rows with a value inside it remain

### Requirement: Cells do not wrap, one type size, no colour coding

Every column is `nowrap` (#511, Katy: *"give all cols nowrap to start"*),
every cell uses one type size, and no value is colour-coded.

**Fails until:** a cell wraps, a second type size appears — header row
included — or a value carries a colour band.

### Requirement: Listing titles render as the shop wrote them

Etsy's API returns titles HTML-escaped. They are decoded at the render
boundary with a fixed entity list.

**Fails until:** a rendered listing title contains `&quot;` or `&amp;`.

## Withdrawn from the original change

- **"The keyword column absorbs the remaining width."** Reversed by
  `keyword-captured-demand`: every column hugs its content and none claims the
  surplus. See `big-join-table`.
- **"Current and stale rows are distinguishable on the table."** Withdrawn when
  Status, Capture and Coverage were removed (`keyword-explorer-etsy-traction`)
  and settled as newest-wins with no marker (`keyword-explorer-unified-view`
  decision 5). The series lives in the corpus. See `keyword-corpus`.
- **Mobile.** Task 3.11 of the original change is still open: the hub's fixed
  256px `Sidebar` pushes content off-screen at 480px on every route, so the
  table's own mobile behaviour cannot be verified until the shell is
  responsive. Hub-wide, not this surface's.
