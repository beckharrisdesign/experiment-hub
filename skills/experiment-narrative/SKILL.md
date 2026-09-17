---
name: experiment-narrative
description: >-
  Draft a new experiment History narrative or augment an existing one — mine the
  trail (git, PRs, prior repos, Drive, Supabase, Notion), draft chapter entries
  with voice-attributed sources, interview Katy in chat one question at a time,
  fold her answers in verbatim, and stage entries to the BHD Labs History
  database only on explicit OK. Use when the user wants to write, extend, or
  revise the story of an experiment. Trigger phrases: "draft the history",
  "tell the story of", "add to the narrative", "write the exemplar entries",
  "update the history for", "narrate this experiment".
---

# Experiment Narrative

Authors the History band for an experiment — the dated, source-backed story that
renders on its hub detail page — by combining what the evidence trail shows with
what only Katy knows, in her voice. Works for a fresh narrative or for adding
chapters to one that exists. Method proven on the Best Day Ever exemplar
(`openspec/changes/tell-the-story/exemplar-draft.md`, PR #398).

## The form

The audience is outside readers. Each chapter is:

1. **Milestone** — ONE sentence; this is what renders on the hub. It carries the
   *why*, not just the what. No result claim without its number inline
   ("roughly 25 signups"), per tell-the-story task 4.4.
2. **Sources** — each speaking as itself, a log of voices:
   - `gh:` what the commit/PR trail shows (shape over dates: "all in a single
     day", "a steady polish pass over three weeks")
   - `supabase:` / `notion:` what the data says
   - `Katy:` her words VERBATIM, quoted — never paraphrased into third person
3. **Links** — last, display-text markdown only (`[commit](…) · [PR](…) ·
   [PRD](…)`), never raw URLs, never the word "receipt" as a label. The first
   link becomes the Notion `Receipt URL` value at staging.

Style rules (hard-won, do not relax):

- Never address Katy inside the artifact; questions for her go in chat.
- Never restate her drafting instructions in the doc.
- Plain labels; no invented vocabulary where a plain word exists.
- Her lived account SUPERSEDES prior session notes and even the task file —
  when they conflict, record the supersession and correct memory.

## The loop

1. **Mine the trail before asking anything.** Path-scoped `git log`, PR list
   (`<slug> in:title`, never bare full-text search), `scripts/draft-history.ts`
   for the rollup skeleton. Then go wider: prior repos (`gh repo list` — ideas
   usually predate the hub), the Drive sync directory
   (`~/Library/CloudStorage/GoogleDrive-katy@beckharrisdesign.com`), Supabase
   submissions, Notion status. File mtimes and repo-creation dates can pin
   dates memory can't.
2. **Draft all chapters first**, marking every inference as an inference. Put
   working dates in a staging table at the end, never in chapter headings.
3. **Interview in chat, ONE question per turn** (ADHD accessibility — see
   `rules/principles.mdc`). Lead with the question the trail genuinely cannot
   answer (usually "what triggered the change?"). Fold each answer in verbatim
   before asking the next. Expect answers to reshape the outline — a new
   account may add chapters or invalidate the draft's premise; rebuild, don't
   patch.
4. **Check consistency** before staging: terminal entry agrees with the Notion
   `Outcome`/`Status` (a hold is not an ending); every result claim carries
   its number; lost evidence is acknowledged in-entry ("roughly", "from the
   author's account"), never papered over.

## Dates

Date ranges, not months (decided 2026-08-22, task 3.11): Notion `Date` start
orders the log; the optional end date sets display grain — single day
"Mar 9, 2026", span "Mar 10–30, 2026", cross-month "Apr–Jun 2026", no end date
"Apr 2026" (generator entries). Pick the honest grain: a one-day launch is a
day; an uncertain period is a month-wide range said plainly ("exact span
unknown").

## Staging to Notion

NEVER write rows without Katy's explicit OK in this conversation
(`feedback_confirm_before_db_inserts`). Immediately before inserting, re-query
the History database for existing rows — test entries and prior stagings are
real. Insert with `Approved` UNCHECKED; approval is her go-live switch, entry
by entry, in Notion. Database: "BHD Labs History", data source
`b68916bb-235e-411b-827d-7dfc0c0f0a07`, related to the experiment row by page
id.

**A chapter is the whole block, not just the sentence.** The hub renders only
the milestone + receipt link, so when staging, write the chapter's full source
log (the gh/supabase/notion/Katy voices, all links) into the entry's Notion
PAGE BODY — the milestone is the title; the body is the record behind it.
Tell Katy explicitly which parts render publicly and which live only in the
entry body; do not let the draft's rich form imply the hub shows all of it
(learned 2026-08-22).

## Augmenting an existing narrative

Read the live rows first (approved and drafts). New chapters slot by start
date; never edit an approved entry's text without asking — approved entries
are published writing. When new information contradicts a published entry,
propose the correction in chat with both versions side by side.
