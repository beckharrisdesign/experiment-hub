# keyword-listing-subrows

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: where a keyword relates to real listings, each listing gets its own row, so every listing-level fact lines up with the listing it belongs to — and where the facts do not line up, that is visible rather than implied away.

## ADDED Requirements

### Requirement: A keyword with related listings expands into one sub-row per listing

The parent row stays keyword-grained. Each listing related to the keyword gets a sub-row beneath it.

**Fails until:** two listings' facts share one row, or a listing-level value sits on the keyword row where it cannot be attributed.

#### Scenario: Several listings become several rows

- **WHEN** a keyword is carried as a tag on four listings
- **THEN** four sub-rows appear beneath it, each holding that listing's own tag slot

#### Scenario: A keyword with no related listings stays a single row

- **WHEN** no listing relates to the keyword by any relationship
- **THEN** the keyword renders as one row with no sub-rows, exactly as it does today

#### Scenario: The count stays on the parent

- **WHEN** a keyword expands into sub-rows
- **THEN** the `Listings` count renders on the parent row

### Requirement: Sub-rows include every listing related by any relationship

Membership is the union of listings that carry the keyword as a tag, that Etsy matched an ad to, that a searcher landed on, and that rank for it — never the intersection.

**Fails until:** a listing related by one relationship is omitted because it is unrelated by another.

#### Scenario: An ad-matched listing that carries no such tag still gets a row

- **WHEN** Etsy matched an ad for the keyword to a listing that does not carry it as a tag
- **THEN** that listing gets its own sub-row, with an empty tag slot

#### Scenario: A landed-on listing that carries no such tag still gets a row

- **WHEN** a real searcher reached a listing for a term that is not one of its tags
- **THEN** that listing gets its own sub-row

### Requirement: A listing title appears in exactly one column

The sub-row is the listing. Its title is written once; everything else true of it renders as an attribute on that same line.

**Fails until:** the same listing title appears in two columns of one row.

#### Scenario: Facts align to the listing they describe

- **WHEN** a listing is both tagged and matched by an ad
- **THEN** its tag slot and its ad figures render on that one row, not in separate columns repeating the title

### Requirement: Advertised is a mark on a listing, and its absence is not a verdict

Etsy chooses which search terms an ad is shown for; the shop chooses which listings to advertise.

**Fails until:** the table describes an Etsy-matched keyword as one the shop targeted, or an empty mark is read as "not advertised".

#### Scenario: The band names Etsy as the matcher

- **WHEN** the Etsy Ads band renders
- **THEN** its label attributes the keyword match to Etsy rather than describing it as a targeted keyword

#### Scenario: A blank mark makes no claim

- **WHEN** a listing's `Advertised` mark is empty
- **THEN** it means Etsy never matched this keyword to that listing, and the table never presents it as evidence the listing is unadvertised

### Requirement: Sorting and filtering stay keyword-grained, and a filter can ask for absence

Sub-rows travel with their parent, so a filter can never orphan a listing from the keyword that explains it.

**Fails until:** a sort or filter reorders sub-rows away from their parent, or a reader cannot ask for rows where one column is present and another is empty.

#### Scenario: A sort orders parents, not sub-rows

- **WHEN** the reader sorts by `Search Volume`
- **THEN** parent rows reorder and each parent's sub-rows move with it, keeping their own order

#### Scenario: Presence and absence compose into one query

- **WHEN** the reader asks for rows that have `Ad views` and have no `Tag slot`
- **THEN** the table shows the listings Etsy advertised the keyword on that carry no such tag

#### Scenario: A matching sub-row keeps its parent visible

- **WHEN** a filter matches on a sub-row's value
- **THEN** its parent row remains visible so the keyword is never shown without its context
