# keyword-traction

## Purpose

Where a corpus keyword meets the shop's own listings: the best Etsy search
position any W&H listing holds for it (Ranked, from the archived *Spotted on
Etsy* exports) and which live listings carry it as a tag, in which of the 13
slots (Targeting, computed per request from `etsy_latest_listing_snapshots`).
Both are joined by exact, case-insensitive text; neither ever fabricates a
zero.

Promoted 2026-09-21 from `keyword-explorer-etsy-traction` (2026-09-18,
shipped in #502). The *columns* that change introduced were reshaped twice —
folded onto the merged row by `keyword-explorer-unified-view` (#505), then
split into a parent count plus per-listing sub-rows by
`keyword-table-restructure` (#510). This spec records the join contract as it
stands; the surface is in `keyword-listing-subrows`.

## Requirements

### Requirement: Ranked is the best position from the Spotted on Etsy archive

Each keyword row shows the best (lowest) Etsy search position any W&H listing
holds for that exact term, under the `Etsy SEO` header of the Ranked band, or
nothing if none does.

**Fails until:** a row with no matching term shows anything other than blank
(including `0`), or a row with several matching listings shows anything other
than the lowest position.

#### Scenario: A keyword with one matching listing shows its position

- **WHEN** a corpus keyword exact-matches one archived search term
- **THEN** the cell shows that listing's position as a plain number

#### Scenario: A keyword with several ranking listings shows the best position

- **WHEN** more than one listing ranks for the same term
- **THEN** the cell shows the lowest position, and every listing/page/position
  pair is still retrievable from the row's `ranked.matches`

#### Scenario: A keyword with no ranking match shows a blank cell

- **WHEN** no archived term matches
- **THEN** the cell is blank — a placeholder glyph is fine, the number `0` is
  not

**Accepted limitation (task 14.7 of the change):** the archive identifies
listings by title text, not id, because eRank's export carries no listing id.
A retitled listing can read as two matches; two listings with identical titles
would collapse. Documented in `build_ranked_index()`.

### Requirement: Targeting is computed from live listing tags

Targeting reads each current listing's `tags` array — never its title — and
records, per listing, the 1-based slot at which the keyword appears.

**Fails until:** the match considers a listing's title, or a keyword tagged on
no listing shows anything other than blank.

#### Scenario: A keyword that is a tag on a listing records that listing and slot

- **WHEN** a corpus keyword exact-matches one tag in one current listing's
  `tags`
- **THEN** that listing appears under the keyword with its tag slot

#### Scenario: A keyword absent from every listing's tags shows nothing

- **WHEN** no current listing's `tags` contains the keyword
- **THEN** the `Listings` count is blank, never `0`, and no sub-row renders

#### Scenario: Targeting degrades to blank when the snapshot store is unreachable

- **WHEN** the Supabase snapshot query fails or the env is unset
- **THEN** the page still renders and every Targeting value is blank

### Requirement: Every numeric column can be filtered by a range

**Fails until:** a numeric column exists with no way to filter it by a minimum
or maximum.

#### Scenario: A bound narrows the table

- **WHEN** a "less than" or "more than" value is set on a numeric column
- **THEN** only rows satisfying the bound remain, combined with every other
  active filter

### Requirement: Status, Capture and Coverage are not visible columns

Removed at Katy's request; the fields are still computed and stored on the
corpus row (`current`, `superseded_by`, `capture`, coverage).

**Fails until:** one of the three renders as a column, or stops being computed.

### Requirement: No traction value is ever read as zero

**Fails until:** a blank Ranked or Targeting value renders as, sorts as, or is
exported as the number `0`.

#### Scenario: Blank cells sort after populated ones

- **WHEN** the table is sorted by `Etsy SEO` or `Listings`
- **THEN** rows with no value collect at the end in either direction
