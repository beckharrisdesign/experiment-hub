# MVDS: a design system that can't drift

> **Draft.** Marks like *[inference]* flag claims the evidence trail suggests
> but Katy hasn't confirmed; *[gap — Katy]* marks what only she can supply.
> Working dates and sources are in the staging table at the end. All of this
> is stripped at publish time.

## Hook

In twelve weeks I built and shipped a design system solo — ten components,
a token layer, four releases on public npm, and a Figma library that mirrors
the code automatically. But MVDS isn't really a component library. It's an
answer to a split every product team lives with: one library of dev, one
library of Figma, one of features — three artifacts describing the same
product, none guaranteed to match. MVDS unifies them at a different level:
the principle. Principles live in a database, they are machine-enforced
where possible, and an enforced principle can break a build.

## The problem

Every team maintains the same design system three times and calls it one.

On the design side, designers had to make Figmas from scratch each time, or
maintain high-fidelity syncs by hand — and that hand translation had a
subtler cost: they accidentally proposed too much, because redrawing the
system meant re-deciding it. On the engineering side, engineers had to infer
a lot from high-fidelity prototypes, even good ones, and the component
library they maintained didn't necessarily match anything in Figma. Each
discipline kept its own copy of the truth, and the copies drifted — silently,
in both directions.

I've worn both of those hats, plus the founder one. As a solo founder I
can't afford to keep wearing all of them — I need to offload some of those
hats into systems, so I can focus on my main job. MVDS is the evolution of
that thinking: instead of one library for dev, one for Figma, one for
features, define the principles as a unified thing and make everything else
a projection of them.

## Constraints

- **One person, many hats.** No design-system team, no governance meetings.
  A hat I can't offload into a system is a hat I'm still wearing — so any
  rule that required a human to remember it was already broken.
- **Figma Pro, not Enterprise.** No Enterprise-only API surface; the sync had
  to work within a Pro plan, which is part of why it's one-way and
  re-runnable rather than bidirectional.
- **Agent collaborators.** The system's daily users include coding agents
  working in experiment repos. A rule that lives in a PDF styleguide is
  invisible to them; a rule that lives in a gate is law. *[inference from
  "agent-first" in the repo description + the machine-enforcement pattern]*

## Decision 1 — Code is the source of truth; Figma is the mirror

The conventional arrow is Figma → code: designers author, engineers
translate, drift accumulates in the gap. I inverted it. One CSS file —
`src/index.css`, the token layer — feeds Tailwind, Storybook, and a Figma
generator. Component manifests plus a drift guard keep the Figma library
honest, and every sync is recorded as a commit.

The trade-off turned out to be a repositioning, not a loss. It doesn't keep
me from using Figma — it just keeps me using Figma at the start of a spec
change. Figma is where a change begins: exploration, composition, the
thinking. What it stopped being is the system of record I maintain by hand
afterward. The library mirror is generated; the explorations bind to that
published library instead of hand-mirroring its values, so the place I
think best stays a thinking surface instead of becoming a maintenance
burden.

## Decision 2 — Principles are data, and they can break the build

This is the unification move. A principle in MVDS is not a paragraph in a
styleguide — it exists in a database, it is machine-enforced where possible,
and an enforced principle can break a build. Principles are agnostic of the user and the
discipline: the same principle constrains the token layer, the components,
the Figma mirror, and the docs, instead of each discipline keeping its own
paraphrase. And the set isn't limited to rules I invented: I brought in
Nielsen Norman's usability principles — all ten of Nielsen's heuristics sit
in the principles manifest as external records with their provenance
attached. The manifest is honest about what they are: they're not
machine-checkable, "and pretending otherwise would be the failure mode this
manifest exists to avoid" — so instead of faking a lint rule, they feed the
discovery eval rubric, where judgment gets applied as judgment. Other users
authoring their own principles is the design intent; so far the second
author is Nielsen Norman.

The repo's history shows how early this hardened: by day two there were
house rules and a token-level WCAG AA contrast gate; by day five, a
manifest-driven principle-enforcement engine. Rules in MVDS are named,
machine-checked things — `step-on-color-gradations`, `step-on-type-ramp` —
that fail CI, not paragraphs that fail readers.

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

The biggest refusal came first, and it was of my own plan. I didn't want a
thousand components — I started out thinking I would just theme shadcn. But
the shadcn Figma library has 12,000 elements. That's not sustainable — not
for one person, and not for a system whose promise is that every element it
carries is synced, gated, and true. So MVDS adopts shadcn components one at
a time, tunes them, and mirrors only what it adopts.

The same refusal repeats at every scale. When the color system was rebuilt
in August, five authored gradation steps per brand replaced eleven derived
ones — because nothing consumed the eleven. The Dropzone component "ends at
'files selected'" — transport and previews stay app concerns. The component
inventory is ten controls, chosen because that's what a first screen needs
with zero custom work.

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

Those are the countable results. The one I actually started wanting was for
myself: to be able to take off my design hat and my dev hat in order to
focus on the founder hat. That's what the numbers above measure from the
outside — every gate, sync, and published release is a piece of a hat I no
longer have to wear by hand.

But the outcome that occurred to me along the way is bigger than my own
workflow: MVDS is a system for teams to have a shared documentation and
delivery system for complex existing systems. The three-copies problem it
started from — one library of dev, one of Figma, one of features — was
never only a solo-founder problem.

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
