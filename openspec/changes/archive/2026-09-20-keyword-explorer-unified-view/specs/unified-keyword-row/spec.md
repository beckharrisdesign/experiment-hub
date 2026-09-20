# unified-keyword-row

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: one corpus row per distinct keyword text, carrying an independently-nullable sub-object per source — Keyword Tool, Bulk Keywords, Tag Report, Ranked, Targeting — with no cross-source reconciliation and nothing fabricated for a source that has no data.

## ADDED Requirements

### Requirement: One row per distinct keyword, merged across every source

A keyword that appears in more than one source is one row carrying all of them, and a keyword that appears in only one source is still a row.

**Fails until:** `folk art embroidery` — the only keyword in the archive present in Keyword Tool, Bulk Keywords and the Tag Report at once — resolves to more than one row, or any of its three sources is missing from the row it does resolve to.

#### Scenario: A keyword measured by three instruments is one row

- **WHEN** the corpus is built and a keyword's text exact-matches (case-insensitive) a row in Keyword Tool, a row in Bulk Keywords and a tag in the Tag Report
- **THEN** one row exists for that keyword, carrying all three sub-objects populated, and no duplicate row exists for the same keyword text

#### Scenario: A keyword only one source has ever seen still gets a row

- **WHEN** a keyword exists in exactly one source — a Tag-Report-only tag such as `bedroom wall art`, or a Ranked-only term such as `snow globe` with no Keyword Tool row
- **THEN** a row exists for it with that source's sub-object populated and every other sub-object `null`

#### Scenario: Near-identical keywords stay separate rows

- **WHEN** two keywords differ by any character that is not letter case — `snow globe` and `snow globes`, or `embroidery kits` and `embroidery designs`
- **THEN** they remain two distinct rows; matching is exact text, case-insensitive, with no stemming, fuzzy or near-text join

### Requirement: An absent source renders blank, and blank has exactly one look

A source with no data for a keyword contributes nothing rather than a zero, and every kind of absence looks the same.

**Fails until:** any cell belonging to a `null` sub-object carries the number `0`, or a Tag Report value of `Unknown` renders differently from a source that has no row for that keyword at all.

#### Scenario: An absent source is never fabricated as zero

- **WHEN** a row's sub-object for a source is `null` — `embroidery kits` has no Tag Report data
- **THEN** every column belonging to that source is blank, and no numeric field belonging to it is `0`, since `0` reads as measured-and-none rather than never-measured

#### Scenario: A reported unknown looks identical to an absent source

- **WHEN** the Tag Report carries the literal string `Unknown` or an empty cell for a field — `calm stitching` reports `Unknown` for Avg searches and an empty cell for KD
- **THEN** both render as the same single blank glyph used for an absent source; no second blank treatment distinguishes them

#### Scenario: A censored value keeps its reported text

- **WHEN** a source reports a capped value rather than an exact one — `folk art embroidery` reads `< 20` in both Bulk Keywords and the Tag Report
- **THEN** the cell shows `< 20` rather than a blank or a bare `20`, because a censored value is a reported value and not an absence

### Requirement: The Tag Report is read into the corpus for the first time

The archived Tag Report export becomes columns on the merged row instead of an unread CSV.

**Fails until:** `docs/pulls/2026-09-15-erank-tag-report.csv` contributes no fields to the built corpus, or its 258 tags that appear in no other source produce no rows.

#### Scenario: Tag Report fields land on the merged row

- **WHEN** the corpus is built from an archive containing a Tag Report export
- **THEN** each of its tags contributes Tag occurrences, Avg searches, Avg clicks, Avg CTR, Etsy competition, KD and Google searches to the row for that keyword, joined by the same case-insensitive exact-text rule every other source uses

#### Scenario: Tag-Report-only tags create their own rows

- **WHEN** a Tag Report tag matches no Keyword Tool row, Bulk Keywords row or ranked term — the case for 258 of the archive's 287 tags
- **THEN** a row is created for it with only the Tag Report sub-object populated, rather than the tag being dropped for lack of a row to attach to
