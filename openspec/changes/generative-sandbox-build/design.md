# Design: generative-sandbox-build

## Context

Two prototypes each solved half of this. `photo-filters-banner` ingests real uploads and
filters them in a main-thread `ImageData` loop; `image-lab` moved pixel work to sharp but
processes one image baked in at deploy time. Neither composes — both are fixed pipelines
with controls attached. See [proposal](proposal.md), [specs](specs/), and the parent
utility's [explore](../generative-sandbox/explore.md) / [propose](../generative-sandbox/propose.md).

## Goals / Non-Goals

**Goals:**

- Composition is the primary interaction: toggle, reorder, tune — no code.
- Order-dependence is legible. Moving a module visibly changes the image.
- The page never blocks: pixel work is server-side, previews are proxied.
- A stack outlives its session — saved with its output, reopenable.

**Non-Goals:**

- In-browser code editing or module authoring (proposal "Not doing").
- Prefix caching (parent Build Unit 5 — conditional on measured latency).
- Gallery, accounts, ML effects, SVG/plotter export, batch, print, mobile-first.

## User flow / IA

1. Land on an empty stack with a drop target. Bring in a photo, or start from the bundled
   reference image.
2. The photo uploads **once** to a private bucket; the client keeps only its reference.
3. Add modules from the catalogue. Each lands as a row in the stack.
4. Work the stack: drag a row to reorder, flip its toggle to mute it, expand it to tune
   parameters. Every change re-renders the preview.
5. Save when something is worth keeping — the output is stored with the whole stack.
6. Export re-runs the same stack at full resolution.

**Layout (L · 1024):** left rail is the stack — an ordered list of module rows, each with
a drag handle, a name, an enable toggle, and an expandable parameter body. Right is the
viewport with pan/zoom, carrying the busy indicator and export control. **S · 480:** the
stack collapses above the viewport, drag handles remain, parameters open as a sheet.

## Visual design / Figma

| Item | Value |
| ---- | ----- |
| Primary file URL | <https://www.figma.com/design/WYoo1eYmfh72vtIulHnNPV> (Generative Sandbox, Beck Harris Design) |
| As-is page / frames | `01 Current state` (page `1:2`) → `As-is · Photo Filters Banner · Desktop 1024` (`1:3`), `As-is · Image Lab · Desktop 1024` (`2:2`) |
| Proposed page / frames | `02 Proposed` (page `4:224`) → `Proposed · Desktop 1024` (`5:2`), `Proposed · Mobile 480` (`6:17`) |
| Libraries | **MVDS Core** (`lk-d54f86bc…09687`, file `C20nU0mROzk3Zr0I9BELJF`), added to this file 2026-08-27. Instances used: Button, Switch, Badge (Label and Card imported, see below) |
| Breakpoints | S · 480px / L · 1024px (BHD Content Types) |
| Code Connect | No updates — MVDS does not use Code Connect |
| Status | Ready for tasks |

**File convention** (`rules/figma.mdc`): numbered pages, each proposal iteration a NEW page
(`02.1 Proposed — <what changed>`), never edited in place. Frames named by treatment +
breakpoint. Per founder convention, dark boards are not rendered per proposal iteration.

**What is a real MVDS instance and what is not.** Buttons, switches, and badges in the
proposed frames are live MVDS Core instances carrying the library's own styling. The
containers — module rows, the rail, the viewport panel — are auto-layout frames with
token-derived surfaces, because an imported `Card` instance cannot accept arbitrary
children through the Plugin API. This is the honest division: every *control* comes from
the design system; the *layout* around them does not, and neither does the parameter
slider, since **MVDS Core has no Slider component** — the same gap `image-lab` hit, which
it solved by composing `npx shadcn@latest add slider` locally against MVDS tokens. The
slider node is labelled `slider (local, not MVDS)` in the file.

**Reference (non-code-derivable) values flagged:** the `image-lab` as-is frame uses a
neutral light palette approximating MVDS defaults rather than resolved token values, and
both as-is frames stand in a caption for `austin-skyline-sunset.png` rather than the
bitmap. The `photo-filters-banner` as-is colours ARE code-derived — the GitHub-dark hexes
are hardcoded in `PhotoStudio.tsx` (`#0d1117`, `#161b22`, `#21262d`, `#30363d`, `#c9d1d9`,
`#8b949e`, `#6e7681`, `#58a6ff`).

**Library defect found while building — belongs to the mvds repo, not here.** MVDS Core's
`Switch` component set ships `size=sm` variants that are **1×16px** (`size=sm, state=unchecked`
and `state=checked`), against a correct 40×24 for `size=default`. Any `sm` switch is
invisible. The proposed frames use `size=default` as a result. Per `rules/figma.mdc` —
*"Code is law; Figma is a generated mirror… never fix an MVDS component in Figma"* — this
wants a fix in `beckharrisdesign/mvds` `src/components/**` (or its Figma manifest) and a
re-sync, not a patch in this file.

## Decisions

- **Parameters live inline in each module row, not in a separate panel.** Order and
  settings are read together, so the cause of a result stays next to its position in the
  stack. A side panel would split them.
- **The stack is the left rail, mirroring both as-is layouts.** Neither prototype needs to
  be relearned — `photo-filters-banner`'s numbered fieldsets and `image-lab`'s controls
  card both sit left of the image.
- **A disabled module keeps its parameters.** Muting is how you compare, so losing
  settings on toggle would defeat the gesture. Encoded as a spec scenario, not left to
  implementation.
- **Render requests carry `{sourceRef, stack, preview}`.** The source stays server-side;
  only the description travels.
- **Previews render from a downscaled proxy (~1600px longest edge); export re-runs at full
  resolution.** This is what makes "seconds" plausible before any caching exists, and it
  is why Build Unit 5 is conditional rather than assumed.
- **Commit on release, latest-wins, stale requests aborted** — carried from `image-lab`,
  which already proved it against a 4.6 MB source.
- **Private buckets + signed URLs, following `lib/etsy-listing-kit/orders.ts`.** A TTL
  purge is required: elk keeps inputs because they are order records, and a scratch
  session's photo belongs to nobody once the tab closes.
- **The sandbox is a route in the hub app, not a standalone prototype server** (founder,
  2026-08-28). `app/generative-sandbox/` with its API under
  `app/api/generative-sandbox/`, deployed by `deploy-hub.yml` at
  `/generative-sandbox` — the same shape as `app/pdf-metadata-viewer/` and
  `app/exec-function-assessment/`. An earlier draft of this change scaffolded a separate
  Next app under `experiments/generative-sandbox/prototype/` on port 3011; that would have
  needed its own Vercel project, since `deploy-hub.yml` path-ignores `experiments/**`.
  Correcting it restores the proposal's claim that this needs no new Vercel project.
- **No new npm dependencies.** The parameter control is a native range input rather than
  `@radix-ui/react-slider`, and the server guard is a local assertion rather than the
  `server-only` package. Both avoid regenerating `pnpm-lock.yaml`, which the hub's CI
  installs with `--frozen-lockfile`.
- **Sharp applies enabled modules strictly in stack order** — one pass, no reordering
  optimisation. Order-dependence is the product behaviour; an optimiser that reorders for
  speed would silently break the thing being sold.

## Risks / Trade-offs

- **Round-trip per adjustment.** Every tweak is a network call. Mitigated by the proxy,
  commit-on-release, and abort-stale — and measured by the leading indicator (time from
  open to first visible result). If it fails, Build Unit 5 starts.
- **Stack state is the whole product surface.** `{module, enabled, params}` ordered lists
  are simple, but every feature later — presets, undo, branching — pushes on that shape.
  Worth getting the persisted format right the first time, since saved stacks must keep
  loading.
- **Module catalogue is a migration, not a rewrite.** The ported presets must produce
  visually equivalent output to the client versions, or the port is a silent regression.
  Parity is a Build Unit 2 check.
- **The parameter slider has no design-system home.** MVDS Core has no Slider, so the
  control most central to tuning a module is the one component that must be composed
  locally. `image-lab` already did this once; doing it twice is the signal that Slider
  belongs in MVDS proper.
