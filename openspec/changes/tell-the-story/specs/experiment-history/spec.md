# experiment-history — spec

See [proposal.md](../../proposal.md) — each experiment detail page carries a dated, evidence-linked History reconstructing where the project (and Katy's thinking) was over time. Generate-then-approve: drafts are assembled from real repo evidence; every published entry is approved and editable in Notion.

**Outcomes (from proposal):** Outside readers get the journey, not just the verdict; Katy hangs context on each experiment as it happens. History sits below the `stop-the-leaks` narrative statements, renders read-only, and is silent when empty.

## ADDED Requirements

### Requirement: History renders below the narrative statements

Approved timeline entries appear as a read-only **History** section on the experiment detail page, below the guiding statements curated by `stop-the-leaks`, in chronological order with month-level dates.

**Fails until:** a public detail page with approved entries shows a History band (mono date gutter + one-sentence milestones) beneath Exec Summary and above the footer.

The detail page SHALL render approved History entries in ascending date order, each as a month-level date beside a single milestone sentence.

#### Scenario: Approved entries render chronologically

- **WHEN** an anonymous visitor opens the detail page of an experiment with approved History entries
- **THEN** a History section renders below the narrative statements, entries oldest-to-newest, each showing a month-level date (e.g. "Mar 2026") and its milestone sentence

#### Scenario: No approved entries hides the section

- **WHEN** the detail page renders an experiment with no approved History entries
- **THEN** no History heading or band appears (silent omission, matching the detail page's empty-state rule)

### Requirement: Entries are Notion-owned and approval-gated

Timeline entries live in Notion, hand-editable, and nothing renders on a public route unless it is approved there. The hub reads entries read-only; it never writes them.

**Fails until:** an entry edited or unapproved in Notion changes what the page shows within the read cache window, and no code path writes timeline entries to Notion.

Each rendered entry SHALL originate from an approved Notion record; unapproved or draft entries SHALL NOT render publicly.

#### Scenario: Only approved entries publish

- **WHEN** an experiment has a mix of approved and unapproved (draft) timeline entries in Notion
- **THEN** only the approved entries render on the public detail page

### Requirement: Drafts are assembled from real evidence, never invented

A repo-local draft generator proposes candidate entries at rollup grain from real sources — the `experiment-hub` PR archive (filtered per experiment by title/paths), path-scoped `git log -- experiments/{slug}/`, and genuine external repos — and writes nothing to Notion. Counts are countable; dates are real. "Synthetic" describes assembly, never invention.

**Fails until:** running the generator on an experiment emits rollup candidate entries (e.g. "pushed 5 PRs focused on foundations") sourced from actual PRs/commits, and makes zero Notion writes.

The generator SHALL derive entries only from real repository evidence and SHALL NOT publish; a human approves each entry in Notion before it can render.

#### Scenario: Generator proposes, never publishes

- **WHEN** Katy runs the draft generator against an experiment's repo history
- **THEN** it outputs candidate rollup milestones drawn from real PRs/commits for her review, and writes nothing to Notion

#### Scenario: Chat transcripts are never mined

- **WHEN** the generator assembles candidates
- **THEN** it uses only commits, PRs, and release notes — never chat/session transcripts (privacy risk; they may inform Katy's own writing but are never mined automatically)

### Requirement: Results carry their receipt; dead ends are first-class

An entry that asserts a result carries the number in the sentence itself ("500 visits, 38 signups") or it does not ship. Failures and dead ends appear as first-class entries; a dead experiment's terminal entry aligns with its kill reason so no two surfaces disagree.

**Fails until:** a result-asserting entry without an inline number is rejected, and a dead experiment's final History entry matches its `Outcome` line.

A result-claiming entry SHALL contain its supporting figure inline; a terminal entry for a dead experiment SHALL agree with the `Outcome` source (`publish-the-graveyard`).

#### Scenario: Result entry without a receipt is not shipped

- **WHEN** a candidate entry claims a result but carries no inline number
- **THEN** it is not published as-is (Katy adds the receipt or the entry doesn't ship)

#### Scenario: Dead-end terminal entry aligns with the kill reason

- **WHEN** an experiment is dead and has a terminal History entry
- **THEN** that entry's reason agrees with the `Outcome` line — one honesty rule, no drift between surfaces
