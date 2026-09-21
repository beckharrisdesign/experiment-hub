# keyword-traction

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: two numeric, sortable, range-filterable columns on the existing Keyword Explorer table — Ranked (best Etsy search position) and Targeting (lowest of 13 tag slots) — plus a range filter usable on every numeric column, and Status/Capture/Coverage off the visible table without touching their data.

## ADDED Requirements

### Requirement: Ranked is a numeric column sourced from the Spotted on Etsy archive

Each keyword row shows the best (lowest) Etsy search position any W&H listing holds for that exact term, or nothing if none does.

**Fails until:** a row with no matching `erank-spotted-on-etsy` term shows anything other than a blank cell (including `0`), or a row with multiple matching listings shows anything other than the lowest position among them.

#### Scenario: A keyword with one matching listing shows its position

- **WHEN** a corpus keyword's text exact-matches (case-insensitive) exactly one `erank-spotted-on-etsy` search term
- **THEN** the Ranked cell shows that listing's position as a plain number

#### Scenario: A keyword with multiple ranking listings shows the best position

- **WHEN** more than one W&H listing ranks for the same matched term
- **THEN** the Ranked cell shows the lowest (best) position among them, and every listing/page/position pair is still retrievable from the underlying row data

#### Scenario: A keyword with no ranking match shows a blank cell

- **WHEN** no `erank-spotted-on-etsy` term matches a corpus keyword's text
- **THEN** the Ranked cell is blank — a non-numeric placeholder glyph (e.g. an em dash, matching the table's existing convention on `Searches / comp.` when competition is zero) is fine; the literal number `0` is not

### Requirement: Targeting is a numeric column sourced from live listing tags

Each keyword row shows the lowest tag-slot number (1–13) at which that exact keyword appears in the tags of any current W&H listing, or nothing if it appears in none.

**Fails until:** the match considers a listing's title (rather than only its `tags` array), or a row with no tag match shows anything other than a blank cell.

#### Scenario: A keyword that is a tag on one listing shows its slot number

- **WHEN** a corpus keyword's text exact-matches (case-insensitive) one tag in one current listing's `tags` array
- **THEN** the Targeting cell shows that tag's 1-based position in the array as a plain number

#### Scenario: A keyword tagged on multiple listings shows the earliest slot

- **WHEN** the same keyword is a tag on more than one current listing, at different slot positions
- **THEN** the Targeting cell shows the lowest slot number among them

#### Scenario: A keyword absent from every listing's tags shows a blank cell

- **WHEN** no current listing's `tags` array contains a corpus keyword's exact text
- **THEN** the Targeting cell is blank, never `0`

### Requirement: Every numeric column can be filtered by a range

Katy can narrow the table to rows above or below a value on any numeric column, including Ranked and Targeting.

**Fails until:** a numeric column exists (Searches, Competition, KD, Searches/comp., Ranked, Targeting) with no way to filter it by a minimum or maximum value.

#### Scenario: A minimum or maximum narrows the table

- **WHEN** Katy sets a "less than" or "more than" value on a numeric column
- **THEN** only rows whose value on that column satisfies the bound remain visible, combined with any other active filters

#### Scenario: A range filter applies to Ranked and Targeting the same as any other numeric column

- **WHEN** Katy sets a range filter on Ranked or Targeting
- **THEN** it behaves identically to a range filter on Searches, Competition, KD, or Searches/comp. — same control, same combination with other filters

### Requirement: Status, Capture and Coverage are no longer visible table columns

The table's visible columns, left to right, are Keyword, Searches, Competition, KD, Ranked, Targeting, Found via and Searches/comp. Status, Capture and Coverage stop rendering as columns, and every field `keyword-corpus` already computes for them is unchanged.

**Fails until:** Status, Capture or Coverage still renders as a visible column, or any of the three stops being computed and stored on the row.

#### Scenario: Status, Capture and Coverage are absent from the table

- **WHEN** the table renders
- **THEN** no column shows status, capture date, or coverage

#### Scenario: The underlying data for all three is unchanged

- **WHEN** the corpus is generated or the row data is inspected
- **THEN** every row still carries its `current`/`supersededBy` status, `capture` date, and `coverage` exactly as `keyword-corpus` already produces them

### Requirement: A traction value with no match is visually and semantically distinct from a zero value

Ranked and Targeting must never let "no observed traction" be read as "confirmed absence of traction" or as a real `0`. A non-numeric placeholder (an em dash, matching this table's existing convention for `Searches / comp.` when competition is zero) satisfies this; the requirement is on the underlying value and every read of it — sort order, data export, equality checks — never on whether the cell renders a glyph at all.

**Fails until:** a blank Ranked or Targeting cell's *value* renders as, sorts as, or is exported/read as the number `0`.

#### Scenario: Blank cells sort after populated ones, not as zero

- **WHEN** the table is sorted by Ranked or Targeting
- **THEN** rows with no value sort as absent (last, or otherwise clearly separated), not interleaved as if they held the lowest possible number
