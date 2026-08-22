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
  three weeks.
- **Links:** [commit](https://github.com/beckharrisdesign/experiment-hub/commit/3583cc3) · [PR](https://github.com/beckharrisdesign/experiment-hub/pull/44) · [copy audit](https://github.com/beckharrisdesign/experiment-hub/commit/b4e22bb)

### 3 · The campaign and the signal

**Milestone:** Ran a Facebook campaign that netted roughly 25 email signups
from the landing page alone — real interest, bought at the cost of exhausting
platform hoop-jumping.

- **Katy:** "I did actually run an ad campaign, I just can't find evidence of
  it anymore. It actually netted me something like 25 email signups just with
  the landing page alone."
- **Katy:** "It was a Facebook campaign, and the effort of making all the
  right pages, jumping through the admin hoops, creating the various elements,
  etc was exhausting. Facebook's interfaces were just so frustrating to
  maneuver, and that added extra emotional friction for me as a designer."
- **supabase:** one Best Day Ever submission in the live project — likely a
  test row from the API work. The ~25 signups are not in this database; no
  campaign records survive in the repo.
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

## Staging notes

**Time grain decision (Katy, 2026-08-22): date ranges, not months.** Notion's
`Date` property takes an optional end date; the hub gutter renders the natural
grain — a single day as "Mar 9", a span as "Mar 10–30", a cross-month span as
"Apr–Jun". Ordering sorts on the range's start. Requires a formatter change in
the hub (task 3.11) before these render; dates stay out of the chapters above
and live here:

| Entry | Working range | Basis |
| --- | --- | --- |
| 0 Prologue | Jul 13, 2024 | repo creation dates (both the same day) |
| 1 Launch | Mar 9, 2026 | commits — a single day, now visible as one |
| 2 Traffic-ready | Mar 10–30, 2026 | commits |
| 3 Campaign | Apr 2026 (month-wide) | exact span unknown; bracketed by trail: page ready → reframe |
| 4 Reframe | Apr 20–26, 2026 | commits |
| 5 Practicing | May–Jun 2026 | author's account: friction ran Apr–Jun; starts after the reframe in the log |
| 6 Pause | Jul 2026 | when the pause was named; keeps the quiet stretch visible in the gutter |

## Consistency check (task 1.7 / 4.4)

- Best Day Ever is not dead (notion: Validating, no kill reason); the
  terminal-entry rule is satisfied as long as entry 6 describes a hold, not an
  ending. It does.
- Entries 3 and 4 carry their figure inline ("roughly 25 email signups"),
  satisfying the results rule; the lost evidence trail is acknowledged
  in-entry rather than papered over.
