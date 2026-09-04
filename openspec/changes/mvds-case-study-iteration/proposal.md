# mvds-case-study-iteration

## Human anchor

> "Lets experiment with writing a combined case study for MVDS. get reviews
> from all my Voices - strategist, prd writer, designer, etc. …
> Attempt to generate imagery where possible, or put placeholders with a
> brief to me to go and produce it." — Katy, 2026-09-04

## Outcomes

- **Who:** Katy as portfolio author; design-leadership / hiring readers on
  beckharrisdesign.com; future case studies that reuse the critique-and-
  imagery pattern.
- **Job:** Land the five-voice panel critiques in
  `docs/case-studies/mvds-combined.md` and give the piece visual evidence —
  every image either generated from a live source (the mvds landing page,
  the MVDS Core Figma mirror, the hub's production surfaces) with its
  provenance recorded, or a placeholder carrying a concrete production brief
  Katy can execute.
- **Done when:** Every item in the review synthesis
  (`docs/case-studies/mvds-combined-reviews.md`) is resolved — applied, or
  declined with a recorded reason; every image slot is filled or briefed;
  the piece's numbers are pinned in a sources table; and the draft still
  passes the historian's rules (every claim carries its number, every quote
  a date and checkable link).
- **Not doing:** Publishing to beckharrisdesign.com (Katy's explicit call,
  separate step); staging History chapters to Notion; cross-repo visualizer
  support; any change to the mvds repo itself.

## Why

The five-voice panel review (strategist, PRD writer, designer, UX writer,
historian) produced seven convergent findings. Four are already applied —
verified number corrections, the ambient-catches economics, the teams
hypothesis reframe, the inflection-points move. Three remain, and the
largest is the designer's: the piece's craft is present only as CI rule
names, and its only visual evidence is a link. A portfolio case study by a
product designer with no imagery is arguing against itself.

## What changes

- `docs/case-studies/mvds-combined.md` — remaining critiques folded in:
  title honesty, "who it's not for," the enforced-vs-guiding principle
  count (9 machine-checked of 20, with the terracotta 2.78:1 contrast
  catch as the narratable save), trimmed PR-inventory evidence blocks, a
  restored sources table, and image slots per section.
- `docs/case-studies/assets/` — captured imagery (landing page, gate
  statuses, Figma mirror, hub-consuming-MVDS) via the repo's existing
  Playwright capture tooling and the Figma MCP, where access allows.
- Placeholder blocks with production briefs wherever generation falls
  short — each brief names the subject, source, and intent so Katy can
  produce it without this conversation.
- `docs/case-studies/mvds-combined-reviews.md` — synthesis updated to
  record each finding's resolution.

## Capabilities

### New Capabilities

- `case-study-imagery`: every visual in a case study is either generated
  from a live, named source with provenance, or is a placeholder carrying a
  production brief — no decorative or unsourced imagery.

### Modified Capabilities

- (none)

## Impact

- Docs only: `docs/case-studies/**` and this change folder. No hub app
  code, no mvds repo changes. Capture runs read against the public mvds
  landing page and the public MVDS Core Figma file.

## Optional links

- Panel reviews: `docs/case-studies/mvds-combined-reviews.md`
- The draft under iteration: `docs/case-studies/mvds-combined.md`
- Approach comparison that produced it: `docs/case-studies/mvds-approaches.md`
