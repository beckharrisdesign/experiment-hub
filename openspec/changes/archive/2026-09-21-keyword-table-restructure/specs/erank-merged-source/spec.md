# erank-merged-source

## Outcomes

See [`proposal.md`](../../proposal.md) § Outcomes. The surface: eRank's three exports read as one instrument — each measurement reported once, at the best precision any tool gave it, with the reporting tools named and nothing computed.

## ADDED Requirements

### Requirement: Each eRank measurement appears once, at its best reported precision

A keyword's Search Volume, Etsy Competition and KD occupy one column each. The value shown is one eRank actually printed — chosen, never calculated.

**Fails until:** the table shows the same eRank measurement in more than one column, or shows a number no eRank export contains.

#### Scenario: An exact value beats a capped one

- **WHEN** one eRank tool reports a keyword's searches exactly and another caps it at `< 20`
- **THEN** the row shows the exact value, because a cap that contains it is less useful rather than contradictory

#### Scenario: Two exact values agree, so the choice is free

- **WHEN** two eRank tools both report a field exactly
- **THEN** the row shows that value, and the merge never averages, sums or blends the two

#### Scenario: A capped value is still better than nothing

- **WHEN** only capped values exist for a field
- **THEN** the row shows the cap rather than a blank

#### Scenario: The one known collision still favours the exact reading

- **WHEN** one tool reports exactly `20` and another reports `< 20`, as `beginner embroidery` does
- **THEN** the row shows `20`, and the design records this as a genuine collision rather than a precision difference

### Requirement: A censored value still reads as censored

The merge changes which tool a number came from, never whether eRank capped it.

**Fails until:** a value eRank capped renders as though it were exact.

#### Scenario: The cap survives the merge

- **WHEN** the value chosen for a field was reported as a cap
- **THEN** it renders with its `<` prefix

### Requirement: The row names which eRank tools reported the keyword

Collapsing three bands into one would otherwise hide how well attested a keyword is.

**Fails until:** a reader cannot tell whether a keyword was seen by one eRank tool or all three.

#### Scenario: Provenance renders as initials

- **WHEN** a keyword was seen by the Keyword Tool, Bulk Keywords and the Tag Report
- **THEN** a `Reported by` column shows `KT · B · T`

#### Scenario: A tool counts as reporting when it saw the keyword

- **WHEN** a tool has a record for the keyword but left a given field blank
- **THEN** it is still named in `Reported by`, because the column describes attestation rather than any one field

### Requirement: The derived ratio survives the merge and inherits censoring

`Search / Competition` is computed from the merged values, not from one tool's sub-object.

**Fails until:** the ratio disappears, or a ratio resting on a capped searches figure renders as though it were exact.

#### Scenario: More rows gain a ratio

- **WHEN** searches came from one eRank tool and competition from another
- **THEN** the ratio is still computed and shown

#### Scenario: A ratio built on a cap is shown as an upper bound

- **WHEN** the merged searches value was capped
- **THEN** the ratio renders with a `<` prefix rather than as an exact figure
