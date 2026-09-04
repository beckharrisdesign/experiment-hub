# Telling the mvds story three ways

Three approaches to the same body of work, each tried against real mvds data so
they can be compared on evidence rather than in the abstract:

- **A. Case study** — [docs/case-studies/mvds.md](mvds.md), written 2026-09-04
  via the trail-mine + interview method. Kept as-is.
- **B. History band** — the dated, voice-attributed chapter form the hub renders
  for experiments (the Best Day Ever exemplar). A specimen draft is below.
- **C. OpenSpec change frame** — the openspec-change-visualizer approach
  (`/changes/<id>` on the hub): one frame per change, assembled from artifacts
  and git, nothing hand-maintained. A hand-assembled specimen is below.

---

## A. What the case study netted

The case study got the things no artifact holds: the origin problem (three
libraries — dev, Figma, features — each keeping its own copy of the truth), the
solo-founder hats, the 12,000-element refusal of the theme-shadcn plan, the
enforcement cost gradient, and the inflection-points thesis. Seven interview
answers reshaped its spine. Its cost: seven interview turns, and every claim
needed hand-verification against the trail.

Its blind spot showed up while building specimen C. The case study's Decision 3
says five authored gradation steps replaced eleven derived ones "because nothing
consumed the eleven" — true, sourced from the CHANGELOG. But the change record
for `stepped-scales` holds the actual moment, verbatim, in its Human anchor:
the founder asking, mid design review, **"but why are we deriving the ramp at
all?"** The best quote in that part of the story was sitting in a change folder,
and the interview never surfaced it because the interviewer didn't know to ask.
A case study is bounded by what its author thinks to dig up.

## B. History band — what exists, and a specimen curation pass

**Correction (2026-09-04):** an earlier version of this document claimed mvds
had no experiment row in the hub. Wrong — the claim was checked against the
repo-local sources (`data/experiments.json`, `experiments/`), but mvds is a
remote repo, and remote-repo experiments live in Notion. The MVDS row is in
the BHD Labs Database (Status: Validating, Public, PI 4 / SI 2 / BI 2), and it
already has a live History band: **67 approved entries**, one per PR,
generator-drafted in a single run on 2026-07-23. Each carries a milestone
sentence, a PR receipt, and a real event date — and a blank body, no voices,
no why.

That existing band is its own data point about this approach. It proves the
generator half (coverage at near-zero cost: 67 entries nobody hand-wrote) and
the staleness half simultaneously: the band froze the day it was drafted.
Nothing after 2026-07-23 exists in it — no v0.3.0, no v0.4.0, no OpenSpec era
— because a drafting run is a snapshot, not a subscription.

*The specimen below is therefore not a first band but a curation pass over an
existing one: chapter-grain entries in the Best Day Ever exemplar form
(milestone carrying the why, voice-attributed sources, links) that would sit
alongside or supersede runs of PR-grain entries. Staging anything to Notion is
a separate, explicitly-OK'd step.*

**Jun 4–9, 2026** — Went from empty repo to a tagged v0.1.0 in five days, with
the enforcement posture already set: a WCAG AA contrast gate on day two, a
manifest-driven principle-enforcement engine on day five.

> **gh:** repo created 2026-06-04; house rules and Chromatic land the same week;
> the AA token gate is PR #10, the enforcement engine #17, the v0.1.0 tag #21 —
> all inside the first six days.
>
> **Katy (2026-09-04):** "Designers had to make figmas from scratch each time,
> or maintain high fidelity syncs by hand… Engineers had to infer a lot from
> hf prototypes, even good ones, and the component library they maintained
> didn't necessarily match anything in figma."
>
> Links: [v0.1.0](https://github.com/beckharrisdesign/mvds/releases/tag/v0.1.0) · [enforcement engine](https://github.com/beckharrisdesign/mvds/pull/17)

**Jun 12–19, 2026** — Filled out the control families and shipped the first
installable package; the first outside consumer's feedback landed within days.

> **gh:** form controls, elevation + motion tokens, and Select in one three-day
> burst (#37–42); GitHub Packages publish #45; bhd-headless-notion consumer
> feedback addressed in #48; v0.2.0 content blocks #50.
>
> Links: [publish](https://github.com/beckharrisdesign/mvds/pull/45) · [consumer feedback](https://github.com/beckharrisdesign/mvds/pull/48)

**Jun 30 – Jul 29, 2026** — Spatial layout became vocabulary (Chrome, Section,
Layer), the package went public — npm with OIDC trusted publishing, no auth, no
`.npmrc` — and v0.3.0 made the landing page a shareable proof of the system.

> **gh:** spatial primitives #55; public npm + trusted publishing #64–65 on
> 2026-07-15 — the same day the hub migrated to consuming MVDS natively
> (hub commit e27e3bd); v0.3.0 tagged 07-29 with the Figma share link gated by
> a live GET check (#68).
>
> **Katy (2026-09-04):** "at first it solved an immediate need — but it has
> become a core part of how I work these days, and I've started sharing it and
> talking about it."
>
> Links: [v0.3.0](https://github.com/beckharrisdesign/mvds/releases/tag/v0.3.0) · [trusted publishing](https://github.com/beckharrisdesign/mvds/pull/65)

**Aug 21–23, 2026** — v0.4.0 rebuilt color as five authored gradation steps per
brand, added scoped brands and themeable typography, and shipped Input and
Dropzone — the two controls both August dogfoods hit walls on.

> **gh:** the whole theming trio proposed in #81 and landed in #82–84 across
> three days; #85 names Input/Dropzone "the two dogfood walls, unblocked";
> Figma token sync #87 follows the release.
>
> **Katy (2026-08-21, from the change record):** "so what I'm thinking is that
> typography size, and perhaps even color gradations (1-5) are a design
> principle to add just like we think of spacing… but why are we deriving the
> ramp at all?"
>
> Links: [v0.4.0](https://github.com/beckharrisdesign/mvds/releases/tag/v0.4.0) · [stepped scales](https://github.com/beckharrisdesign/mvds/pull/82)

**Aug 25 – Sep 2, 2026** — The process itself became part of the system:
OpenSpec changes with a discovery eval gate ran in-repo, Nielsen Norman's ten
usability heuristics joined the principles manifest as external records, and the
site rebuilt its language around six peer elements.

> **gh:** eval gate #98, first full run #101, founder-verified walkthrough #103;
> site voice #105–106.
>
> **Katy (2026-09-04):** "I brought in Neilson Norman's Usability Principles."
>
> Links: [eval gate](https://github.com/beckharrisdesign/mvds/pull/98) · [site voice](https://github.com/beckharrisdesign/mvds/pull/106)

## C. Change frame — specimen, hand-assembled

*The hub's visualizer reads its own local `openspec/` and git; it cannot point
at mvds today. This frame is assembled by hand from GitHub data, in the format
`/changes/<id>` renders — what cross-repo support would produce automatically.*

```
stepped-scales (mvds)                                  ARCHIVED · 4 days

  so what I'm thinking is that typography size, and perhaps even color
  gradations (1-5) are a design principle to add just like we think of
  spacing. You should be stepping between values on the ramp by default …
  but why are we deriving the ramp at all?
                    — founder, scoped-theming design review, 2026-08-21

  GATES   ● proposal ── ● specs ── ● design ── ● tasks ── ● apply ── ● archive
            08-21 (#81)   08-21      08-21       08-21     08-21 (#82)  08-25 (#92)

  TASKS   16 of 16 checked

  NOTE    proposal, specs, design, tasks and apply share one day — the
          gates collapsed to 2026-08-21. Honest: that is when it was
          recorded, not papered over.

  CODE    1 PR (#82) · merged 08-21 · archived with three siblings in #92
```

## What the visualizer approach nets on mvds — and what it can't

**Nets:**

- **The decision moments, verbatim, at zero marginal cost.** Every mvds change
  carries a Human anchor — the founder's actual words at the actual moment.
  Specimen C's anchor is better raw material than anything the case-study
  interview produced about the same event, and nobody had to remember to
  write it down for the story's sake; the process required it.
- **Always current, never stale.** Frames are assembled on read from artifacts
  and git. The case study was stale the day after it was written; a History
  band waits for someone to draft the next chapter.
- **Honesty as mechanism, not discipline.** Drift detection (a checked box the
  code contradicts), evidence kinds per outcome, silences with real durations —
  the frame's honesty is computed, where A and B depend on the author behaving.

**Can't:**

- **Coverage stops where the process starts.** mvds has 10 OpenSpec changes,
  all from 2026-08-21 onward — the last 2 of its 13 weeks. Everything the case
  study's first three decisions cover (the founding refusal, the sync, public
  npm) predates the record: 75 of 107 PRs are invisible to this approach.
- **No arc.** Change-grain answers "what's going on with this change" for the
  person mid-flight. It cannot say why MVDS exists, what it refused, or what it
  became — the questions A exists to answer and B gestures at.

## Compare and contrast

| | A. Case study | B. History band | C. Change frame |
| --- | --- | --- | --- |
| Grain | The whole effort | Milestones (PR-grain generated, chapter-grain curated) | One change |
| Audience | Outside readers (portfolio) | Outside readers (hub) | The builder, mid-flight |
| Human input | High — interview reshaped the spine 7 times | Generated: none. Curated: mine + interview per chapter | None after the process exists |
| Freshness | Stale on publish | As fresh as the last drafting run — mvds's froze 2026-07-23 | Assembled on read; never stale |
| Honesty mechanism | Inference marks + interview | Voice attribution + numbers inline (curated); receipts only (generated) | Computed: drift, evidence kinds, silences |
| Coverage on mvds | All 13 weeks | Live: Jun 4 – Jul 23, 67 entries. Specimen chapters: all 13 weeks | Last 2 weeks (10 changes) |
| Best at | Judgment and trade-offs | Trajectory and shape | Decision moments + "what's true now" |
| Blind spot | What the interviewer doesn't ask | No argument; a band without voices reads as a changelog | Everything before OpenSpec; no narrative |

## The finding

The three approaches compose into a pipeline rather than compete. Change frames
preserve verbatim decision moments as a side effect of working; History chapters
quote those moments and give them dates and shape; the case study argues from
both. `stepped-scales` proves each link: its Human anchor is the best quote in
the mvds story, it slots directly into the History specimen's fourth chapter,
and it strengthens the case study's Decision 3 — an interview alone missed it.

The corollary is uncomfortable and useful: narrative quality is decided months
before anyone writes narrative, by whether the process was recording. mvds
adopted OpenSpec in week 11, so its best-documented decisions are its most
recent — the founding decisions, the ones the case study leans hardest on,
survive only in Katy's memory and the shapes git happens to hold. The earlier
the record starts, the less the eventual story depends on what an interviewer
thinks to ask.

mvds's live band adds the middle stage's own lesson: the generator ran once
and produced 67 receipts — real coverage, honestly dated — but coverage
without voice reads as a changelog, and a snapshot without re-runs goes quiet
exactly when the project doesn't. The band's two most story-rich months are
the two it doesn't have.
