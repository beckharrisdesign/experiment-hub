# keyword-explorer

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: `/keyword-explorer` renders one table over the merged row — 20 columns grouped under a band per source — replacing the two separate tables it shows today, with sorting and filtering working per column without ever treating a blank as a zero.

## MODIFIED Requirements

### Requirement: One table, with columns grouped under a band per source

The page shows a single table whose headers are grouped by the instrument that produced them, not several tables the reader switches between.

**Fails until:** `/keyword-explorer` renders more than one keyword table, or a column's source can only be identified by reading the component source rather than the page.

#### Scenario: Every source is a band of columns on one table

- **WHEN** a reader opens `/keyword-explorer`
- **THEN** one table renders with a band naming each source — Keyword Tool, Bulk Keywords, Tag Report, Ranked, Targeting — above the short unprefixed column headers belonging to it, per round 01 Option A

#### Scenario: The Bulk Keywords table is gone

- **WHEN** the page renders
- **THEN** no separate `BulkKeywordTable` is present; its Avg searches, Avg clicks, Avg CTR, Etsy competition and KD columns appear as the Bulk Keywords band on the merged table, keeping their censored-value rendering

#### Scenario: Colliding column names are told apart by their band

- **WHEN** a reader looks at any of the nine columns whose name is shared with another column — KD appears three times, Avg searches, Avg clicks, Avg CTR and Etsy comp. twice each
- **THEN** the band above it names which instrument it came from, and no header carries a source prefix to disambiguate itself

#### Scenario: A row is mostly blank without looking broken

- **WHEN** a row carries data from only one source, the normal case for 258 of the archive's 287 Tag Report tags
- **THEN** the populated columns read normally and the rest render as blanks, with no empty-state, warning or placeholder implying the row is incomplete

### Requirement: Sorting and filtering work per column and never rank a blank as zero

Every numeric column stays sortable and range-filterable, and a blank sorts and filters as absent rather than as the bottom of the range.

**Fails until:** sorting any numeric column ascending places a blank row above a row holding a real low value, or a range filter's lower bound admits rows whose value for that column is blank.

#### Scenario: Blanks sort last on any numeric column

- **WHEN** a reader sorts by any numeric column from any source band, in either direction
- **THEN** rows with a value for that column order among themselves and rows blank for it collect at the end, matching the existing "blank sorts last, never 0" behaviour already shipped on Searches, Competition, KD, Ranked and Targeting

#### Scenario: A range filter excludes blanks rather than counting them as zero

- **WHEN** a reader sets a numeric range on a column
- **THEN** only rows with a value inside that range remain, and rows blank for that column are excluded regardless of how low the lower bound is set

#### Scenario: Ranked and Targeting behave exactly as they do today

- **WHEN** Ranked and Targeting are read on the merged table
- **THEN** Ranked still shows the best position from the archive and Targeting is still computed live per request against listing snapshots, degrading to blank when unavailable — the join moves onto the merged row, the behaviour does not change
