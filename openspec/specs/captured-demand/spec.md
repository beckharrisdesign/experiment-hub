# captured-demand

## Purpose

Two sources on the merged keyword row that record what actually happened
rather than what was estimated: the search terms buyers really typed to reach
a listing (Shop, from `docs/pulls/2026-09-20-etsy-listing-stats-*`) and the
keywords Etsy matched an ad to (Etsy Ads). Both join by the same exact-text
rule as every other source and are stored exactly as captured.

Promoted 2026-09-21 from `keyword-captured-demand` (2026-09-20, shipped in
#508). The archive it reads landed in #507. A cadence for re-running the pull
is out of scope — Katy, 2026-09-21: tabled, since the pull is manual.

## Requirements

### Requirement: A captured search term lands on the keyword row it belongs to

**Fails until:** `paper embriodery template` resolves to no row, or to a row
whose Shop columns are blank.

#### Scenario: A captured term with no eRank data still gets a row

- **WHEN** a captured term matches no other source
- **THEN** a row exists carrying only its `shop_search` sub-object

#### Scenario: A captured term that eRank also knows lands on the same row

- **WHEN** a captured term exact-matches an existing corpus keyword
- **THEN** its Shop data attaches to that row rather than creating a second

#### Scenario: The listing's outcome travels with the term but stays the listing's

- **WHEN** a row carries a Shop sub-object
- **THEN** it also carries the listing reached, its items sold and revenue, and
  those columns are labelled `L. sold` and `L. revenue` — the listing's, not
  the term's

### Requirement: A captured term is stored exactly as it was typed

**Fails until:** a misspelling is corrected anywhere, or a singular and plural
collapse into one row.

#### Scenario: A misspelled term keeps its misspelling

- **WHEN** a captured term contains a buyer's typo
- **THEN** it is stored and rendered as captured and does not merge with its
  corrected spelling

#### Scenario: Singular and plural stay separate rows

- **WHEN** two captured terms differ only by pluralisation
- **THEN** they remain two rows

### Requirement: Etsy Ads is its own band and never merges with search terms

**Fails until:** an ad keyword's views are added to, or rendered in, a Shop
visits cell.

#### Scenario: An ad keyword with no organic arrivals still lands

- **WHEN** a matched keyword has ad views but no captured search term
- **THEN** its row shows Ads columns populated and Shop columns blank

#### Scenario: Views and visits are never summed

- **WHEN** a keyword has both ad views and captured visits
- **THEN** they render in separate bands and no cell shows their total

#### Scenario: The two windows are labelled where they are read

- **WHEN** the bands render
- **THEN** the Shop band reads `Shop — captured (this year)` and the Ads band
  reads `Etsy Ads — matched by Etsy (last 30 days)`

**Note — the band was renamed.** The change shipped it as an "Ads" band. Katy
caught in `keyword-table-restructure` (decision 15) that Etsy chooses which
terms an ad fires for, so "targeted keyword" was the wrong claim; the label now
attributes the match to Etsy. See `keyword-listing-subrows`.

### Requirement: The reader survives both export shapes and records what it could not read

**Fails until:** a two-column search-terms table yields no terms, or an
unreadable page is written as a zero.

#### Scenario: Both search-term table shapes parse

- **WHEN** the reader meets a 2-column (`Search terms | Visits`) or a
  4-column (`Search terms | Etsy | Google, etc. | Total visits`) row
- **THEN** both yield the term and its visits, and the Etsy/Google split is
  populated only where the export provided it

#### Scenario: An unreadable capture stays unreadable

- **WHEN** the archive records a listing as unreadable or not re-scraped
- **THEN** no row gains a `0` for it
