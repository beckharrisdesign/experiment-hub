# experiment-history — spec

## Outcomes

See [proposal.md](../../proposal.md) — each experiment detail page carries a dated, evidence-linked History reconstructing where the project (and Katy's thinking) was over time. Generate-then-approve: drafts are assembled from real repo evidence; every published entry is approved and editable in Notion.

- **Who:** Outside readers who want the journey (a hiring manager reading a case study that wrote itself), and Katy hanging context on each experiment as she lives it.
- **Job:** History sits below the `stop-the-leaks` narrative statements, renders read-only, and is silent when empty. It accumulates on its own; Katy approves rather than authors from scratch.
- **Done when:** the five requirements below hold on the detail page.
- **Not doing:** homepage timeline, per-day granularity, chat-transcript mining, auto-publish, link-artifact chips (v1). Scheduled *overwriting* is out — accumulation is append-only.

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

A draft generator proposes candidate entries at rollup grain from real sources: path-scoped `git log -- experiments/{slug}/` (primary — hub history is intact to 2025-11-12), the `experiment-hub` PR archive filtered by title/paths, **the experiment's Figma file — named versions, numbered iteration pages, and comment threads**, and genuine external repos where one exists. Counts are countable; dates are real. "Synthetic" describes assembly, never invention.

**Fails until:** the generator emits rollup candidate entries (e.g. "pushed 5 PRs focused on foundations", "third iteration of the landing approved in Figma") sourced from actual commits, PRs, and Figma versions.

The generator SHALL derive entries only from real evidence and SHALL NOT publish; a human approves each entry in Notion before it can render.

#### Scenario: Generator proposes, never publishes

- **WHEN** the draft generator runs against an experiment's history
- **THEN** it outputs candidate rollup milestones drawn from real commits, PRs, and Figma versions, every one of them unapproved

#### Scenario: Design iteration counts as evidence

- **WHEN** an experiment's Figma file carries named versions or numbered iteration pages
- **THEN** those are eligible source material for entries — design iteration is first-class history, not decoration (unlabeled autosave points are ignored as noise)

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

### Requirement: Entries accumulate on a schedule without publishing

History accretes on its own. A scheduled job appends draft entries as work happens, so an experiment's story exists by the time it ships or dies — without Katy remembering to run anything. Accumulation and publication are separate: the job only ever inserts unapproved rows, and never modifies or deletes an existing one.

**Fails until:** a month of activity produces a draft entry in Notion with no human action, that entry does not render publicly, and a previously edited entry is byte-identical after the job runs.

The job SHALL run monthly, SHALL insert only with `Approved` unchecked, and SHALL NOT update or delete existing entries. It SHALL run outside the hub app — the hub's read path stays write-free.

#### Scenario: A month of work appears as a draft

- **WHEN** an experiment has commits, merged PRs, or Figma versions in a given month
- **THEN** the job appends one rollup draft entry for that month, unapproved, and it does not appear on the public page

#### Scenario: Katy's edits are never clobbered

- **WHEN** the job runs against an experiment whose entries she has already edited or approved
- **THEN** those rows are untouched — the job appends only, so approved wording never churns

#### Scenario: A quiet month adds nothing

- **WHEN** an experiment has no real activity in a month, or only hub-wide changes that swept its paths incidentally
- **THEN** no entry is created — silence is accurate, and inventing activity would misrepresent a stalled experiment as live
