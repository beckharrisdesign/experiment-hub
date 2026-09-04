# mvds-case-study-iteration

## Human anchor

> "Lets experiment with writing a combined case study for MVDS. get reviews
> from all my Voices - strategist, prd writer, designer, etc. …
> Attempt to generate imagery where possible, or put placeholders with a
> brief to me to go and produce it. … I want it to populate the draft case
> study page for MVDS with our progress. … I also want an outcome to be a
> new case study writing skill (or an updated existing one) that works
> through the process we do here." — Katy, 2026-09-04

## Outcomes

- **Who:** Katy as portfolio author; design-leadership / hiring readers on
  beckharrisdesign.com; future case studies that reuse the critique-and-
  imagery pattern.
- **Job:** Land the five-voice panel critiques in
  `docs/case-studies/mvds-combined.md`; give the piece visual evidence —
  every image either generated from a live source (the mvds landing page,
  the MVDS Core Figma mirror, the hub's production surfaces) with its
  provenance recorded, or a placeholder carrying a concrete production brief
  Katy can execute; populate the MVDS draft case-study page in Notion
  ("BHD Labs: Building an opinionated design system that doesn't drift,"
  BHD Project Writing database) with the iterated content — Challenge /
  Approach / Outcome / TLDR properties plus body — folding in, not
  overwriting, the seed material already on the page; and encode the whole
  process as the `case-study` skill so the next case study runs it without
  this conversation.
- **Done when:** Every panel finding is resolved — applied, or declined
  with a recorded reason — with resolutions tracked in this change's
  `tasks.md`; every image slot on the Notion page is filled or carries a
  production brief; the piece's numbers stay pinned to checkable receipts;
  the Notion page's case-study properties and body reflect the current
  draft, with each pre-existing brain-dump element either folded in or
  replaced per the inventory below (Published stays NO — that switch is
  Katy's); **each panel voice re-reviews the near-final piece and approves
  how its own discipline is represented** — strategist the business logic,
  PRD writer the problem/scope/measures, designer the craft evidence, UX
  writer the language, historian the receipts; **Katy's own acceptance
  reads: the case study showcases how she thinks about systems and
  platforms without sounding narcissistic or droning on and on** — checked
  concretely as a tone pass (first person confident, zero self-praise
  adjectives) and a length budget the design decides; and
  `skills/case-study/SKILL.md` describes the full loop as run here: mine →
  draft → interview → voice-panel review → verified fixes → gated
  iteration → sourced imagery → content reviewed in Notion/Figma, never
  loose markdown.
- **Not doing:** Publishing — neither to beckharrisdesign.com nor flipping
  the Notion page's Published flag (Katy's explicit call, separate step);
  staging History chapters to the BHD Labs History database; cross-repo
  visualizer support; any change to the mvds repo itself.

## Why

The five-voice panel review (strategist, PRD writer, designer, UX writer,
historian) produced seven convergent findings. Four are already applied —
verified number corrections, the ambient-catches economics, the teams
hypothesis reframe, the inflection-points move. Three remain, and the
largest is the designer's: the piece's craft is present only as CI rule
names, and its only visual evidence is a link. A portfolio case study by a
product designer with no imagery is arguing against itself.

## What changes

**Content surfaces are Notion and Figma only.** No new markdown content
files; markdown stops at this change's OpenSpec artifacts and the skill.
The existing drafts under `docs/case-studies/` freeze as source material —
all further content iteration happens on the Notion page.

- **Notion** — the MVDS draft case-study page gains the iterated piece:
  Challenge / Approach / Outcome / TLDR properties filled, body extended
  with the combined draft's content (critiques folded in: title honesty,
  "who it's not for," the 9-machine-checked-of-20 principle count with the
  terracotta 2.78:1 contrast catch, trimmed evidence blocks, pinned
  sources). The page's existing seed material is folded in, not
  overwritten; Published stays NO.
- **Figma** — captured imagery (landing page, gate statuses, MVDS Core
  mirror, hub-consuming-MVDS) lands on a numbered page in a Figma file for
  review, per `rules/figma.mdc`; approved images then embed in the Notion
  page. Wherever capture falls short, the slot appears in Notion as a
  callout carrying a production brief Katy can execute without this
  conversation.
- **Skill** — `skills/case-study/SKILL.md` updated to encode the process
  as run here, including the content-surface rule (drafts and review in
  Notion/Figma, not markdown).
- **Tracking** — each panel finding's resolution is recorded in this
  change's `tasks.md`, not in a separate reviews file.

## Existing page inventory (brain-dump elements to fold in or replace)

Logged from the live page 2026-09-04 so each has an explicit fate at apply
time — folded into the new draft, or replaced by it. None are deleted
without their content being carried or superseded:

1. "Problem: Vibe coding is great and all, but the basic foundations are
   harder to backfill the longer you go." — *fold in: problem section,
   Katy's verbatim voice.*
2. "Problem: Design systems are component rich and opinion scarce." —
   *fold in: strongest one-line framing of the gap; candidate TLDR
   material.*
3. "Hypothesis: There's foundational DNA of a system that could and should
   be in the wet cement from day 1 …" — *fold in: problem/constraints; the
   gray-area list (accessibility, app chrome, deep-linkable states) is
   concrete evidence the draft currently lacks.*
4. "Hypothesis: principles should be able to fail a build." — *fold in:
   Decision 2's thesis, in her original hypothesis form.*
5. "Founder intent: I think with all these hats, but when I'm experimenting
   I want to wear the founder hat first and foremost. Externalize some of
   my own zero-to-one processes …" — *fold in: constraints/outcome, aligns
   with the hats framing already in the draft.*
6. MVDS description paragraph ("built for both human and agentic founders
   …") — *replace: superseded by the hook.*
7. Six-element checklist columns (Principles / Token layer / Figma library /
   Component library / OpenSpec schemas / Skills) — *replace with the
   iterated piece's structure; the six elements survive as content.*
8. "Its designed to be environment agnostic - pull the npm package into
   your build from Claude, Cursor, Figma, etc. …" — *fold in: Decision 4
   (distribution).*
9. "Using schema and skills to do heuristics in flight, even self
   referentially." — *fold in: Decision 2 / eval-gate material.*
10. Existing screenshot image + "View a real file generated" embed —
    *keep: real artifacts; slot into the imagery plan (design decides
    placement).*

## Capabilities

### New Capabilities

- `case-study-imagery`: every visual in a case study is either generated
  from a live, named source with provenance, or is a placeholder carrying a
  production brief — no decorative or unsourced imagery.
- `case-study-method`: the case-study process is encoded as a skill —
  evidence-mined, interview-driven, panel-reviewed, iterated through
  schema gates, with content drafted and reviewed in Notion/Figma rather
  than loose markdown.

### Modified Capabilities

- (none)

## Impact

- This change folder and `skills/case-study/SKILL.md`. Writes to one
  Notion page Katy named (BHD Project Writing → the MVDS case-study draft)
  and one Figma review page. No hub app code, no mvds repo changes, no new
  content markdown. Capture runs read against the public mvds landing page
  and the public MVDS Core Figma file.

## Optional links

- Panel reviews: `docs/case-studies/mvds-combined-reviews.md`
- The draft under iteration: `docs/case-studies/mvds-combined.md`
- Approach comparison that produced it: `docs/case-studies/mvds-approaches.md`
