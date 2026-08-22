# Best Day Ever — exemplar history draft (task 2.3)

> Draft 2026-08-22. Nothing written to Notion yet. Each chapter is one
> **Milestone** sentence (what renders on the hub), followed by its sources,
> each in its own voice: **gh** (the commit and PR trail), **supabase** (the
> hub's submissions data), **notion** (the experiment row), **Katy** (verbatim).
> The first link on a Links line becomes the Notion `Receipt URL`. Supersedes
> the 2026-07-21 account in [tasks.md](tasks.md) §2.3 — the ad campaign did run.
>
> **Process artifacts:** Best Day Ever predates the OpenSpec workflow, so no
> `openspec/changes/` folder exists for it; its process artifacts are the PRD
> and campaign docs, linked commit-pinned below. Later experiments would link
> their change folder the same way.

## Proposed entries

### 0 · Prologue — two earlier prototypes

**Milestone:** The idea was already two prototypes old: calendar-printer had
wired Google Calendar OAuth to a printable calendar view, and
calendar-to-planner had sketched the calendar-to-PDF pipeline — both built in
a single July weekend, years before the hub existed.

- **gh:** both repos created 2024-07-13. calendar-printer grew through OAuth,
  Calendar API, and a printable view into a Supabase integration;
  calendar-to-planner is a small server with `googleCalendar.js` and
  `pdfGenerator.js`.
- **Links:** [calendar-printer](https://github.com/beckharrisdesign/calendar-printer) · [calendar-to-planner](https://github.com/beckharrisdesign/calendar-to-planner)

### 1 · Launch

**Milestone:** Went from idea to a deployed landing page in one day — a
calendar-to-paper day planner for ADHD users — timed to a moment when AI tools
were improving fast, to see how real a one-day page could be.

- **gh:** PRD, landing copy, ad-campaign content, and a deployed landing with
  CI/CD, all in a single day.
- **Katy:** "The evolution of AI is important context for this experiment. The
  tools were getting much better, the concepts of skills and tasks were just
  firming up, and I wanted to see how real a landing page could be."
- **Links:** [commit](https://github.com/beckharrisdesign/experiment-hub/commit/a1289f0) · [PRD](https://github.com/beckharrisdesign/experiment-hub/blob/e50bea1/experiments/best-day-ever/docs/PRD.md) · [ad campaign](https://github.com/beckharrisdesign/experiment-hub/blob/6284e05/experiments/best-day-ever/docs/ad-campaign-content.md)

### 2 · Getting ready for real traffic

**Milestone:** Treated the page like real visitors were coming: every sentence
audited against Voice & Tone, broken images fixed, the signup API put under
test.

- **gh:** copy audit, inline-SVG image fixes, landing-submission API tests,
  welcome-email reference removed — a steady polish pass over the following
  three weeks. Real visitors did come (chapter 3), whatever brought them.
- **Links:** [commit](https://github.com/beckharrisdesign/experiment-hub/commit/3583cc3) · [PR](https://github.com/beckharrisdesign/experiment-hub/pull/44) · [copy audit](https://github.com/beckharrisdesign/experiment-hub/commit/b4e22bb)

### 3 · The campaign and the signal

**Milestone:** Ran the phase-1 landing for a week: roughly 25 email signups —
real interest, plainly counted.

- **Katy** (2026-07-22 record): "Ran the phase-1 landing for a week" — the
  account closest to the events; it put the figure at ~35.
- **Katy** (2026-08-22): "It actually netted me something like 25 email
  signups just with the landing page alone." Ruling, same day: "its 25
  signups."
- **Katy** (2026-08-22, unresolved): "I did actually run an ad campaign, I
  just can't find evidence of it anymore. … It was a Facebook campaign, and
  the effort of making all the right pages, jumping through the admin hoops,
  creating the various elements, etc was exhausting." The July record says the
  campaign was drafted but not run. Asked to pick: "I don't know." The
  milestone therefore claims neither — both accounts agree the signups came
  through the landing page.
- **supabase:** one Best Day Ever submission in the live project — likely a
  test row from the API work. The signups are not in this database; no
  campaign or analytics records survive in the repo.
- **Links:** none surviving — "roughly" because the figure is from the
  author's account, not a record.

### 4 · The reframe

**Milestone:** Realized the tests were overengineered — roughly 25 signups was
a real signal, not a foundation for an entire product — so pricing came out of
the PRD and validation narrowed to the demand question.

- **gh:** the reframe began with taking stock — on one evening two-and-a-half
  weeks earlier, CLAUDE.md documentation was added across the prototype estate
  (calendar-printer, calendar-to-planner, pdf-metadata-viewer,
  envelope-maker) and calendar-to-planner was
  [flagged abandoned](https://github.com/beckharrisdesign/calendar-to-planner/commit/4ec1723f). Then:
  pricing removed from the PRD ("focus validation on demand signal"),
  prior-prototype learnings folded into a new PRD section the same day,
  business case and Overview revised.
- **Katy:** "I started to realize I was overengineering my tests — I didn't
  want to build the entire product on the strength of 25 emails. I needed to
  think smaller, and more modularly."
- **Links:** [commit](https://github.com/beckharrisdesign/experiment-hub/commit/4c8c683) · [PR](https://github.com/beckharrisdesign/experiment-hub/pull/103) · [PRD after](https://github.com/beckharrisdesign/experiment-hub/blob/4c8c683/experiments/best-day-ever/docs/PRD.md)

### 5 · Practicing the product, holding the line

**Milestone:** Practiced generating PDFs and other printable artifacts — the
product's actual output — but the round trip kept lengthening: large PDFs in a
Drive-synced directory bogged down the sync, then the laptop, and the email
list couldn't be used without an email provider or more product to announce.

- **Katy:** "I could only really leverage my email list if I started writing
  emails which required an email provider, or if I built enough of the product
  to announce it. I practiced generating pdfs and other printable artifacts,
  but knew that I would get sucked into that too. I didn't have my tooling
  quite up to snuff yet and that round trip was getting longer."
- **Katy:** "I ran into friction with my codebase around April and June too. I
  was developing in a synced directory with Google Drive, and generating large
  pdfs was starting to bog up the syncs and then my laptop."
- **gh:** the practiced PDFs themselves left no trace, but the era did:
  envelope-maker (cut-file printables) got a
  [dev-environment setup](https://github.com/beckharrisdesign/envelope-maker) in
  late April, and the Drive-synced code directory still holds an
  `envelope-maker/node_modules-gdrive/` folder — thousands of dependency files
  fed through the sync, the bog-down made physical.
- **Links:** none for the practice itself

### 6 · The pause

**Milestone:** Paused on noticing where the energy went — perfecting the
artifact instead of the bigger picture; the experiment holds while the
practice shifts to smaller, more rapid tests.

- **Katy:** "Realized how much I was getting sucked into perfecting the
  artifact instead of thinking about the bigger picture. Decided to pause to
  practice with smaller, more rapid tests."
- **gh:** no experiment-specific commits after the reframe; every later touch
  is hub-wide infrastructure.
- **notion:** `Status` = Validating; no `Outcome` kill reason.
- **Links:** none — the pause lives in no commit.

## Reconciliation plan (drafted 2026-08-22; supersedes the fresh-staging plan)

Discovery: Best Day Ever already has **14 approved entries** live in the
History database, authored ~2026-07-22 — six shaped entries, two raw generator
drafts approved as-is, and seven per-PR entries (including one mislabeled
"experiment-hub · PR #33" related to Best Day Ever). Formatter for ranges
shipped in PR #399. Facts ruled by Katy 2026-08-22: signups = 25; the pause is
dated July; the campaign question is unresolved and the narrative claims
neither account.

Proposed writes, pending one approval (nothing executed yet):

| # | Action | Live row | Change |
| --- | --- | --- | --- |
| 1 | Insert | — | Chapter 0 Prologue, date 2024-07-13 (single day) |
| 2 | Edit | "Launched in one day…" (Mar 9) | Replace text with chapter 1 (adds the AI-tooling why); end date = start |
| 3 | Edit | "Hardened for real traffic…" (Mar 23) | Replace text with chapter 2; range Mar 23–30 |
| 4 | Edit | "Ran the phase-1 landing… ~35" (Mar 16) | Number → "roughly 25"; range Mar 16–23 ("a week"); Source notes the ~35→25 correction |
| 5 | Edit | "Reframed the validation approach…" (Apr 20) | Replace text with chapter 4 merged with the July reason ("lukewarm results on another test" + overengineered tests); range Apr 20–26 |
| 6 | Insert | — | Chapter 5 Practicing, range May–Jun 2026 |
| 7 | Edit | "Stalled in validating…" (Apr 26) | Replace with chapter 6 pause (no "stalled", no campaign claim); date → Jul 2026 |
| 8 | Unapprove | "Pushed 7 commits and 1 PR (#44)." (Mar 1) | Raw generator draft, redundant with shaped chapters |
| 9 | Unapprove | "Pushed 3 commits and 1 PR (#103)." (Apr 1) | Same |
| 10 | Unapprove | 7 per-PR rows (#30–33, #44, #45, #103) | Granular duplicates of chapters 2–4; rows kept, just not rendered — reversible by rechecking Approved |

Nothing is deleted; unapproved rows stay in the database. Approving the plan
executes rows 1–10; every edit's Source property records "revised 2026-08-22,
session reconciliation".

**Executed 2026-08-22; verified live.** Follow-up the same day (Katy's call
after seeing the render): each chapter's full source log — the gh/supabase/
notion/Katy voices and all links — was written into its Notion entry's page
body, so the entry carries the whole chapter even though the hub renders only
the milestone sentence and receipt link. Rendering sources on the hub itself
is a possible future design pass, gated on Figma.

## Consistency check (task 1.7 / 4.4)

- Best Day Ever is not dead (notion: Validating, no kill reason); the
  terminal-entry rule is satisfied as long as entry 6 describes a hold, not an
  ending. It does.
- Entries 3 and 4 carry their figure inline ("roughly 25 email signups"),
  satisfying the results rule; the lost evidence trail is acknowledged
  in-entry rather than papered over.
