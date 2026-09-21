# unified-keyword-row

## Purpose

One corpus row per distinct keyword text, carrying an independently-nullable
sub-object per source — `keyword_tool`, `bulk_keywords`, `tag_report`, `erank`
(the merged eRank reading, see `erank-merged-source`), `ranked`, `shop_search`
and `ads` — with no cross-source reconciliation and nothing fabricated for a
source that has no data.

Promoted 2026-09-21 from `keyword-explorer-unified-view` (2026-09-18,
shipped in #505). `keyword-captured-demand` (#508) added `shop_search` and
`ads` under the same rule.

## Requirements

### Requirement: One row per distinct keyword, merged across every source

A keyword that appears in more than one source is one row carrying all of
them, and a keyword that appears in only one source is still a row.

**Fails until:** `folk art embroidery` — present in Keyword Tool, Bulk
Keywords and the Tag Report at once — resolves to more than one row, or any of
its sources is missing from the row it does resolve to.

#### Scenario: A keyword measured by three instruments is one row

- **WHEN** the corpus is built and a keyword's text exact-matches
  (case-insensitive) a row in more than one source
- **THEN** one row exists for that keyword carrying every matching sub-object,
  and no duplicate row exists for the same text

#### Scenario: A keyword only one source has ever seen still gets a row

- **WHEN** a keyword exists in exactly one source — a Tag-Report-only tag such
  as `bedroom wall art`, a Ranked-only term such as `snow globe`, or a captured
  search term nobody else has scored
- **THEN** a row exists for it with that source's sub-object populated and
  every other sub-object `null`

#### Scenario: Near-identical keywords stay separate rows

- **WHEN** two keywords differ by any character that is not letter case —
  `snow globe` and `snow globes`
- **THEN** they remain two distinct rows; matching is exact text,
  case-insensitive, with no stemming, fuzzy or near-text join

### Requirement: An absent source renders blank, and blank has exactly one look

A source with no data for a keyword contributes nothing rather than a zero,
and every kind of absence looks the same.

**Fails until:** any cell belonging to a `null` sub-object carries the number
`0`, or a reported `Unknown` renders differently from a source with no row.

#### Scenario: An absent source is never fabricated as zero

- **WHEN** a row's sub-object for a source is `null`
- **THEN** every column belonging to that source is blank, and no numeric
  field belonging to it is `0`

#### Scenario: A reported unknown looks identical to an absent source

- **WHEN** a source carries the literal `Unknown` or an empty cell for a field
- **THEN** it renders as the same single blank glyph used for an absent source

#### Scenario: A censored value keeps its reported text

- **WHEN** a source reports a capped value rather than an exact one — `< 20`
- **THEN** the cell shows `< 20`, never a blank and never a bare `20`

### Requirement: The Tag Report is read into the corpus

The archived Tag Report export contributes columns to the merged row instead
of sitting as an unread CSV.

**Fails until:** `docs/pulls/2026-09-15-erank-tag-report.csv` contributes no
fields, or its tags that appear in no other source produce no rows.

#### Scenario: Tag Report fields land on the merged row

- **WHEN** the corpus is built from an archive containing a Tag Report export
- **THEN** each tag contributes its occurrences, searches, clicks, CTR,
  competition, KD and Google searches to the row for that keyword, joined by
  the same exact-text rule as every other source

#### Scenario: Tag-Report-only tags create their own rows

- **WHEN** a Tag Report tag matches nothing in any other source (258 of the
  archive's 287 tags at the time)
- **THEN** a row is created for it rather than the tag being dropped

### Requirement: When a source has several captures, the newest wins and the rest are kept

**Decision 5 of the change, taken by Katy when the row shape forced it.**
83 keywords carried more than one Keyword Tool capture; the merged row shows
the newest capture's values, earlier captures stay under `history`, and the
table carries no marker of which won.

**Fails until:** an older capture's values overwrite a newer one, or an
earlier capture is dropped from the corpus.

#### Scenario: Newest-wins without loss

- **WHEN** a keyword has captures on two dates from the same source
- **THEN** the row's sub-object holds the newer values and `history` holds the
  older, with `superseded_by` pointing forward
