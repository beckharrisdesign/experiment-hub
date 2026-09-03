# MVDS: a design system that can't drift

> **Draft.** Marks like *[inference]* flag claims the evidence trail suggests
> but Katy hasn't confirmed; *[gap — Katy]* marks what only she can supply.
> Working dates and sources are in the staging table at the end. All of this
> is stripped at publish time.

## Hook

In twelve weeks I built and shipped a design system solo — ten components,
a token layer, four releases on public npm, and a Figma library that mirrors
the code automatically. The unusual part isn't the speed. It's the direction:
in MVDS, code is the single source of truth and Figma is the mirror — a
one-way, code → Figma sync. I'm a product designer. I built the arrow
pointing the way most designers would call backwards, because I was designing
for a team where most of the hands on the code aren't human. *[inference —
"agent-first" framing is from the repo description; the personal reasoning
behind it is a gap]*

## The problem

*[gap — Katy: what was breaking before MVDS? What did starting a new
experiment look like in May 2026, and what specifically hurt?]*

*[inference, from the README's own words: every new experiment started from
scratch, and systems that start with strong principles lose them — drift is
the enemy the whole repo is organized against. The word "drift" appears in
the repo description, the enforcement docs, and the CI job names.]*

## Constraints

- **One person.** No design-system team, no governance meetings — anything
  that required a human to remember a rule was already broken. *[inference]*
- **Figma Pro, not Enterprise.** No Enterprise-only API surface; the sync had
  to work within a Pro plan, which is part of why it's one-way and
  re-runnable rather than bidirectional.
- **Agent collaborators.** The system's daily users are coding agents working
  in experiment repos. A rule that lives in a PDF styleguide is invisible to
  them; a rule that lives in a lint gate is law. *[inference from
  "agent-first" + the machine-enforcement pattern]*

## Decision 1 — Code is the source of truth; Figma is the mirror

The conventional arrow is Figma → code: designers author, engineers
translate, drift accumulates in the gap. I inverted it. One CSS file —
`src/index.css`, the token layer — feeds Tailwind, Storybook, and a Figma
generator. Component manifests plus a drift guard keep the Figma library
honest, and every sync is recorded as a commit.

The trade-off: Figma stops being an authoring surface for the system itself
and becomes a published artifact of it. For a designer that's a real loss —
you give up the place you think best. *[gap — Katy: did that trade hurt in
practice? Where do you actually do the design thinking now?]*

## Decision 2 — Enforce principles, don't document them

By day two the repo had house rules and a token-level WCAG AA contrast gate;
by day five, a manifest-driven principle-enforcement engine. Rules in MVDS
are named, machine-checked things — `step-on-color-gradations`,
`step-on-type-ramp` — that fail CI, not paragraphs that fail readers.

The most telling check is `consumer-path`: CI installs the *published*
package into a starter app with no auth and no `.npmrc`, deliberately
skipping `npm ci` — "or we would no longer be reproducing a stranger's
machine" — and asserts the emitted CSS proves the token layer landed. The
system doesn't claim it works for strangers; it proves it on every release.

The trade-off: authoring a rule costs 10× writing a guideline, so the rule
set stays small — and things the gates don't cover have no protection at
all. *[inference — trade-off is mine; needs her confirmation or her own
version]*

## Decision 3 — Minimum viable, enforced honestly

MVDS says no more often than yes. When the color system was rebuilt in
August, five authored gradation steps per brand replaced eleven derived
ones — because nothing consumed the eleven. The Dropzone component "ends at
'files selected'" — transport and previews stay app concerns. The component
inventory is ten controls, chosen because that's what a first screen needs
with zero custom work.

*[gap — Katy: was there a component or feature you wanted and refused
yourself? The "no" with the best story belongs here.]*

## Decision 4 — Distribution is part of the design

In July, MVDS moved from GitHub Packages to public npm with OIDC trusted
publishing and provenance attestation — a stranger installs it with no auth
and no config. The landing page became "a shareable proof of the system":
live gate statuses (honest ones — they show red when red), a validated
install path, and a public Figma mirror whose share link is itself gated by
a live GET check in CI.

*[inference: this was the moment MVDS stopped being an internal tool and
became a portfolio-grade public artifact — gap: was that the intent, or did
public npm solve a practical problem first?]*

## The dogfood loop

The roadmap was set by consumption, not speculation. The experiment hub
imports MVDS in production — the global stylesheet, the Etsy sync panel,
the PDF metadata viewer. An early consumer (bhd-headless-notion) filed
feedback that shaped the docs within the first two weeks. The v0.4.0
release notes name their own origin: `Input` and `Dropzone` were "the two
dogfood walls" — the controls both August experiments hit on their first
screen. When the hub asked whether to absorb MVDS entirely, the answer was
no: the package boundary — versioned, published, consumer-tested — was
worth more than a simpler toolchain.

## Outcome

- Four releases (v0.1.0 → v0.4.0) between June 9 and August 23, 2026;
  107 merged PRs by September 2.
- Ten controls, a form-pattern layer, content blocks, and eight spatial/
  layout primitives shadcn deliberately doesn't ship.
- Consumed in production by the experiment hub; installable by anyone via
  `npm install @beckharrisdesign/mvds`.
- A public, view-only Figma library that has never been hand-edited ahead
  of its code. *[inference — verify: has the Figma mirror ever drifted or
  been patched manually? PR #72 "repair Label/Textarea/Blockquote after
  v0.3.0" suggests at least one repair pass.]*

*[gap — Katy: what's the result you actually care about? Time-to-first-
screen on a new experiment? Something you can feel rather than count?]*

## Reflection

*[gap — Katy: what would you do differently? The trail can't answer this
one at all.]*

---

## Staging table (working dates + sources — stripped at publish)

| Date | Event | Source |
| --- | --- | --- |
| 2026-06-04 | Repo created; Chromatic + house rules land day one | repo metadata, PRs #5–6 |
| 2026-06-05 | Token AA gate, color util, sync skill (#10) | PR list |
| 2026-06-08 | Principle-enforcement engine (#17) | PR list |
| 2026-06-09 | v0.1.0; component manifests + Figma drift guard (#24) | releases, PR list |
| 2026-06-12 | Form-controls family, elevation + motion tokens (#37–42) | PR list |
| 2026-06-18 | GitHub Packages publish (#45); bhd-headless-notion consumer feedback (#48) | PR list |
| 2026-06-19 | v0.2.0 — content blocks (#50) | PR list, CHANGELOG |
| 2026-06-30 | Chrome / Section / Layer spatial primitives (#55) | PR list |
| 2026-07-15 | Public npm + OIDC trusted publishing (#64–65); hub migrates to native MVDS consumption same day | PR list, hub commit e27e3bd |
| 2026-07-29 | v0.3.0 — spatial layout, public npm, shareable landing; Figma share gated by live GET (#68) | releases, CHANGELOG |
| 2026-08-21 | MVDS ↔ hub integration review: keep the package boundary | hub docs/MVDS_INTEGRATION_REVIEW.md |
| 2026-08-21–23 | v0.4.0 — stepped gradations, scoped brands, themeable type, Input + Dropzone (#82–88) | releases, CHANGELOG |
| 2026-08-25–09-02 | OpenSpec + eval gate adopted in-repo; site voice refresh (#98–107) | PR list |

Numbers used in prose: 12 weeks (Jun 4 – Aug 23 tag; 13 to last PR),
107 merged PRs, 10 controls, 4 releases, 5-vs-11 gradation steps
(CHANGELOG 0.4.0), 8 layout primitives (README Foundations list).
