# case-study-method

## Outcomes

See [proposal Outcomes](../../proposal.md#outcomes). This capability covers
the process half: the loop is encoded as the `case-study` skill, the panel
approves per discipline, and the piece passes Katy's voice acceptance.

## ADDED Requirements

### Requirement: The skill encodes the loop as run

`skills/case-study/SKILL.md` describes the full case-study process a future
session can run without this conversation: mine the trail → draft with
inferences marked → interview one question per turn → voice-panel review →
verify numbers against live sources → iterate through schema gates →
sourced imagery → content drafted and reviewed in Notion/Figma, with
markdown stopping at OpenSpec artifacts.

**Fails until:** The skill still describes markdown drafts under
`docs/case-studies/` as the content surface.

The skill SHALL name Notion (draft page) and Figma (imagery review) as the
content surfaces and OpenSpec artifacts as the only markdown outputs.

#### Scenario: A future case study runs from the skill alone

- **WHEN** a session invokes the case-study skill for a new project
- **THEN** the skill's steps produce the same loop run here — including the
  panel pass and the content-surface rule — with no reference to this
  conversation.

### Requirement: Each panel voice approves its own discipline

Before the piece is called done, each voice — strategist, PRD writer,
designer, UX writer, historian — re-reviews the near-final draft and
approves how its discipline is represented, with resolutions recorded in
this change's `tasks.md`.

**Fails until:** Any voice's re-review is missing or returns unresolved
findings.

Every panel finding SHALL be resolved as applied or declined-with-reason —
never silently dropped.

#### Scenario: Panel re-review gates completion

- **WHEN** the Notion draft reaches near-final state
- **THEN** all five voices re-review it, and the piece is not done until
  each approves its discipline's representation or its objection is
  recorded as declined with a reason.

### Requirement: The piece passes the voice acceptance

The case study showcases how Katy thinks about systems and platforms
without sounding narcissistic or droning on: first-person confident, zero
self-praise adjectives, within the length budget `design.md` sets.

**Fails until:** The tone pass finds self-praise adjectives, or the piece
exceeds the length budget.

The final draft SHALL carry its argument in decisions and receipts, never
in self-description.

#### Scenario: Tone pass on the near-final draft

- **WHEN** the near-final draft is checked for voice
- **THEN** it contains no self-praise adjectives about Katy or the work
  (praise lives in quoted evidence, if anywhere), and its length is within
  the budget design.md sets.
