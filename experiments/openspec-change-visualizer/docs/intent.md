# openspec-change-visualizer — intent

## Human anchor

> "I want to build a lightweight structure or format that visualizes how any single change moved through openspec gates. so an openspec visualizer that looks at one change at a time. Mostly this is because I hear time and time again that despite all our tooling, most of us still ask the question 'what's going on?' 'what are we working on?' and thats surprisingly hard to answer still. I want to start with a change as the unit of currency."

(Katy, 2026-08-28)

## The unit

One OpenSpec change. Not a sprint, not an experiment, not a PR — the thing that
has a name, a folder, a set of gates, and an end.

This repo has 46 of them: 13 in `openspec/changes/`, 33 in `changes/archive/`.
Every one already carries the material for its own story. None of them can tell it.

## Why it is hard, measured on a real change

`tell-the-story` is a normal change in this repo, and answering "what's going on
with it" today means reading five sources that never meet:

| Question | Where the answer lives |
| --- | --- |
| What is it for, in Katy's words? | `proposal.md` § Human anchor |
| Which gates has it passed? | `openspec status --change … --json` |
| When did each gate pass? | `git log --diff-filter=A` per artifact file |
| What is actually proven vs claimed? | `tasks.md` checkboxes + `↳ verified` receipt lines |
| Did the code ship? | GitHub — 11 merged PRs between 2026-07-20 and 2026-08-24 |
| How did it end? | `archive.md` — absent, because it hasn't |

A change is not one PR. `tell-the-story` is eleven (#304, #314, #317, #319, #321,
#322, #398, #399, #400, #401, #402), spread over five weeks, none of which names
the change in a way a person scanning the PR list would connect.

And the sources disagree. `tasks.md` reports 25 of 35 done and leaves 3.11 (date
ranges at their natural grain) unchecked — but `endDate` and `formatDateSpan` are
in `lib/notion-history.ts` and PR #399 merged that work on 2026-08-22. The
checkbox is stale. "What's going on" is not just scattered; on this change it is
currently *wrong*, and nothing surfaces the disagreement.

## What the visualizer is

One frame per change, assembled from what already exists. No new state to
maintain, no field a human has to remember to update.

Worked example — `tell-the-story`, rendered from live repo and GitHub data today:

```
tell-the-story                                          IN FLIGHT · day 42

  "I want to work towards reconstructing a high level history of where my
   brain was at over time … We're building a case study of the experiment
   in real time."                                       — Katy, 2026-07-17

  GATES   ● proposal ── ● specs ── ● design ── ● tasks ── ◐ apply ── ○ archive
            07-17         07-20      07-20      07-21      11 PRs      —

  JOB     Each experiment detail page carries a dated, evidence-linked
          History reconstructing where the project was at over time.
  DONE    Notion holds approved entries · hub renders them read-only ·
   WHEN   a generator drafts candidates from commits, PRs and Figma.
  NOT     No transcripts as pipeline input. No auto-publish. No scheduled
   DOING  overwriting — drafts append, unapproved.

  OUTCOMES   8 of 11 checked — but only 5 are held up by an automated test.
             Three rest on a code path nobody re-checks, two wait on a
             person remembering at authoring time, and one is deferred.

    ✓ 1.1   Approved entries render chronologically      automated test
    ✓ 1.2   No approved entries hides the section        code path
    ✓ 1.3   Only approved entries publish                automated test
    ✓ 1.4   Generator writes nothing to Notion           automated test
    ✓ 1.5   Generator never mines transcripts            code path
    ○ 1.6   Result claims carry an inline number         human review
    ○ 1.7   A dead experiment's last entry agrees        human review
    ✓ 1.8   A month of activity drafts itself            code path
    ✓ 1.9   Approved entries are never overwritten       automated test
    ✓ 1.10  A quiet month adds nothing                   automated test
    ○ 1.11  Figma versions count as evidence             deferred

  OPEN    1.6 · 1.7 are authoring-time rules, not code — nothing enforces
          them. 1.11 is deferred: the seam is wired, but Best Day Ever has
          no Figma file to validate the adapter against.

  DRIFT   3.11 date ranges — shipped in lib/notion-history.ts (#399),
          still unchecked in tasks.md

  CODE    11 PRs · 07-20 → 08-24 · all merged
```

Seven bands, in the order a person actually asks them: why, where, what,
how far, why-not-yet, what's lying, what shipped.

**Every outcome, not just the on-deck ones — and how each is measured.** The
count alone ("8 of 11") is the number that flatters. Four measurement kinds
carry very different weight, so the card names them per outcome rather than
averaging them away:

| Kind | What holds it up |
| --- | --- |
| `automated test` | A test fails if the outcome regresses. |
| `code path` | The behaviour exists in code, but nothing re-checks it. |
| `human review` | A person has to remember, at authoring time. Nothing enforces it. |
| `deferred` | Not measured at all yet, and the card says so rather than staying silent. |

On `tell-the-story` that split is the finding: 8 checked, 5 defended by a test.

**Frame stamps.** Every frame carries its own provenance on the first line —
`<change> — <numbered page> — <datetime>` — so a frame pasted into Notion, a
deck, or a message still says which change it belongs to, which iteration it
is, and when it was true. Frames outlive the file they were cut from.

The DRIFT band is the part no existing tool has. Everything else is retrieval;
that one is a comparison, and it is where "surprisingly hard to answer" turns
into "answered wrong with confidence."

## Done when

1. Any change in this repo — at any gate, including one with only a proposal —
   renders a card without hand-authored input.
2. Someone who has never seen the change can answer *where is it, what is it for,
   what is actually proven* in under thirty seconds from that one frame.
3. Every value traces to a file, a commit, or an API response. If a field can
   only be filled by a person remembering to fill it, it is cut.
4. It runs against all 46 changes without special-casing, and says so honestly
   when a source is missing.

## Not doing

- **Not a portfolio dashboard.** One change at a time is the whole premise. A
  list view is a different question and can wait until the single card is right.
- **Not a new status field.** Nothing gets written back into `tasks.md` or the
  change folder to make the card easier to build.
- **Not `tell-the-story`.** That change is experiment-grain, for outside readers,
  stored in Notion, and narrated in prose. This one is change-grain, for the
  person mid-flight, stored nowhere, and assembled on read. They share the
  instinct — put the trail in one place — and nothing else. If the card ever
  wants prose, it links to History rather than growing its own.
- **Not a replacement for `openspec status`.** It consumes it.

## Open assumptions

- Gate dates come from the first commit that added each artifact file. Artifacts
  written and committed in one batch will collapse to a single date — accepted
  as honest (that *is* when it was recorded), not papered over.
- PR attribution is by branch name and title match against the change name. This
  is the weakest link in the whole card; `tell-the-story`'s eleven PRs were found
  by matching the change name *and* its capability name, which will not generalise
  cleanly. Expect this to need a real rule, or an explicit link in the change folder.

## Medium

Discovery renders in Figma first; the destination is a hub page at `/changes/[id]`.
The Figma pass is deliberately ahead of `design.md` here — the format *is* the
discovery, so there is nothing to specify until the frame has been argued with.

| | |
| --- | --- |
| File | <https://www.figma.com/design/2FEqaAxp50skge0yJI5wAC/openspec-change-visualizer> |
| `fileKey` | `2FEqaAxp50skge0yJI5wAC` |
| `01 Current state` | `Current state · Desktop 1024` (`1:3`) — opens on the hypothesis above, then the five sources and the disagreement between them |
| `02 Proposed` | `Proposed · Change card · Desktop 1024` (`5:2`) — first iteration: six bands, filled with `tell-the-story`'s real values |
| `02.1 Proposed — every outcome, its evidence, and frame provenance` | `Proposed · Change card · Desktop 1024` (`9:3`) — all eleven outcomes with their measurement kind, plus the provenance stamp |
| `02.2 Proposed — larger type scale` | `Proposed · Change card · Desktop 1024` (`10:3`) — same card, every small size raised one step (11→13, 12→14, 13/14→15, 15→16) |
| `02.3 Proposed — multiple capabilities, and a loop back to design` | `Proposed · Change card · Desktop 1024` (`11:3`) — the hard case, worked against `pdf-metadata-viewer-cloud` |
| `02.4 Proposed — the change as a stream` | `Proposed · Stream · Desktop 1024` (`16:3`) — the same change told as a pull-request-style timeline instead of stacked bands |
| `02.5 Proposed — the stream, carrying its artifacts` | `Proposed · Stream with artifacts · Desktop 1024` (`21:150`) — the stream with the real design images embedded in the rows that produced them |
| `02.6 Proposed — stage lane, and notes behind an icon` | `Proposed · Stream with stages · Desktop 1024` (`23:3`) — a stage column, right-aligned meta, and provenance moved into a tooltip |
| `02.7 Proposed — standing state above the timeline` | `Proposed · Change page · Desktop 1024` (`28:3`) — the gate rail and the outcome list above the timeline |
| `02.8 Proposed — the prose comes out` | `Proposed · Change page · Desktop 1024` (`30:3`) — the explanatory paragraphs removed |
| `02.9 Proposed — intent restored, without the byline` | `Proposed · Change page · Desktop 1024` (`31:3`) — current iteration: the anchor returns as a plain intent statement |

Iterations get a **new numbered page** each time, per `rules/figma.mdc` — `02`
stays intact as the record of what the first pass looked like, and is not edited
again. `01 Current state` is the as-is rather than a proposal iteration, so it is
revised in place.

**Two honest gaps in the frames:**

- **MVDS Core is not on the file.** It is not subscribed to any hub Figma file and
  does not appear in `get_libraries`' available-to-add list, so it cannot be
  imported by tooling. The frames are built directly on the hub's own tokens read
  from `app/globals.css` — the same values MVDS is branded with — using Fraunces,
  Inter, and JetBrains Mono standing in for `SF Mono`. Subscribing MVDS Core to
  this file is a founder action in the Figma UI, and until it happens no frame in
  this file can be composed from real design-system components.
- **Mobile 480 is not drawn.** The breakpoint pair belongs at the `design.md`
  gate, not in discovery. Current state and Proposed exist at Desktop 1024 only.

`01 Current state` is a diagram of the problem rather than a reconstructed screen,
because no surface answers this question today — that absence is the as-is.

## The harder shapes the card has to survive

`tell-the-story` is a kind change: one capability, one spec, a clean forward
march. Most of the repo is not that, and the single-spine card breaks in three
places. `02.3` works the hardest real case in the repo —
`pdf-metadata-viewer-cloud` — rather than a hypothetical.

### More than one capability — 12 of 46 changes

Not an edge case. `pdf-metadata-viewer-cloud` and `linked-repos` carry three
capabilities each; `2026-05-21-seed-packet-crud-and-custom-fields` carries four.

**Requirements are the durable unit, not tasks.** They live per capability and
every change has them, so the CAPABILITIES band lists one row per capability with
its requirement count and any per-capability event —
`drive-document-source · 7 requirements · rewritten 08-18, after the spike failed`.

### The gates are not monotonic

Changes go backwards, and the rail as first drawn reported only each artifact's
*first* commit, which hides it entirely:

- **`pdf-metadata-viewer-cloud`, 2026-08-18 — apply → design.** Spike 2.1a was run
  against the live Drive grant and failed: a `drive.file` folder grant reached one
  accessible item (the folder) and zero PDFs, so the import returned
  `success: true, imported: 0` — indistinguishable from an empty folder. Decision
  2.1 was superseded the same day, D9a added 115 lines to `design.md`, and the
  `drive-document-source` spec was rewritten (+55 / −20). Shipped as #389.
- **`tell-the-story`, 2026-07-21 — design → proposal.** Four days after `design.md`
  was approved, the proposal was reopened to retract a false premise: "the hub's
  git history is truncated at 2026-06-21" became "**Not true.**" That retraction
  changed the source model the whole change rests on.

So the rail carries a revision mark — `08-14 ↻ 08-18` — on any gate touched after
a later gate opened, and a **LOOPS** band says what the loop changed and why.
A loop is not failure; it is usually the most informative thing that happened, and
it is currently the least visible.

The repo already writes loops down in prose, with dates: `~~…~~ **Not true.**`,
`**superseded 2026-08-18**`, `**retracted 2026-07-21**`, `**narrowed 2026-07-21**`.
Those markers are machine-findable and carry the *reason*, not just the fact.

### Not every change is shaped like the schema says

Two assumptions the first card made, both false in the general case:

- **`tasks.md` §1 is not always the user outcomes.** The lite schema asks for §1 to
  mirror spec scenarios 1:1. `pdf-metadata-viewer-cloud` instead organises ten
  workstreams (Prove the premise, Data layer, Identity and access, …), so progress
  cannot be split per capability at all. The card reports the honest total — 34
  done · 1 partial · 33 open of 68 — and states why it cannot split it, rather
  than inventing a mapping.
- **Not every change has a quoted anchor.** `pdf-metadata-viewer-cloud` has a
  `## Why` and a link to `experiments/pdf-metadata-viewer/docs/intent.md`, no
  quoted founder line. The card shows what exists and labels the absence.

Both are cases where the card's real job is to say *this is missing* in the same
breath as everything it does have. A card that only renders well-formed changes
would answer "what's going on" for the changes that least need asking.

## Showing instead of telling — the stream

The band card describes a change. `02.4` lets the change describe itself: one row
per thing that happened, an icon gutter with a connecting rail, pull requests
nested under the day they landed, and boxed status at the bottom — the idiom a
pull-request timeline already uses, because the audience already reads it fluently.

It costs less room than the card it replaces (1659px against 1991px) and carries
one thing the card structurally could not:

**The silences.** `tell-the-story` ran hard for five days in July, went quiet for
**31 days**, produced four pull requests on one day in August, and has been quiet
for **4 days and counting**. Not one of those facts was visible on the card — a
gate rail with a date under each dot cannot show absence, and a task count cannot
either. For a question phrased as *what's going on?*, "nothing, for a month" is
frequently the true answer and the one hardest to get any other way.

The events are ordered, not spaced to scale; every gap carries its real duration
as a label instead, so nothing is compressed silently.

Open: the stream and the card are not yet reconciled. The stream answers *what
happened*; the card answers *what is true now* — outcomes, capabilities, evidence
kinds. Whether one absorbs the other, or the page carries both, is undecided.

## Did the gate exist yet, and can the rows carry artifacts?

**No — the gate arrived 43 minutes too late to have applied.** `tell-the-story`'s
spec and design merged in #304 at 2026-07-20 18:26:38Z. The rule that makes a
Figma as-is + proposed pair non-skippable merged in #305 at 19:10:11Z the same
evening. The change's own `design.md` says *"File convention honored: the History
mod is a new numbered iteration page (`02.1`), not frames appended to the approved
`02 Proposed`"* — it followed a convention that was not yet written down, and the
rule was codified out of what it had just done.

That is worth the card knowing how to say. A gate row is not only *passed / not
passed*; sometimes the answer is *this predates the gate*, and treating it as a
failure would be wrong.

**Yes, rows can carry the artifact — from two different sources.**

| Source | Coverage | Cost |
| --- | --- | --- |
| Committed PNG under `openspec/changes/<id>/assets/` | 6 images across 3 of 46 changes | None — it is in the repo |
| The Figma node id `design.md` records | Every change whose `design.md` follows the rule | Needs Figma access at render time |

`02.5` uses both, on the rows that produced them: the approved History preview is
fetched live from `HKy2SdRDyCJ37V29mvMpma` page `02.1`, node `9:82` — read straight
out of the `design.md` table — and the 08-24 row carries
`assets/proposed-history-type-scale.png`, committed with #402.

The node-id path is the one that generalises, since the table is already required
for UI changes. The committed PNG is the one that survives losing Figma access,
which is exactly why `rules/github-workflow.mdc` already asks for PNGs in PR
bodies. A row should prefer the committed file and fall back to the node id.

## Which stage was it in? — the stage lane

The stream told you what happened and lost what the card's rail did well: at any
given row, which gate the change was actually sitting in. "Specs and design
approved" read as a single event and left the obvious question unanswered.

**It is a fair question, and the answer is yes — they were one moment.** #304
committed `design.md` (+48) and `specs/experiment-history/spec.md` (+79) in a
single commit on 2026-07-20. The lite schema treats them as two artifacts, each
with its own stop rule — *"After writing spec(s), stop and wait for explicit user
approval before design"* — but the record holds one moment where the schema
expects two approvals. The card cannot resolve that, and should not pretend to;
it names the stage `SPECS + DESIGN` and says why in the note.

The same collapse was hiding one row lower: "Tasks opened, and the first code
landed" was two stages in one row. Split into `TASKS` and `APPLY`.

So every row now carries its stage in a left-hand column — full strength when the
stage changes, dimmed when it repeats, amber when the stage went backwards
(`↺ PROPOSAL + SPECS`, 07-21, where #314 revised the proposal *and* the spec while
opening tasks). No row leaves you guessing, and the repeats cost nothing to skip.

**Two smaller corrections in the same pass:**

- **Meta right-aligns.** Dates, PR counts and the info icon were sitting directly
  beside each row title and competing with it. They now sit at the right edge, so
  the titles form a clean left column to scan.
- **Verification notes hide behind an icon.** Each row with provenance carries an
  `ⓘ`; `02.6` renders one open so the pattern is visible rather than described.

**What hides and what does not.** The first pass at the tooltip swept a finding
into it along with the plumbing — that the Figma gate merged 43 minutes after the
design it would have governed. That is the most interesting thing on the row, and
putting it one interaction away made the row poorer.

> **Provenance hides. Findings do not.**

`ⓘ` holds *how we know* — node ids, file paths, commit stat lines, which query
produced the number. The row keeps *what we learned* — that two gates shared one
commit, that the rule arrived after the change that inspired it, that a claim and
the code disagree. A card whose findings are all behind icons reads as empty, and
answers "what's going on?" with a shrug.

## Apply is long, and the card should not apologise for it

The stage lane put `APPLY` on eight of twelve rows, which looked at first like a
grouping failure. It is not.

> "apply is a long process, no matter what ai influencers say. You're unblocking,
> rethinking, hunting down api keys, etc. This also happened to be a big effort so
> its more complex than most. so I think running down eight of the rows is
> appropriate."
>
> — Katy, 2026-08-28

**Decided: apply does not subdivide.** Not by capability, not by burst. One long
stage is the honest picture, and a card that compressed it would be lying in the
direction everyone already wants to be lied to in.

This settles two things about the design:

- **The silences stay.** 31 days of nothing is not a gap in the record — it is
  what unblocking, rethinking and key-hunting look like from the outside. A
  presentation that closes that up to save room deletes the evidence.
- **Long is not a warning state.** Nothing about a long apply gets amber. Amber is
  for disagreement between sources, and for gates that went backwards. Duration is
  reported, never judged.

## The page: standing state, then the timeline

The two presentations answered different questions and neither needed to win.
`02.7` puts them in the order the questions get asked:

**Where it stands** — the gate rail and the full outcome list, lifted from `02.2`.
The rail is the one element that answers *where are we* at a glance, which a
chronological stream structurally cannot: you would have to read to the bottom and
infer. The outcome list carries the same weight it earned in `02.1` — all eleven,
each with the kind of evidence behind it.

**What happened** — the timeline from `02.6`, with its stage lane, artifacts,
silences and loops.

One duplicate fell out in the merge: the timeline's closing *"Apply in progress —
25 of 35 tasks · 8 of 11 outcomes"* box now says what the rail and the outcome
table say better, so it is gone. The drift box stays — a disagreement between
sources is a finding, not a status.

The intent band (`JOB` / `DONE WHEN` / `NOT DOING`) is deliberately **not** carried
over. The anchor quote at the top already does that work for this change, and the
page is 3432px as it stands. Worth revisiting if a change turns up whose anchor
does not imply its scope.

## The frame stops explaining itself

Two paragraphs came out of `02.8`:

- The outcomes summary — *"8 of 11 checked — but only 5 are held up by an automated
  test…"*. Eleven checkboxes and a colour-mapped measure column already say it, and
  faster. Prose that restates the table is the table admitting it does not work.
- The page lede, which described the layout instead of letting the layout work.
  Section labels do that job.

Neither would have survived to production, which is reason enough not to draft
with them. **A caption that narrates what the reader can already see is a defect,
not a courtesy** — and it is the failure mode to watch for here, because every band
on this page is tempting to introduce.

The rule the page runs on now: labels name things, marks and colour carry state,
`ⓘ` holds provenance, and sentences are spent only on findings — a loop, a
retraction, a disagreement between sources.

## Intent on the page, anchor in the record

The anchor belongs at the top — the page should say what the change is *for*
before it says where it stands. But rendered as a pull-quote with a byline
(*"Katy · 2026-07-17 · proposal.md"*), it reads as ostentatious: a person quoted at
you, on their own tool, about their own project.

So the page carries the intent as a statement, in the page's own voice, with no
quotation marks and no attribution. The `ⓘ` holds the verbatim line, the file and
the date — provenance, where provenance goes.

**This changes the rendering, not the record.** `proposal.md` keeps its Human
anchor quoted verbatim; the schema requires it, and the whole drift-detection idea
depends on the source staying exact. The page is a reading of that record, not a
replacement for it — which is also why the `ⓘ` has to resolve back to the quoted
line rather than paraphrasing it a second time.

One duplicate went with it: the first timeline row was carrying the same sentence
as a sub-line. The statement says it once, at the top.
