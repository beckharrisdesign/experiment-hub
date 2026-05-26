## Human anchor

> "The outcomes are less about knowing what file links to what file as knowing that the Figma component is structured in a way that mirrors how it's structured in code. I think less components and more variables and tokens to start. I imagine there being a system of inventorying the links between the two, and also a Storybook / similar component that lets me preview in code before rebuilding the whole server."
> — Katy, 2026-05-26

## Outcomes

- **Who:** Me (solo founder), working in the Simple Seed Organizer prototype, alternating between Figma and the React component code.
- **Job:** When I edit a component in Figma — adjusting padding, swapping a background, changing flex direction, picking a type size — I want to be editing against a **shared token vocabulary** that matches Tailwind, with the Figma↔code link **tracked in one place**, and I can **see the rendered code without booting the whole app to the right route**.
- **Done when:**
  1. **Token parity** — Figma Variables for the prototype's spacing/sizing scale **and typography scale** exist with names and values that match Tailwind / the prototype's type system (e.g. Figma `space/4 = 16px` ↔ Tailwind `gap-4`; Figma `text/sm` ↔ Tailwind `text-sm` with matching font-family, size, line-height, weight). A short doc explains the manual re-sync step if either scale changes. Colors are stretch — included if cheap, deferred if not.
  2. **Tracked links** — the existing [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md) component table gains a **parity status column** (`full` / `partial` / `drifted` / `not-yet-linked`) so it's always clear at a glance what mirrors what.
  3. **Fast component preview** — a single `/dev/components` route in the existing Next.js prototype renders the priority components with mock data, without requiring auth, navigation, or the rest of the app's state. One file; hot reload via the existing dev server.
  4. **End-to-end proof at small scale** — 1–2 components go through the full loop: Figma Variables applied to their frames, parity row filled in, preview page entry rendering. Enough to prove the loop is faster to use than the previous one.
- **Not doing:** Storybook, Ladle, or any separate component-preview dev server. A formal inventory format (TS registry / YAML / JSON) beyond the markdown table. Auto-syncing tokens between Tailwind and Figma (one-shot manual). Auto-generating code from Figma. Visual-regression testing. Figma Dev Mode paid features. Scaling beyond 1–2 components in this change.

## Why

The prior attempt ([closed PR #171](https://github.com/beckharrisdesign/experiment-hub/pull/171)) tried to surface code snippets *inside* Figma via `@figma/code-connect`, which requires the paid publish tier. Wrong lever, wrong economics for a solo founder.

There are three real frictions in the current loop, and each has a small fix:

1. **Vocabulary drift.** Figma frames are drawn with arbitrary pixel values; the prototype uses Tailwind's scale. A "padding adjustment" in Figma may not correspond to any valid prop in code. Fix: shared Figma Variables for spacing/sizing/typography that name-match Tailwind. Free-tier feature; one-time setup.
2. **No record of what's actually mirrored.** [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md) lists Figma↔code mappings but doesn't say which are structurally mirrored vs. just labeled. Fix: one extra column on the existing table. For ~10 priority pairings, a markdown table is plenty — no separate inventory format needed.
3. **Preview friction.** Today, to see a component render I run `next dev`, sign in, navigate to the right page, get into the right state. Enough friction to skip the visual check and trust Figma's render — the opposite of the loop I want. Fix: a single `/dev/components` route in the *existing* Next.js app that renders priority components with mock data. Hot reload already works. No second dev server, no Storybook config to maintain solo.

This is the **smallest version that closes the loop end-to-end.** If after using it for a week the `/dev/components` route feels cramped or the markdown table feels too informal, that's real evidence for adding Storybook or a formal inventory — not upfront guessing.

## What changes

Three pieces, sequenced foundation-first:

1. **Token parity (Figma Variables)** — establish Figma Variables collections mirroring the prototype's Tailwind **spacing/sizing scale and typography scale** (font family, sizes, line heights, weights). Document the manual re-sync step in [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md). Colors are a stretch goal.
2. **Parity column in `figma-source.md`** — extend the existing component table with a parity status column. Define the four status values in a short legend.
3. **`/dev/components` preview route** — add a single route in `experiments/simple-seed-organizer/prototype/app/` that renders the priority components with mock-data props. No new dependencies; uses the existing Next.js dev server.

Then apply all three to 1–2 components as proof.

## Capabilities

### New Capabilities

- `figma-code-parity`: Shared token vocabulary (Figma Variables ↔ Tailwind for spacing/sizing/typography) plus a tracked parity status per Figma↔code pairing plus a fast in-repo preview route — together making the design↔code loop fast enough to actually use, with no paid Figma features and no new dev server.

### Modified Capabilities

_None — the closed `sso-code-connect-phase-1` proposal was never merged to a capability._

## Impact

- **Net-new dependency:** none.
- **Keeps:** the 5 `@figma` JSDoc annotations from #171 (re-applied; cheap, one-line tags). They remain the in-code pointer to the Figma node.
- **Drops:** `@figma/code-connect` dependency, the 5 `.figma.tsx` connect files, `figma.config.ts`, all `figma connect parse/publish` steps.
- **Edits:** [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md) — token-sync section + parity status column + legend. One new file under `experiments/simple-seed-organizer/prototype/app/` for the `/dev/components` route.
- **Real cost:** the Figma Variables setup is hand work (one-time, a few hours). The `/dev/components` route is ~an hour. The 1–2 component audit is the lightest piece.
- **Deliberate non-scope:** Storybook / Ladle / formal inventory format / token auto-sync — all postponed until there's evidence the markdown table or single preview route is too cramped.

## Optional links

- PRD (if separate): _none — this is infrastructure for the SSO experiment, not a new PRD_
- Experiment directory: [`experiments/simple-seed-organizer/`](../../../experiments/simple-seed-organizer/)
- Prior attempt: [closed PR #171](https://github.com/beckharrisdesign/experiment-hub/pull/171)
- Figma source: [`experiments/simple-seed-organizer/docs/figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md)
