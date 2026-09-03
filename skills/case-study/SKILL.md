---
name: case-study
description: >-
  Write a portfolio case study about an experiment or linked-repo effort —
  mine the evidence trail first, draft the argument with every inference
  marked, interview Katy one question per turn, and fold her answers in
  verbatim. For outside readers (design-leadership / hiring audience) on
  beckharrisdesign.com. Use when the user wants a case study, portfolio
  write-up, or long-form story arguing the judgment behind a project.
  Trigger phrases: "write a case study", "portfolio piece", "case study
  for", "write up the mvds/etsy/&lt;project&gt; effort".
---

# Case Study

Writes the long-form portfolio story of a project. Shares its method with
`experiment-narrative` (mine → draft → interview → fold in verbatim) but
produces a different artifact: **an argument, not a log.** The History band
answers "what happened, when"; a case study answers "what was the judgment,
and did it hold up."

## How it differs from experiment-narrative

| | History band | Case study |
| --- | --- | --- |
| Shape | Dated milestone chapters | Problem → decisions → outcome arc |
| Voice | Attributed source log (`gh:` / `Katy:`) | Katy's first person throughout |
| Home | BHD Labs History (Notion) → hub detail page | beckharrisdesign.com portfolio |
| Unit of honesty | Every milestone has a receipt link | Every decision names its trade-off |
| Scope | Hub experiments | Any effort — experiments AND linked repos |

## The form

1. **Hook** — one short paragraph: what was built, the one number or fact
   that earns the read, and the tension that made it non-obvious.
2. **The problem** — what was broken or missing, for whom, before any
   solution vocabulary appears. Only Katy can supply the origin; never
   invent it.
3. **Constraints** — the real ones (solo founder, budget/plan limits, time,
   tooling). Constraints are what make the decisions legible.
4. **Decisions** — 3–5 sections, each: the choice, the alternative NOT
   taken, why, and what it cost. A decision without a named trade-off is
   marketing; cut it or find the trade-off.
5. **Outcome** — results with numbers inline, failures included. What
   shipped, who uses it, what died.
6. **Reflection** — what she'd do differently. Short, specific, unforced.

## Style rules (inherited, do not relax)

- Katy's words VERBATIM where the draft uses her account — a case study is
  in her voice, so her interview answers become first-person prose, but
  never paraphrase a claim she hasn't made.
- No result claim without its number inline; "roughly" and "from memory"
  are acceptable qualifiers, silence is not.
- Plain labels, display-text links, no invented vocabulary where a plain
  word exists. Project jargon (token names, gate names) is quoted evidence,
  not narrative vocabulary — introduce it, then use plainly.
- Never address Katy inside the artifact; questions for her go in chat.
- Never restate her drafting instructions in the doc.
- Mark every inference as an inference until she confirms it.
- Match the destination's render (`feedback_drafts_mirror_production`):
  ask where it will be published before polishing layout, and draft in
  that shape.

## The loop

1. **Mine the trail before asking anything.** For a linked repo, use `gh`
   against the repo itself: releases, CHANGELOG, merged-PR list, README
   voice, CI workflows. Cross-check the hub side: adoption commits,
   `docs/` reviews, Notion status. File dates and release tags pin what
   memory can't.
2. **Draft the full arc first** with gaps and inferences marked. Working
   dates and evidence go in a staging table at the end of the draft, not
   in the prose.
3. **Interview ONE question per turn** (`rules/principles.mdc`). Lead with
   the question the trail cannot answer — usually the origin problem or
   what triggered a turn. Fold each answer in before asking the next.
   Expect answers to reshape the arc; rebuild, don't patch.
4. **Consistency check** before calling it done: every decision has its
   trade-off, every number has a source in the staging table, the outcome
   agrees with live status (a paused project is not a triumphant ending).

## Drafts and publication

Drafts live at `docs/case-studies/<slug>.md` in the hub repo. Publication
to the portfolio site is Katy's explicit call — the draft's staging table
and inference marks are stripped only at publish time, never before.
