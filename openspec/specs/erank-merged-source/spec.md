# erank-merged-source

## Purpose

eRank's three exports — Keyword Tool, Bulk Keywords, Tag Report — read as one
instrument on the table. Each measurement is reported once, at the best
precision any tool gave it, with the reporting tools named and nothing
computed. The three per-tool sub-objects survive on the corpus row; the
collapse happens on the table row (`KeywordTableRow.erank`).

Promoted 2026-09-21 from `keyword-table-restructure` (2026-09-20, shipped in
#510).

## Requirements

### Requirement: Each eRank measurement appears once, at its best reported precision

Search Volume, Etsy Competition and KD occupy one column each. The value
shown is one eRank actually printed — chosen by precedence *exact > censored
> absent*, per field, never calculated.

**Fails until:** the table shows the same eRank measurement in more than one
column, or shows a number no eRank export contains.

#### Scenario: An exact value beats a capped one

- **WHEN** one tool reports a keyword's searches exactly and another caps it at
  `< 20`
- **THEN** the row shows the exact value (19 such precision gains in the
  2026-09-21 corpus)

#### Scenario: Two exact values agree, so the choice is free

- **WHEN** two tools both report a field exactly
- **THEN** the row shows that value, and the merge never averages, sums or
  blends

#### Scenario: A capped value is still better than nothing

- **WHEN** only capped values exist for a field
- **THEN** the row shows the cap rather than a blank

#### Scenario: The one known collision favours the exact reading

- **WHEN** one tool reports exactly `20` and another `< 20` — `beginner
  embroidery`
- **THEN** the row shows `20`; the design records this as a genuine collision
  rather than a precision difference

**Known gap, stated in the change's Risks:** two *different* exact values for
one field would be resolved silently by precedence. No such pair exists in
2,310 rows and no guard is built. If eRank ever prints two exact numbers for
one field, this spec is where that guard gets specified.

### Requirement: A censored value still reads as censored

**Fails until:** a value eRank capped renders as though it were exact.

#### Scenario: The cap survives the merge

- **WHEN** the value chosen for a field was reported as a cap
- **THEN** it renders with its `<` prefix

### Requirement: The row names which eRank tools reported the keyword

**Fails until:** a reader cannot tell whether a keyword was seen by one tool or
all three.

#### Scenario: Provenance renders as initials

- **WHEN** a keyword was seen by the Keyword Tool, Bulk Keywords and the Tag
  Report
- **THEN** the `Reported by` column shows `KT · B · T`

#### Scenario: A tool counts as reporting when it saw the keyword

- **WHEN** a tool has a record for the keyword but left a field blank
- **THEN** it is still named, because the column describes attestation rather
  than any one field

### Requirement: The derived ratio survives the merge and inherits censoring

`Search / Competition` is computed from the merged values.

**Fails until:** the ratio disappears, or a ratio resting on a capped searches
figure renders as exact.

#### Scenario: More rows gain a ratio

- **WHEN** searches came from one tool and competition from another
- **THEN** the ratio is still computed and shown

#### Scenario: A ratio built on a cap is shown as an upper bound

- **WHEN** the merged searches value was capped
- **THEN** the ratio renders with a `<` prefix

### Requirement: The three source filters read provenance

The toolbar's Keyword Tool, Bulk Keywords and Tag Report filters narrow on
`erank.reportedBy`, not on the collapsed sub-objects.

**Fails until:** a source filter returns no rows because it reads a field the
merge removed from the table row.

### Requirement: The merged sub-object carries eRank's monthly series when one has been pulled

A `erank-keyword-history` pull (one row per keyword per month) attaches to the
merged eRank sub-object as `history`, oldest month first, with its capture
date. A keyword nobody pulled carries `null`, never a flat line of zeros; a
keyword that was pulled and read zero every month keeps its zeros, because
that is a measurement.

**Fails until:** a pulled keyword's row has no `history`, or an unpulled
keyword's row shows a series.

#### Scenario: The table shows the peak and the shape

- **WHEN** a keyword has a series
- **THEN** the eRank band renders `Peak Month` (the peak month's label and
  value, numeric on the value so it sorts and range-filters with blanks
  last) and `15-Month Trend` (one text glyph per month scaled to the
  keyword's own peak, sorted by how many months read above eRank's `< 20`
  floor), and both columns export to CSV exactly as rendered

#### Scenario: The readings agree with eRank's printed average

- **WHEN** a series was read from the Bulk Keyword Tool's chart rather than
  printed by eRank
- **THEN** the mean of its last twelve months reproduces the keyword's
  printed `Search Volume` to within one — checked against the real archive
  in `tests/keyword-corpus.test.ts`
