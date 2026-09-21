# keyword-table-grouping

## Purpose

A reader can tell at a glance what kind of claim each column makes — someone
else's estimate, a choice we made, or something that really happened — and can
still tell while scrolled into the middle of the table.

Promoted 2026-09-21 from `keyword-table-restructure` (2026-09-20, shipped in
#510).

## Requirements

### Requirement: Three buckets sort the columns by the kind of claim they make

`Observed` (the eRank band), `Targeted` (the Targeting band) and
`Performance` (Ranked, Shop, Etsy Ads) sit above the source bands.

**Fails until:** a reader cannot tell whether a column reports an estimate, a
decision or an outcome.

#### Scenario: Each bucket covers a contiguous run of columns

- **WHEN** the table renders
- **THEN** every bucket spans an unbroken run — `Targeting` is ordered before
  `Ranked` so `Performance` is not split — and `GROUPS` and `COLUMNS` agree
  on that order (found while building: reordering one and not the other
  spans the right counts over the wrong columns, and nothing throws)

#### Scenario: Ad results sit under Performance, not Targeted

- **WHEN** a keyword has Etsy Ads figures
- **THEN** views, clicks, spend, revenue, orders and ROAS appear under
  `Performance`, because they are outcomes rather than choices

#### Scenario: A thin bucket is not padded out

- **WHEN** `Targeted` holds fewer columns than the others
- **THEN** it renders at its true size — the asymmetry is the finding

### Requirement: Every group names itself over a rule spanning exactly its columns

**Fails until:** a group label sits over a rule wider or narrower than the
columns it names.

#### Scenario: Bucket and band rules are distinguishable

- **WHEN** both tiers render
- **THEN** the bucket rule is heavier (3px, full opacity) than the band rule
  (2px, 50%)

#### Scenario: The ungrouped keyword column carries no rule

- **WHEN** the `Keyword` column renders
- **THEN** it has no group label and no rule

### Requirement: Group labels stay readable while the table scrolls sideways

**Fails until:** scrolling into the middle of a bucket leaves the reader unable
to see which bucket or band they are reading.

#### Scenario: A label pins to the left edge of the scroll region

- **WHEN** a group's first column is off-screen while later columns of that
  group are visible
- **THEN** the label remains visible at the left edge of the scrolling area,
  offset past the frozen keyword column

#### Scenario: One label hands over to the next

- **WHEN** scrolling passes from one group into the next
- **THEN** the outgoing label gives way rather than both showing

### Requirement: Alignment follows the data type

Numbers and dates align right; text aligns left.

**Fails until:** a numeric column renders left-aligned, or a text column
right-aligned.

### Requirement: Column headers are Title Case without abbreviation

**Fails until:** a header reads as an abbreviation where a full name fits.

#### Scenario: The agreed names render

- **WHEN** the header row renders
- **THEN** it reads `Search Volume`, `Etsy Competition`, `Avg CTR %`, `Google
  Volume`, `Tag Count`, `Search / Competition`, `Etsy SEO` and `Listings` in
  place of the abbreviated originals

#### Scenario: A two-line header keeps its break

- **WHEN** a header carries a deliberate line break
- **THEN** it renders on two lines
