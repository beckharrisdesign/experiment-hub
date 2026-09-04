# Approved copy — design gate record, 2026-09-04

Snapshot of Figma page `02.4` (file e3DpnGzFqQVZfwHzpt6Huu) at Katy's
design-gate approval, her copy edits included ("toool" typo corrected with
her go-ahead implied by the approval; nothing else touched). This is the
source text for the Notion population in tasks §3. The Figma page remains
the live draft; if they diverge, Figma wins and this snapshot marks what
was approved.

## Title

MVDS: an opinionated design system that doesn't drift

## TLDR (property + page lede)

Design systems are component rich and opinion scarce.

## Callout bar

- **CHALLENGE** — Every team maintains the same design system three times
  and calls it one.
- **APPROACH** — Code as the source of truth / Principles as blocking
  tests / Distribution by design
- **OUTCOME** — Three tagged releases and 104 merged PRs in thirteen weeks
  / Consumed in production as a standalone tool

## Challenge

Every team maintains the same design system three times and calls it one.

As a solo founder I can't afford to keep wearing all of the hats — I need
to offload some of those hats into systems, so I can focus on my main job.
MVDS is the evolution of that thinking: instead of one library for dev,
one for Figma, one for features, define the principles as a unified thing
and make everything else a projection of them.

*(+ slot-2 diagram brief placeholder — Katy's three-copies diagram)*

## Approach

### Code as the source of truth

One CSS file — the token layer — feeds Tailwind, Storybook, and a Figma
generator. Component manifests plus a drift guard keep the Figma library
honest, and every sync is recorded as a commit.

*(image: MVDS Core mirror — "generated from code, repaired only toward
it. Public, view-only.")*

### Principles as blocking tests

The hypothesis, as I first wrote it down: principles should be able to
fail a build.

A principle in MVDS is not a paragraph in a styleguide — it exists in a
manifest, machine-enforced where possible.

*(image: Verified, not asserted — "live gate statuses; the results shown
are the actual output for the built commit.")*

*(image: gradations — "Five authored steps per brand, roles as contract,
every pairing enforced by check:contrast.")*

### Distribution is part of the design

In July, MVDS moved from GitHub Packages to public npm with trusted
publishing and provenance attestation — the registry can prove each
release came from the repo's own CI, and a stranger installs it with no
auth and no config. It's environment agnostic: pull the npm package into
your build from Claude, Cursor, Figma, etc.

At first, going public solved an immediate need. But it has become a core
part of how I work. MVDS gets at a core need in design — orchestrating
the process so we still use our skills, just at different inflection
points.

*(image: install path — "The install path, and a CI job that reproduces a
stranger's machine on every release.")*

## Closing

The system also runs its own process on itself: OpenSpec changes with an
eval gate, using schema and skills to do heuristics in flight, even self
referentially. Above: a production hub surface composed from MVDS Button,
Container, and Stack.

*(image: hub surface above this caption)*

## Notion property mapping

| Property | Value |
| --- | --- |
| TLDR | Design systems are component rich and opinion scarce. |
| Challenge | Every team maintains the same design system three times and calls it one. |
| Approach | Code as the source of truth / Principles as blocking tests / Distribution by design |
| Outcome | Three tagged releases and 104 merged PRs in thirteen weeks. Consumed in production as a standalone tool. |

## Superseded during the gate (recorded, not lost)

- Title "…can't drift silently" → her tagline form (above).
- "Decision N —" numbering → plain heads; "Principles are data…" →
  "Principles as blocking tests"; "database" → "manifest".
- Constraints, Minimum-viable, Outcome, and Reflection body sections cut;
  the callout bar carries Challenge/Approach/Outcome at the top instead.
- The panel-era long bodies (economics gradient, Nielsen passage,
  terracotta catch, teams hypothesis paragraph) are out of the portfolio
  render per her cuts — they remain available in the frozen drafts if any
  ever returns.
