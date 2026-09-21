# keyword-corpus

## Purpose

Every keyword observation the shop has captured, queryable as rows of one
generated dataset — `data/keyword-corpus.json`, rebuilt by
`scripts/ingest-pulls.py --apply` from the exports archived under
`docs/pulls/`. The corpus records what each instrument printed and never infers
what it did not.

Promoted 2026-09-21 from `keyword-explorer` (2026-09-17). Later changes
(`keyword-explorer-unified-view`, `keyword-captured-demand`,
`keyword-table-restructure`) changed the row's *shape*; those contracts live in
`unified-keyword-row`, `captured-demand` and `erank-merged-source`. This spec
holds what has stayed true since the first ingest.

## Requirements

### Requirement: The corpus is built from the archive by the existing ingest run

Every keyword export in `docs/pulls/` becomes rows in one generated dataset,
refreshed by the same command that already lands pulls. As of 2026-09-21 the
readers are `read_keyword_csv`, `read_bulk_keywords_csv`,
`read_tag_report_csv`, `read_spotted_on_etsy_csv`, `read_listing_stats_json`
and `read_ads_keywords_json`, joined by `build_merged_corpus`.

**Fails until:** `data/keyword-corpus.json` is missing, or an archived export
of a supported shape contributes no rows.

#### Scenario: Ingest generates the corpus from every archived export

- **WHEN** `scripts/ingest-pulls.py --apply` runs against `docs/pulls/`
- **THEN** every supported export present is parsed into the corpus (2,310 rows
  from the 2026-09-15 to 2026-09-20 archive at promotion)

#### Scenario: A newly landed export appears without hand-editing

- **WHEN** a new export is landed and the ingest run repeats
- **THEN** its rows join the corpus with no file edited by hand — exercised for
  real by the 40 eRank exports landed in #501 and the Sep 18 batch in #503,
  both after the generator was written

### Requirement: Keyword-scoped fields are carried once; query-scoped fields stay per query

Searches, competition and KD belong to the keyword; tag occurrences belong to
the query that surfaced it, so they are kept per query rather than flattened.

**Fails until:** `embroidery font` resolves to a single tag-occurrence number
instead of its four per-query values.

#### Scenario: Tag occurrences are retained per query

- **WHEN** a keyword was returned by more than one query in the same capture
- **THEN** the row lists each query with its own tag-occurrence count, and
  `Found via` names every query

#### Scenario: Keyword-scoped fields are not duplicated per query

- **WHEN** the same keyword appears under several queries in one capture
- **THEN** searches, competition and KD are carried once on the row

### Requirement: Re-pulls form a series, and absence is never read as decline

A repeat capture of the same query adds to the series rather than replacing
it. The newest observation is current; earlier ones are kept under `history`
with `superseded_by` set. Nothing derives disappearance from a keyword being
missing.

**Fails until:** a keyword absent from a later capture is reported as declined,
removed, or zero; or an earlier capture is discarded on re-pull.

#### Scenario: A repeat capture supersedes rather than overwrites

- **WHEN** a query is exported again later
- **THEN** the new rows become current, the previous rows are marked
  superseded, and both remain readable in the corpus

#### Scenario: A keyword missing from a later capture is reported as unobserved

- **WHEN** a keyword present in an earlier capture is absent from a later one
- **THEN** the corpus reports its coverage as *seen in N of M captures* and
  derives no change in demand from the absence

**Note — what the table shows.** The original change required current and
superseded rows to be *distinguishable on the table*. That was withdrawn by
`keyword-explorer-etsy-traction` (Status, Capture and Coverage removed from the
visible columns at Katy's request) and settled by `keyword-explorer-unified-view`
decision 5: the merged row shows the newest capture's values with no marker,
and the series is preserved in the corpus, not on the surface. A future change
that wants the series visible again starts from `history`, which is intact.
