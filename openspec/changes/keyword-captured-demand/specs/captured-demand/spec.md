# captured-demand

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: two new sources on the merged keyword row — the search terms buyers typed to reach a listing (Shop), and the keywords Etsy matched an ad to (Etsy Ads) — joined by the same exact-text rule as every other source, stored exactly as captured.

## ADDED Requirements

### Requirement: A captured search term lands on the keyword row it belongs to

A term a buyer really typed shows the visits it drove and the listing it reached, on the row for that keyword.

**Fails until:** `paper embriodery template` resolves to no row, or resolves to a row whose Shop columns are blank.

#### Scenario: A captured term with no eRank data still gets a row

- **WHEN** the corpus is built and a captured search term matches no Keyword Tool, Bulk Keywords or Tag Report entry
- **THEN** a row exists for it carrying only its Shop sub-object, exactly as a Ranked-only term does today

#### Scenario: A captured term that eRank also knows lands on the same row

- **WHEN** a captured term's text exact-matches (case-insensitive) an existing corpus keyword
- **THEN** its Shop data attaches to that existing row rather than creating a second one

#### Scenario: The listing's outcome travels with the term but stays the listing's

- **WHEN** a row carries a Shop sub-object
- **THEN** it also carries the listing id, title, items sold and revenue for the listing that term reached, and those values are labelled as the listing's rather than presented as produced by the term

### Requirement: A captured term is stored exactly as it was typed

Nothing normalises, spell-corrects, case-folds or merges a captured term.

**Fails until:** `paper embriodery template` appears anywhere as `paper embroidery template`, or `hand embroidery pattern pdf` and `hand embroidery patterns pdf` collapse into one row.

#### Scenario: A misspelled term keeps its misspelling

- **WHEN** a captured term contains a buyer's typo
- **THEN** it is stored and rendered exactly as captured, and does not merge with its corrected spelling

#### Scenario: Singular and plural stay separate rows

- **WHEN** two captured terms differ only by pluralisation
- **THEN** they remain two rows, matching the existing rule that `snow globe` and `snow globes` are distinct

### Requirement: Etsy Ads is its own band and never merges with search terms

Ad targeted keywords sit in their own column group, because they measure something different.

**Fails until:** an ad keyword's views are added to, or rendered in, a Shop visits cell.

#### Scenario: An ad keyword with no organic arrivals still lands

- **WHEN** a targeted keyword has ad views but the listing's search terms never mention it
- **THEN** its row shows Ads columns populated and Shop columns blank — `geometric embroidery pattern` is this case

#### Scenario: Views and visits are never summed

- **WHEN** a keyword has both ad views and captured visits
- **THEN** the two are rendered in separate bands and no cell anywhere shows their total

#### Scenario: The two windows are labelled where they are read

- **WHEN** the table renders the Ads and Shop bands
- **THEN** each band states its own window, because Ads keyword data covers the last 30 days while Shop covers the year

### Requirement: The reader survives both export shapes and records what it could not read

Parsing handles the variation the archive actually contains, and absence is never recorded as zero.

**Fails until:** a listing whose search-terms table has two columns yields no terms, or an unreadable page is written into the corpus as a zero.

#### Scenario: Both search-term table shapes parse

- **WHEN** the reader encounters a 2-column (`Search terms | Visits`) or a 4-column (`Search terms | Etsy | Google, etc. | Total visits`) row
- **THEN** both yield the term and its visit counts, and the Etsy/Google split is populated only where the export provided it

#### Scenario: An unreadable capture stays unreadable

- **WHEN** the archive records a listing as unreadable or not re-scraped
- **THEN** no row anywhere gains a `0` for it, and the corpus carries no value for that listing
