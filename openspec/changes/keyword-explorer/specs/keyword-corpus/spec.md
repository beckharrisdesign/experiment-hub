# keyword-corpus

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. In short: every keyword observation the shop has captured, queryable as rows, with current and stale distinguishable — and no inference the source data cannot support.

## ADDED Requirements

### Requirement: The corpus is built from the archive by the existing ingest run

Every keyword CSV in `docs/pulls/` becomes rows in one generated dataset, refreshed by the same command that already lands pulls.

**Fails until:** `data/keyword-corpus.json` does not exist, or lands rows for fewer than the ten keyword CSVs currently archived.

#### Scenario: Ingest generates the corpus from every archived keyword CSV

- **WHEN** `scripts/ingest-pulls.py --apply` runs against `docs/pulls/`
- **THEN** every keyword CSV present is parsed into the corpus, and the 83 rows across the ten 2026-09-17 CSVs are all represented

#### Scenario: A newly landed CSV appears without hand-editing

- **WHEN** a new keyword export is landed and the ingest run repeats
- **THEN** its rows join the corpus with no file edited by hand

### Requirement: A row is one keyword in one capture, and query-scoped fields stay per query

Searches, competition and KD belong to the keyword; tag occurrences belong to the query that surfaced it, so they are kept per query rather than flattened.

**Fails until:** `embroidery font` resolves to a single tag-occurrence number instead of its four per-query values.

#### Scenario: Tag occurrences are retained per query

- **WHEN** a keyword was returned by more than one query in the same capture
- **THEN** the row lists each query with its own tag-occurrence count, and `embroidery font` shows 80, 81, 12 and 6 rather than one merged figure

#### Scenario: Keyword-scoped fields are not duplicated per query

- **WHEN** the same keyword appears under several queries in one capture
- **THEN** searches, competition and KD are carried once on the row

### Requirement: Re-pulls form a series, and absence is never read as decline

A repeat capture of the same query adds to the series rather than replacing it; the newest observation is current and earlier ones are superseded. Nothing derives disappearance from a keyword being missing.

**Fails until:** a keyword absent from a later capture is reported as declined, removed, or zero.

#### Scenario: A repeat capture supersedes rather than overwrites

- **WHEN** a query is exported again months later
- **THEN** the new rows become current, the previous rows are marked superseded, and both remain readable

#### Scenario: A keyword missing from a later capture is reported as unobserved

- **WHEN** a keyword present in an earlier capture is absent from a later one
- **THEN** the corpus reports its coverage as *seen in N of M captures* and derives no change in demand from the absence
