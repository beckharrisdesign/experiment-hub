## Human anchor

> Backlog [#120](https://github.com/beckharrisdesign/experiment-hub/issues/120) (verbatim): “The columns in the hero/title section don't align with those in the scaffolding section below it on the landing page. Likely a grid or padding mismatch between the two sections. Fix by ensuring both sections share the same column grid.”

## Outcomes

- **Who:** Visitors on the Simple Seed Organizer marketing landing (logged-out or browsing before signup).
- **Job:** Scan the hero and the first feature/scaffolding band without visual “jumps” — headlines and column edges should line up vertically.
- **Done when:** At 480px and 1024px breakpoints, the hero content block and the scaffolding/features grid share the same horizontal content width and left/right edges (verified against Figma frame `S8YJQugvMmn5jaRqwFM5XO` landing, nodes `7:244` hero and `7:48` features).
- **Not doing:** Copy changes, new sections, pricing/signup layout, or broader Figma–code parity inventory (separate changes).

## Why

Misaligned columns read as unfinished polish and undermine the “simple, trustworthy” positioning. This is a small, scoped layout fix tied to an open bug so we can ship parity without reopening the full landing refactor.

## What changes

- Audit horizontal layout on `LandingHero` and the first scaffolding band (`LandingFeaturesSection` — three-column feature grid directly under the hero).
- Introduce a **shared landing content container** (max width, horizontal padding, optional grid) used by both sections so column edges match.
- Adjust Tailwind classes only as needed; keep existing tokens and `@figma` tags.
- Manual check at S/L breakpoints; optional vitest/DOM smoke only if we add a stable test hook (e.g. shared `data-testid` on the container).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `simple-seed-organizer-design-system`: Landing hero and scaffolding/features band SHALL use one shared horizontal grid/container so column alignment matches Figma at hub breakpoints.

## Impact

- **Code:** `experiments/simple-seed-organizer/prototype/app/components/LandingHero.tsx`, `LandingFeaturesSection.tsx`, and possibly a small shared `LandingSectionContainer` (or equivalent) under `components/`.
- **Figma:** `S8YJQugvMmn5jaRqwFM5XO` — frames `7:244`, `7:48` (reference for edge alignment).
- **Tracking:** Closes #120 when merged.
- **Risk:** Low — CSS/layout only; no API or auth changes.

## Optional links

- PRD: `experiments/simple-seed-organizer/docs/PRD.md`
- Experiment directory: `experiments/simple-seed-organizer/`
- GitHub issue: https://github.com/beckharrisdesign/experiment-hub/issues/120
