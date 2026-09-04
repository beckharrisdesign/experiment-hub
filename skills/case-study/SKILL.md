---
name: case-study
description: >-
  Write a portfolio case study about an experiment or linked-repo effort —
  mine the evidence trail, interview Katy one question per turn, run a
  voice-panel review, iterate through OpenSpec schema gates with a Figma
  design gate, and deliver onto the project's Notion case-study page.
  Content lives in Notion and Figma; markdown stops at OpenSpec artifacts.
  Use when the user wants a case study, portfolio write-up, or long-form
  story arguing the judgment behind a project. Trigger phrases: "write a
  case study", "portfolio piece", "case study for", "write up the
  mvds/etsy/<project> effort".
---

# Case Study

Writes the long-form portfolio story of a project as **an argument, not a
log** — and runs it through the same gates as any other shipped change.
Method proven on the MVDS case study (change `mvds-case-study-iteration`,
2026-09-04).

## Surfaces (hard rule)

- **Notion** is the draft and delivery surface: the project's page in the
  BHD Project Writing database (properties: TLDR, Challenge, Approach,
  Outcome — the same triad the portfolio site's deep-dive pages render).
- **Figma** is the review surface for imagery and for seeing content in
  context (including a render mimicking beckharrisdesign.com's live
  frontend, probed from the live site — never guessed).
- **Markdown stops at OpenSpec artifacts.** No content drafts under
  `docs/`; the change folder's artifacts and `assets/` snapshots are the
  only markdown outputs.
- `Published` on the Notion page is Katy's switch. Never touch it.

## The loop

1. **Mine the trail before asking anything.** `gh` against the repo
   (releases, CHANGELOG, merged-PR list — count *merged*, not top PR
   number), the hub side, and Notion (a remote repo's experiment row
   lives in Notion ONLY — never claim absence from repo-local files).
   OpenSpec Human anchors hold verbatim decision quotes interviews miss —
   read them.
2. **Draft with every inference marked**, then **interview one question
   per turn** (`rules/principles.mdc`). Fold answers in near-verbatim;
   expect the arc to be rebuilt, not patched. Her account supersedes
   drafts and notes; record supersessions.
3. **Voice-panel review** — parallel reviewers, each grounded in its own
   skill: Strategist (`business-case-writer`), PRD Writer (`prd-writer` +
   template), Designer (`design-advisor`), UX Writer
   (`user-communication`), Historian (this skill + verification via `gh`).
   Verify every number the Historian challenges against the live source
   before accepting either side.
4. **Open an OpenSpec change** (`experiment-hub-lite`) for the iteration:
   proposal (inventory every pre-existing element on the Notion page with
   an explicit fold-in/replace fate) → specs → design → tasks, one
   artifact per approval.
5. **Figma is part of the design gate, not apply.** Build the as-is +
   proposed pair before design approval: as-is reconstructs the current
   Notion page; proposed iterates on numbered pages —
   `NN.n <case-study name> · <change-slug> — <pass>` — never editing a
   reviewed page in place. Iterate: imagery board → common-crop pass →
   content in context → portfolio-frontend render. Fold Katy's in-Figma
   copy edits back promptly and snapshot the approved copy into the
   change's `assets/` as the record.
6. **Imagery**: every visual captured from a live, named source with
   provenance (URL + date), or a placeholder brief (subject, source,
   intent) Katy can execute standalone. Common aspect ratio (16:9
   default) as fixed crop windows over the uncropped capture, so the
   visible region repositions without re-capturing. Captures run serially
   (8GB machine).
7. **Populate the Notion page** (after her approval): re-fetch
   immediately before writing; fill the four properties; insert the
   approved body with a summary callout of the triad at the top; images
   uploaded as Notion attachments (never hotlinks); pre-existing content
   moves under a "Working notes" divider — folded in or superseded, never
   silently deleted.
8. **Acceptance**: each panel voice re-reviews the live Notion page and
   approves its own discipline (objections resolved or declined with
   reason, logged in `tasks.md`); mechanical tone pass (zero self-praise
   adjectives outside quoted evidence; length within the design.md
   budget); then Katy's read-through — her bar: the piece showcases how
   she thinks about systems and platforms without sounding narcissistic
   or droning on.

## Style rules (do not relax)

- Katy's words near-verbatim; never paraphrase a claim she hasn't made.
- No result claim without its number inline, and every number verified
  against the live source ("104 merged PRs" — counted, not read off the
  top PR number).
- Plain labels, display-text links, no invented vocabulary; introduce
  project jargon once, then use it plainly.
- Never address Katy inside any artifact; questions go in chat.
- Trade-offs named per decision; lost evidence acknowledged, never
  papered over.
- Publication — the site or the Notion `Published` flag — is Katy's
  explicit call, always.
