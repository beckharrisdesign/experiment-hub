# tasks — mvds-case-study-iteration

## 1. User outcomes (from spec scenarios)

- [x] 1.1 Captured image carries provenance — all six captures carry
  source + 2026-09-04 date in their captions; historian re-verified
- [x] 1.2 Failed capture becomes a brief — slot 2 (three-copies diagram)
  is a callout on the Notion page with subject, source, intent
- [x] 1.3 Figma review precedes Notion embed — Katy approved 02.4 with
  her copy edits before any embed
- [x] 1.4 Review pages are findable by name — pages 01/02/02.1–02.4 all
  carry `MVDS case study · mvds-case-study-iteration`
- [x] 1.5 A future case study runs from the skill alone — skill rewritten
  2026-09-04 with the full loop, no session references
- [x] 1.6 Panel re-review gates completion — five APPROVEs (below)
- [x] 1.7 Tone pass — adjective scan clean; body ≈ 450 words vs the
  2,000 budget (UX-writer re-review)

## 2. Figma — as-is and imagery pages (done at the design gate, 2026-09-04)

- [x] 2.1 Create the "MVDS case study" Figma file — 
  https://www.figma.com/design/e3DpnGzFqQVZfwHzpt6Huu
- [x] 2.2 Page `01 MVDS case study · mvds-case-study-iteration — as-is`:
  reconstruction of the current Notion draft (brain-dump state, properties
  noted empty), node 1:3
- [x] 2.3 Captured the live slots serially at 1024px with provenance
  captions: landing hero, gates, install, hub surface (redirected to
  `/sign-in` — itself MVDS-built), MVDS Core mirror (Figma API render),
  plus the bonus principles grid
- [x] 2.4 Slot 5 captured — public Storybook `foundations-color--palette`
  (no fallback brief needed)
- [x] 2.5 Slot-2 brief card on the board (three-copies diagram — Katy's
  hand): subject, source, intent
- [x] 2.6 Page `02 MVDS case study · mvds-case-study-iteration — imagery`:
  board node 1:23 — seven captures + brief card + slot-8 note
- [x] 2.7 Katy reviewed the boards through four iterations (02 → 02.4:
  16:9 crops, Notion context, portfolio render, bg fix + her copy edits +
  callout bar) and approved 2026-09-04 ("I made copy edits - lets not
  lose them. But otherwise, approved."). Approved copy snapshotted to
  `assets/approved-copy-2026-09-04.md`.

## 3. Notion — populate the draft page

- [x] 3.1 Re-fetched immediately before writing (page unchanged since
  2026-09-02); Katy's approved 02.4 copy is the source
- [x] 3.2 Properties filled: TLDR, Challenge, Approach, Outcome (per the
  approved-copy mapping; her callout-cell wording)
- [x] 3.3 Body inserted per the approved copy — callout triad up top,
  Challenge, Approach x3, closing; her title/heads supersede the earlier
  design wording (recorded in assets/approved-copy-2026-09-04.md); seed
  elements preserved under a "Working notes" divider, none deleted
- [x] 3.4 Body ≈ 450 words — far under budget (her cut, not trims of mine)
- [x] 3.5 Six images uploaded as Notion attachments with provenance
  captions; diagram brief as a callout; seed #10 artifacts intact below
  the divider
- [x] 3.6 `Published` verified NO after all writes

## 4. Skill — encode the method

- [x] 4.1 `skills/case-study/SKILL.md` rewritten 2026-09-04 — full loop,
  content-surface rule, Figma-at-design-gate, naming convention,
  acceptance gates
- [x] 4.2 CLAUDE.md index line updated

## 5. QA — acceptance passes

- [x] 5.1 Panel re-review: five APPROVEs, logged below
- [x] 5.2 Tone pass: adjective scan clean, ≈450 words (UX-writer voice)
- [x] 5.3 Historian receipt check: all numbers and captions verified
  against the live repo
- [ ] 5.4 Manual walkthrough: Katy reads the page top to bottom — her
  acceptance ("showcases how I think about systems and platforms, no
  narcissism, no droning") is the final gate

## Resolution log

Panel re-review, 2026-09-04, against the live Notion page — five voices,
five APPROVEs:

- **Strategist — APPROVE.** Tightened cut stays inside verified facts;
  production-consumption claim self-discloses the consumer as her own
  hub; no cut created a dangling overclaim.
- **PRD Writer — APPROVE.** Properties match callout and body verbatim;
  numbers exact. *Non-blocking:* the `Slug` property still reads
  `building-an-experimentation-engine` — mismatched; Katy's call before
  Published flips.
- **Designer — APPROVE.** Captions carry arguments, not just labels; the
  diagram gap is "understood and assigned rather than hidden."
- **UX Writer — APPROVE.** Adjective scan clean ("opinionated"/"honest"
  describe mechanisms); ~450 words. *Non-blocking:* the "Diagram to
  come" callout is process residue that must resolve before publishing;
  the closing caption is the one jargon-dense spot.
- **Historian — APPROVE.** 104 merged PRs, 3 tags, thirteen weeks, and
  PRs #64–65 (2026-07-15) all verify live; captions claim only what
  their sources show.

Open before Published (Katy): the three-copies diagram (brief on-page),
the Slug decision, optional closing-caption jargon soften.
