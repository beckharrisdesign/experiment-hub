# design — mvds-case-study-iteration

## Context

The combined MVDS case study exists as frozen markdown source
(`docs/case-studies/mvds-combined.md`, plus the approaches comparison and
panel reviews). This change moves content to its real surfaces — the Notion
draft page ("BHD Labs: Building an opinionated design system that doesn't
drift," BHD Project Writing) and Figma for imagery review — folds in the
remaining panel critiques and the page's ten inventoried seed elements, and
encodes the process as the `case-study` skill.

## Goals / Non-Goals

**Goals:**

- The Notion page is the single content draft: properties filled, body
  restructured, seed elements folded in or replaced per the proposal
  inventory.
- Every image slot filled from a live source or briefed; imagery reviewed
  on named, numbered Figma pages before embedding.
- Panel re-approval per discipline; Katy's voice acceptance passes.
- `skills/case-study/SKILL.md` carries the whole loop forward.

**Non-Goals:**

- No publishing (site or Notion `Published` flag). No new content markdown.
- No hub app or mvds repo changes. No History-database staging.

## User flow / IA — the Notion page structure

Property mapping (case-study database fields):

| Property | Content |
| --- | --- |
| TLDR | ≤50 words; built on "component rich and opinion scarce" (seed #2) |
| Challenge | The three-copies problem + "harder to backfill" (seeds #1, #3) |
| Approach | One-sentence-per-decision summary of the four decisions |
| Outcome | Hats-off + the teams hypothesis, honestly framed |

Body order (seed fates from the proposal inventory in parentheses):

1. **Hook** — thirteen weeks, the three-copies turn (replaces seed #6).
2. **Problem** — designer/engineer/founder accounts; wet-cement and
   backfill lines verbatim (seeds #1, #3).
3. **Constraints** — hats (seed #5), Figma Pro, designer-not-in-the-room.
4. **Decisions 1–4** — as iterated, with: "principles should be able to
   fail a build" as Decision 2's opening hypothesis (seed #4); the
   9-of-20 enforced/guiding count and the terracotta 2.78:1 catch;
   environment-agnostic line in Decision 4 (seed #8);
   heuristics-in-flight line with the eval gate (seed #9).
5. **The dogfood loop** — unchanged in substance.
6. **Outcome** — countables, hats, teams-as-hypothesis.
7. **Reflection** — early users + the record lesson.
8. The six-element checklist (seed #7) dissolves into Decision 2 and the
   Outcome; the existing screenshot and "real file generated" embed
   (seed #10) slot into imagery (below).

## Visual design / Figma

This change's user-visible surface is the Notion page; the Figma work *is*
the change's imagery deliverable, so the as-is + proposed pair is produced
as the first apply step (gated by spec: no Notion embed before Katy's go on
the numbered page).

| Item | Value |
| --- | --- |
| Primary file URL | New file **"MVDS case study"**, created at apply step 1 (URL recorded in tasks.md when created) |
| As-is frame(s) | `01 MVDS case study · mvds-case-study-iteration — as-is` — capture of the current Notion draft (brain-dump state) |
| Proposed frame(s) | `02 MVDS case study · mvds-case-study-iteration — imagery` — the eight image slots below, laid out per section |
| Libraries / version | None bound — frames hold captures, not compositions; MVDS Core stays untouched |
| Code Connect | N/A — no components |
| Breakpoints | Captures at L·1024 desktop (BHD Content Types); no responsive pass — Notion owns the page layout |
| Status | Pending — created at apply, reviewed before any embed |

### Image slots

| # | Section | Source | Mode |
| --- | --- | --- | --- |
| 1 | Hook | mvds landing hero — `https://mvds-roan.vercel.app` | capture (Playwright) |
| 2 | Problem | Three-copies diagram (dev/Figma/features splitting → principle unifying) | **brief for Katy** — her diagram, her hand |
| 3 | Decision 1 | MVDS Core public mirror — components/variables view | capture (Figma MCP screenshot); fallback: brief |
| 4 | Decision 2 | Landing gate statuses / "How we enforce" | capture (Playwright) |
| 5 | Decision 3 | Gradation specimen (1–5 steps, both modes) | capture (Storybook/landing if exposed); fallback: brief |
| 6 | Decision 4 | Install path / consumer-path proof on landing | capture (Playwright) |
| 7 | Dogfood | Hub production surface consuming MVDS (pdf-metadata-viewer) | capture (Playwright, prod hub) |
| 8 | Decision 1 or Dogfood | Existing page screenshot + "real file generated" embed (seed #10) | keep in place |

Every capture records URL + date as provenance; every fallback brief names
subject, source, intent.

## Decisions

- **D1 — Length budget: body ≤ 2,000 words** (current draft ≈ 2,400 —
  the trims come from PR-inventory evidence blocks and duplicate thesis
  statements). TLDR ≤ 50 words. This is the voice-acceptance budget.
- **D2 — Tone check is mechanical where possible:** zero self-praise
  adjectives applied to Katy or the work (banned list: e.g. innovative,
  masterful, elegant, beautiful, visionary, unique); praise may exist only
  inside quoted, attributed evidence. Judgment half (droning) is caught by
  the budget and the UX-writer re-review.
- **D3 — Title:** "MVDS: a design system that can't drift silently" —
  the UX writer's honesty fix; the body's repair passes stay.
- **D4 — "Who it's not for"** lands as one sentence closing Decision 3:
  not for teams wanting exhaustive component coverage or Figma as the
  system of record.
- **D5 — Notion writes are fold-ins:** re-fetch the page immediately
  before writing; seed elements moved per inventory, never deleted with
  content uncarried; `Published` untouched.
- **D6 — Panel re-review runs against the Notion page,** not markdown —
  five voices, each approving its discipline; resolutions live in
  `tasks.md` §1 checkboxes.
- **D7 — Capture runs serially** (single Playwright worker) — 8GB machine
  constraint.

## Risks / Trade-offs

- **Figma MCP write access** to create the file/pages may be limited in
  this session → fallback: Katy creates the file, agent supplies contents
  as uploads; slots degrade to briefs, which the spec already permits.
- **Notion image embeds** need real uploads (signed S3 URLs expire) →
  upload as attachments via the Notion API, never hotlinks.
- **Gradation/Storybook capture** may have no public URL → slot 5 degrades
  to a brief; acceptable by spec.
- **Two drafts risk divergence** (frozen markdown vs live Notion) → frozen
  files gain nothing after this change; the skill names Notion as the only
  draft surface going forward.
