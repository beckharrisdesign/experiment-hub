# case-study-imagery

## Outcomes

See [proposal Outcomes](../../proposal.md#outcomes). This capability covers
the visual-evidence half: every image on the case-study page is sourced or
briefed, and reviewed in Figma before it embeds in Notion.

## ADDED Requirements

### Requirement: Every visual is sourced or briefed

Every image on the case-study page either comes from a live, named source
with its provenance recorded, or is a placeholder callout carrying a
production brief (subject, source, intent) that Katy can execute without
the drafting conversation.

**Fails until:** No image slot on the Notion page is unexplained — each is
a real capture with provenance or a briefed placeholder.

The case study SHALL contain no decorative or unsourced imagery, and its
images SHALL share a common aspect ratio (16:9 default) unless a specific
image genuinely requires its own — each presented as a fixed-ratio crop
window over the uncropped capture, so the visible region can be
repositioned without re-capturing.

#### Scenario: Captured image carries provenance

- **WHEN** an image is generated from a live source (mvds landing page,
  MVDS Core Figma file, hub production surface)
- **THEN** the page records what it shows and where it was captured from,
  and the capture source is one a reader could visit.

#### Scenario: Failed capture becomes a brief

- **WHEN** an image cannot be generated from a live source
- **THEN** its slot appears as a callout with a production brief naming
  subject, source, and intent — complete enough to execute standalone.

### Requirement: Imagery is reviewed in Figma before embedding

Candidate imagery lands on a numbered page in a Figma file for review, per
`rules/figma.mdc`, before any image embeds in the Notion draft. Review
pages are findable by name alone: every page carries the iteration number,
the case-study name, and the change slug —
`NN.n <case-study name> · <change-slug> — <pass>`, e.g.
`02.1 MVDS case study · mvds-case-study-iteration — imagery`.

The imagery pass SHALL NOT edit a previously reviewed Figma page in place —
each revision round gets a new numbered page — and every review page's name
SHALL include both the case-study name and the change slug.

#### Scenario: Figma review precedes Notion embed

- **WHEN** captured imagery is ready for the case study
- **THEN** it appears on a numbered Figma page first, and embeds in Notion
  only after Katy's explicit go on that page.

#### Scenario: Review pages are findable by name

- **WHEN** a review page is created for this change
- **THEN** its name carries the iteration number, the case-study name, and
  the change slug, so the page traces to both the piece and the OpenSpec
  change without opening it.
