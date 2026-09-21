# keyword-table-grouping

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: a reader can tell at a glance what kind of claim each column makes — someone else's estimate, a choice we made, or something that really happened — and can still tell while scrolled into the middle of the table.

## ADDED Requirements

### Requirement: Three buckets sort the columns by the kind of claim they make

`Observed`, `Targeted` and `Performance` sit above the source bands. Observed is a third party's estimate; Targeted is a deliberate act of ours; Performance is what really happened.

**Fails until:** a reader cannot tell whether a column reports an estimate, a decision or an outcome.

#### Scenario: Each bucket covers a contiguous run of columns

- **WHEN** the table renders
- **THEN** every bucket spans an unbroken run, with `Targeting` ordered before `Ranked` so `Performance` is not split in two

#### Scenario: Ad results sit under Performance, not Targeted

- **WHEN** a keyword has Etsy Ads figures
- **THEN** views, clicks, spend, revenue, orders and ROAS appear under `Performance`, because they are outcomes rather than choices

#### Scenario: A thin bucket is not padded out

- **WHEN** `Targeted` holds fewer columns than the others
- **THEN** it renders at its true size rather than being filled to match

### Requirement: Every group names itself over a rule spanning exactly its columns

Both tiers carry a rule beneath their label, and the rule's width is how a reader knows which columns belong to which group.

**Fails until:** a group label sits over a rule that is wider or narrower than the columns it names.

#### Scenario: Bucket and band rules are distinguishable

- **WHEN** both tiers render
- **THEN** the bucket rule is heavier than the band rule, so the two levels of grouping are not confusable

#### Scenario: The ungrouped keyword column carries no rule

- **WHEN** the `Keyword` column renders
- **THEN** it has no group label and no rule

### Requirement: Group labels stay readable while the table scrolls sideways

A left-aligned label at the start of a wide group disappears as soon as a reader scrolls into that group.

**Fails until:** scrolling into the middle of a bucket leaves the reader unable to see which bucket or band they are reading.

#### Scenario: A label pins to the left edge of the scroll region

- **WHEN** the table is scrolled so that a group's first column is off-screen while later columns of that group are visible
- **THEN** that group's label remains visible at the left edge of the scrolling area

#### Scenario: One label hands over to the next

- **WHEN** scrolling passes from one group into the next
- **THEN** the outgoing label gives way to the incoming one rather than both showing

### Requirement: Alignment follows the data type

Numbers and dates align right; text aligns left.

**Fails until:** a numeric column renders left-aligned, or a text column renders right-aligned.

#### Scenario: Numeric columns align right

- **WHEN** a column reports a number
- **THEN** its values and its header align right

#### Scenario: Text columns align left

- **WHEN** a column reports text, such as `Keyword`, `Found via`, `Listing` or `Reported by`
- **THEN** its values and its header align left

### Requirement: Column headers are written in Title Case without abbreviation

**Fails until:** a header still reads as an abbreviation where a full name fits.

#### Scenario: The agreed names render

- **WHEN** the header row renders
- **THEN** it reads `Search Volume`, `Etsy Competition`, `Avg CTR %`, `Google Volume`, `Tag Count`, `Search / Competition`, `Etsy SEO` and `Listings` in place of the abbreviated originals

#### Scenario: A two-line header keeps its break

- **WHEN** a header carries a deliberate line break
- **THEN** it renders on two lines rather than being flattened to one
