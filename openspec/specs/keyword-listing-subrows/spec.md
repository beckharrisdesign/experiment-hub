# keyword-listing-subrows

## Purpose

Where a keyword relates to real listings, each listing gets its own row
beneath the keyword, so every listing-level fact lines up with the listing it
belongs to — and where the facts do not line up, that is visible rather than
implied away. The table's job is to make the question askable, not to answer
it (decision 16).

Promoted 2026-09-21 from `keyword-table-restructure` (2026-09-20, shipped in
#510).

## Requirements

### Requirement: A keyword with related listings expands into one sub-row per listing

The parent row stays keyword-grained; `Listings` on the parent is the count.

**Fails until:** two listings' facts share one row, or a listing-level value
sits on the keyword row where it cannot be attributed.

#### Scenario: Several listings become several rows

- **WHEN** a keyword is carried as a tag on four listings
- **THEN** four sub-rows appear beneath it, each holding its own `Tag slot`

#### Scenario: A keyword with no related listings stays a single row

- **WHEN** no listing relates to the keyword by any relationship (about 86% of
  rows)
- **THEN** it renders as one row with no sub-rows

### Requirement: Sub-rows include every listing related by any relationship

Membership is the union of listings that carry the keyword as a tag, that Etsy
matched an ad to, and that a searcher landed on — never the intersection.

**Fails until:** a listing related by one relationship is omitted because it is
unrelated by another.

#### Scenario: An ad-matched listing that carries no such tag still gets a row

- **WHEN** Etsy matched an ad for the keyword to a listing that does not carry
  it as a tag
- **THEN** that listing gets its own sub-row with an empty tag slot

#### Scenario: A landed-on listing that carries no such tag still gets a row

- **WHEN** a real searcher reached a listing for a term that is not one of its
  tags
- **THEN** that listing gets its own sub-row

**Note — Ranked is not in the union.** The delta spec listed "rank for it" as a
fourth relationship. Task 3.6 of the change kept Ranked a scalar on the parent
because the *Spotted on Etsy* archive identifies listings by title, not id, and
cannot be joined to an id-keyed sub-row reliably (`lib/keyword-traction.ts`,
`toListingRows`; see `keyword-traction`). Three relationships form the union
today.

### Requirement: A listing title appears in exactly one column

**Fails until:** the same listing title appears in two columns of one row.

#### Scenario: Facts align to the listing they describe

- **WHEN** a listing is both tagged and matched by an ad
- **THEN** its tag slot, its `Advertised` mark and its ad figures render on
  that one row

#### Scenario: An ad-matched listing with no tag still has a title

- **WHEN** a listing reaches the sub-rows only through an ad match
- **THEN** it renders by title, not bare id — found while building:
  `withTargeting` was fetching every title and discarding it

### Requirement: Advertised is a mark on a listing, and its absence is not a verdict

**Fails until:** the table describes an Etsy-matched keyword as one the shop
targeted, or an empty mark is read as "not advertised".

#### Scenario: The band names Etsy as the matcher

- **WHEN** the Etsy Ads band renders
- **THEN** its label reads `Etsy Ads — matched by Etsy`

#### Scenario: A blank mark makes no claim

- **WHEN** a listing's `Advertised` mark is empty
- **THEN** it means Etsy never matched this keyword to that listing, nothing
  more

### Requirement: Sorting and filtering stay keyword-grained, and a filter can ask for absence

**Fails until:** a sort or filter reorders sub-rows away from their parent, or
a reader cannot ask for rows where one column is present and another empty.

#### Scenario: A sort orders parents, not sub-rows

- **WHEN** the reader sorts by any column
- **THEN** parent rows reorder and each parent's sub-rows move with it

#### Scenario: Presence and absence compose into one query

- **WHEN** the reader asks for rows that have `Views` and have no `Tag slot`
- **THEN** the table shows the listings Etsy advertised the keyword on that
  carry no such tag, and the presence filter renders a chip that names its
  column (found while building: the first version applied but showed no chip)

#### Scenario: A matching sub-row keeps its parent visible

- **WHEN** a filter matches on a sub-row's value
- **THEN** its parent row remains visible

### Requirement: Per-listing detail is served to the public route, deliberately

`/keyword-explorer` is unauthenticated. `keyword-captured-demand` had kept
listing ids and tag slots server-side; the sub-rows need them on the client.
Katy reversed the boundary (decision 18: *"don't gate it its a PIA - just push
it"*) and reconfirmed on 2026-09-21: *"don't care about that boundary — this is
public experimentation."*

**Fails until:** the page gates the sub-rows behind auth, or strips tag slots
from the payload.
