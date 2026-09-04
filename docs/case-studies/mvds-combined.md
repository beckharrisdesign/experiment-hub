# MVDS: a design system that can't drift

> **Combined draft** — the case-study argument carrying its evidence in-line:
> each section closes with a dated source log in the History band's form, and
> where an OpenSpec change record exists, its verbatim material is used
> directly. Built from [mvds.md](mvds.md) and the specimens in
> [mvds-approaches.md](mvds-approaches.md).

## Hook

In thirteen weeks I built and shipped a design system solo — ten components,
a token layer, a public npm package with provenance, and a Figma library that
mirrors the code automatically. But MVDS isn't really a component library. It's an answer
to a split every product team lives with: one library of dev, one library of
Figma, one of features — three artifacts describing the same product, none
guaranteed to match. MVDS unifies them at a different level: the principle.
Principles live in a database, they are machine-enforced where possible, and
an enforced principle can break a build.

## The problem

Every team maintains the same design system three times and calls it one.

On the design side, designers had to make Figmas from scratch each time, or
maintain high-fidelity syncs by hand — and that hand translation had a subtler
cost: they accidentally proposed too much, because redrawing the system meant
re-deciding it. On the engineering side, engineers had to infer a lot from
high-fidelity prototypes, even good ones, and the component library they
maintained didn't necessarily match anything in Figma. Each discipline kept
its own copy of the truth, and the copies drifted — silently, in both
directions.

I've worn both of those hats, plus the founder one. As a solo founder I can't
afford to keep wearing all of them — I need to offload some of those hats into
systems, so I can focus on my main job. MVDS is the evolution of that
thinking: instead of one library for dev, one for Figma, one for features,
define the principles as a unified thing and make everything else a
projection of them.

> **notion (BHD Labs row):** "Solo founders need a minimally viable design
> system — an MVDS — that contains core set of components and design
> principles to put solid foundations into the wet cement of their
> experiments."
>
> Links: [MVDS on the hub](https://bhd-experiment-hub.vercel.app) · [repo](https://github.com/beckharrisdesign/mvds)

## Constraints

- **One person, many hats.** No design-system team, no governance meetings.
  A hat I can't offload into a system is a hat I'm still wearing — so any
  rule that required a human to remember it was already broken.
- **Figma Pro, not Enterprise.** No Enterprise-only API surface; the sync had
  to work within a Pro plan, which is part of why it's one-way and
  re-runnable rather than bidirectional.
- **The designer isn't always in the room.** Historically, designers lacked
  coding skills, so they documented what they wanted in Figma files or text
  documents — and even now that AI can parse and ingest those artifacts, the
  underlying principles are often missed or forgotten as work moves through
  product orgs. Some product orgs now operate with no designer, or even no
  product person. MVDS's daily users include coding agents working in
  experiment repos. Enforcing principles programmatically where possible
  gives an org guardrails even when the designer isn't there.

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
published library instead of hand-mirroring its values, so the place I think
best stays a thinking surface instead of becoming a maintenance burden.

> **Jun 9, 2026 · gh:** component manifests + a drift guard for the
> code→Figma sync land five days into the repo's life ([PR #24](https://github.com/beckharrisdesign/mvds/pull/24));
> every later sync is a recorded commit (#27, #33–35, #52, #61–62, #87).
> The mirror has needed repair passes — [#72](https://github.com/beckharrisdesign/mvds/pull/72)
> after v0.3.0 — but every repair moves it back toward the code; nothing is
> authored in Figma ahead of it.
>
> Links: [drift guard](https://github.com/beckharrisdesign/mvds/pull/24) · [MVDS Core (public mirror)](https://www.figma.com/design/C20nU0mROzk3Zr0I9BELJF/MVDS-Core)

## Decision 2 — Principles are data, and they can break the build

This is the unification move. A principle in MVDS is not a paragraph in a
styleguide — it exists in a database, it is machine-enforced where possible,
and an enforced principle can break a build. Principles are agnostic of the
user and the discipline: the same principle constrains the token layer, the
components, the Figma mirror, and the docs, instead of each discipline
keeping its own paraphrase. And the set isn't limited to rules I invented: I
brought in Nielsen Norman's usability principles — all ten of Nielsen's
heuristics sit in the principles manifest as external records with their
provenance attached. The manifest is honest about what they are: they're not
machine-checkable, "and pretending otherwise would be the failure mode this
manifest exists to avoid" — so instead of faking a lint rule, they feed the
discovery eval rubric — the scored review every new idea passes through —
where judgment gets applied as judgment. Other users
authoring their own principles is the design intent; so far the second
author is Nielsen Norman.

The economics here run the opposite way from what people assume. It's more
expensive NOT to check a rule than to check it — programmatically, or even
manually. From there, it's more expensive to realign to a rule the further
into dev you are than to bake the rule in from the start. And the most
expensive failure sits at the end of that gradient: you've put something out
in the world, it doesn't get the traction you want, and you have no data
points to determine what the root cause is or what to iterate on next. Every
gate the build runs is a data point that failure won't be missing.

And the gates catch things constantly — contrast failures, typography out of
alignment, aggressive tone, the design manifest out of sync with the code
manifest. But the honest measure of the system isn't a dramatic save I can
narrate. It's that most catches are now below my radar: they happen in
subagent logs, get collapsed in the view my LLM surfaces as I work, or run
in CI and get resolved automatically. When something feels out of whack, all
I have to say is "check the principles" and the focus loops back through.
That's the win — I can trust it's happening without having to be conscious
of it. A hat you still have to watch is a hat you're still wearing.

> **Jun 5–8, 2026 · gh:** a token-level WCAG AA contrast gate on day two
> ([#10](https://github.com/beckharrisdesign/mvds/pull/10)); the
> manifest-driven principle-enforcement engine on day five
> ([#17](https://github.com/beckharrisdesign/mvds/pull/17)). By August the
> rules have names that fail CI: `step-on-color-gradations`,
> `step-on-type-ramp`.
>
> **Aug 26–27, 2026 · gh:** the discovery eval gate lands
> ([#98](https://github.com/beckharrisdesign/mvds/pull/98)), runs in full on
> a real change ([#101](https://github.com/beckharrisdesign/mvds/pull/101)),
> and is founder-verified ([#103](https://github.com/beckharrisdesign/mvds/pull/103)).
>
> Links: [enforcement engine](https://github.com/beckharrisdesign/mvds/pull/17) · [eval gate](https://github.com/beckharrisdesign/mvds/pull/98)

## Decision 3 — Minimum viable, enforced honestly

The biggest refusal came first, and it was of my own plan. I didn't want a
thousand components — I started out thinking I would just theme shadcn. But
the shadcn Figma library has 12,000 elements. That's not sustainable — not
for one person, and not for a system whose promise is that every element it
carries is synced, gated, and true. So MVDS adopts shadcn components one at
a time, tunes them, and mirrors only what it adopts.

The same refusal repeats at every scale. When the color system was rebuilt in
August, five authored gradation steps per brand replaced eleven derived ones
— because nothing consumed the eleven. The change record preserved the moment
it turned — my own words, captured verbatim mid design review:

> "so what I'm thinking is that typography size, and perhaps even color
> gradations (1-5) are a design principle to add just like we think of
> spacing. You should be stepping between values on the ramp by default
> because its a systematic way of making the ui feel 'done' or 'organized'
> or 'trustworthy'. … but why are we deriving the ramp at all?"
>
> — design review, 2026-08-21
> ([change record](https://github.com/beckharrisdesign/mvds/blob/main/openspec/changes/archive/2026-08-25-stepped-scales/proposal.md))

The ramp's value was never the formula; it was the discipline of stepping.
The Dropzone component "ends at 'files selected'" — transport and previews
stay app concerns. The component inventory is ten controls, chosen because
that's what a first screen needs with zero custom work.

> **Aug 21–25, 2026 · openspec:** `stepped-scales` went proposal → specs →
> design → tasks → apply in one day (2026-08-21,
> [#81](https://github.com/beckharrisdesign/mvds/pull/81)–[#82](https://github.com/beckharrisdesign/mvds/pull/82)),
> 16 of 16 tasks checked, archived four days later
> ([#92](https://github.com/beckharrisdesign/mvds/pull/92)). The gates
> collapsing to a single day is recorded honestly — that *is* when it
> happened.
>
> Links: [stepped scales](https://github.com/beckharrisdesign/mvds/pull/82) · [v0.4.0](https://github.com/beckharrisdesign/mvds/releases/tag/v0.4.0)

## Decision 4 — Distribution is part of the design

In July, MVDS moved from GitHub Packages to public npm with trusted
publishing and provenance attestation — the registry can prove each release
came from the repo's own CI, and a stranger installs it with no auth and no
config. The landing page became a shareable proof of the system: live
gate statuses (honest ones — they show red when red), a validated install
path, and a public Figma mirror whose share link is itself gated by a live
GET check in CI.

The honest sequence: at first, going public solved an immediate need — the
v0.3.0 migration notes are entirely about deleting auth tokens and `.npmrc`
lines that GitHub Packages required of every consumer. But it has become a
core part of how I work, and I've started sharing it and talking about it.
Being a public npm package means the landing page, the README, and the other
artifacts are already out there — publishing honestly created the public
story, rather than the other way around.

And that's where the sharing conversation keeps landing: MVDS gets at a core
need in design, which is to orchestrate the design process in a way that
allows us to still use our skills — but at different inflection points. The
one-way sync doesn't remove the designer's hand; it moves it to the start of
a spec change, where composition happens, and lets the system carry the
fidelity from there.

> **Jul 15–29, 2026 · gh:** public npm + OIDC trusted publishing
> ([#64](https://github.com/beckharrisdesign/mvds/pull/64)–[#65](https://github.com/beckharrisdesign/mvds/pull/65));
> the hub migrates to consuming MVDS natively the same day (hub commit
> e27e3bd). v0.3.0's `consumer-path` CI job installs the *published* package
> with no auth and no `.npmrc`, deliberately skipping `npm ci` — "or we would
> no longer be reproducing a stranger's machine."
>
> Links: [trusted publishing](https://github.com/beckharrisdesign/mvds/pull/65) · [v0.3.0](https://github.com/beckharrisdesign/mvds/releases/tag/v0.3.0)

## The dogfood loop

The roadmap was set by consumption, not speculation. The experiment hub
imports MVDS in production — the global stylesheet, the Etsy sync panel, the
PDF metadata viewer. An early consumer (bhd-headless-notion) filed feedback
that shaped the docs within the first two weeks. The v0.4.0 release notes
name their own origin: `Input` and `Dropzone` were "the two dogfood walls" —
the controls both August experiments hit on their first screen. When the hub
asked whether to absorb MVDS entirely, the answer was no: the package
boundary — versioned, published, consumer-tested — was worth more than a
simpler toolchain.

> **Jun 18 – Aug 23, 2026 · gh:** consumer feedback addressed in
> [#48](https://github.com/beckharrisdesign/mvds/pull/48); the dogfood walls
> unblocked in [#85](https://github.com/beckharrisdesign/mvds/pull/85); the
> keep-it-alongside ruling in the hub's
> [integration review](../MVDS_INTEGRATION_REVIEW.md) (2026-08-21).

## Outcome

- Three tagged releases (v0.1.0 → v0.4.0 — the 0.2.0 version shipped in the
  changelog but was never tagged) between June 9 and August 23, 2026; 104
  merged PRs by September 2.
- Ten controls, a form-pattern layer, content blocks, and eight spatial/
  layout primitives shadcn deliberately doesn't ship.
- Consumed in production by the experiment hub; installable by anyone via
  `npm install @beckharrisdesign/mvds`.
- A public, view-only Figma library generated from the code. It has needed
  repair passes — the trail records one after v0.3.0 — but every repair moves
  the mirror back toward the code; nothing is ever authored in Figma ahead
  of it.

Those are the countable results. The one I actually started wanting was for
myself: to be able to take off my design hat and my dev hat in order to focus
on the founder hat. That's what the numbers above measure from the outside —
every gate, sync, and published release is a piece of a hat I no longer have
to wear by hand.

But the outcome that occurred to me along the way is bigger than my own
workflow. The three-copies problem MVDS started from — one library of dev,
one of Figma, one of features — was never only a solo-founder problem, which
means what I built may be a shared documentation and delivery system for
teams working on complex existing systems. That's not a result yet; it's the
hypothesis this work has earned the right to test, and the early users I've
recruited are the first step of that test.

## Reflection

The thing I'd change isn't in the codebase. I only recently recruited some
trusted friends to be early users and give feedback — I would do that
earlier. The machine feedback loop was running by day two; the human one is
the newest part of the system.

The record itself carries the same lesson at a different scale. MVDS adopted
OpenSpec — the workflow that records each change's intent, gates, and
verbatim founder reasoning — in week 11 of 13, so its best-documented
decisions are its most recent — the founding decisions, the ones this piece leans hardest on,
survive in memory and the shapes git happens to hold, while `stepped-scales`
preserved its own turning point verbatim. The earlier the record starts, the
less the story depends on what anyone remembers to ask.
