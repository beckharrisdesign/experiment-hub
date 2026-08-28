# Proposal: generative-sandbox-build

> Child change of `openspec/changes/generative-sandbox/` (schema `bhd-experiment`).
> That parent holds the utility's Explore/Propose/Apply artifacts; this child is where
> code ships, per `rules/bhd-experiment.mdc`.
>
> **Scope:** Build Units 1–4. Unit 5 (prefix caching) is conditional on measurement and
> is not part of this change.
>
> Supersedes an earlier draft of this file that proposed folding `image-lab` into
> `photo-filters-banner` as a photo studio. The founder's reframe made the sandbox the
> point; photo filtering is one module inside it.

## Human anchor

> "I still love the creativity and flexibility of generative art and the gray area between it and code. I want a sandbox to work in when the inspiration strikes."
>
> "I don't necessarily want in browser code editing, but in browser manipulation of transform modules - on, off, restacking, adjusting parameters, etc."
>
> — Katy, 2026-08-27 (Claude Code session)

## Outcomes

- **Who:** Katy, working generatively when an idea arrives. n = 1, stated plainly.
- **Job:** Get from impulse to a visible image in seconds, compose transforms by hand
  without writing code, and never lose the recipe behind a good accident.
- **Done when:**
  - A source image can be brought in once, and every later adjustment sends parameters
    rather than the file.
  - Transform modules can be **toggled off without losing their settings, reordered
    within the stack, and tuned** through their own parameters — with the result
    re-rendering server-side in order.
  - Reordering visibly changes the output, because the pipeline is order-dependent:
    blur-then-quantize and quantize-then-blur are different images.
  - The v1 catalogue covers blur, colour simplify, the three ported presets, and banner
    overlays.
  - An output can be saved with the whole stack that produced it — order, toggles,
    parameters, seed — and that stack reopened and built on later.
  - Nothing about using it requires paperwork.
- **Not doing:**
  - No in-browser code editing or module authoring. Adding a module is a code change in
    the repo; composing modules needs no code. That split is the point, not a limitation.
  - No prefix caching (Build Unit 5 — conditional on a measured latency problem).
  - No gallery, publishing, accounts, or sharing (parent Explore, Permutation C — the
    exclusion is load-bearing).
  - No ML effects, no SVG/plotter export, no batch, no print pipeline, no mobile-first
    layout.
  - No paint-by-number or embroidery output — `pbn-research` owns that question.

## Why

Two prototypes each solved half of this and stalled on the other half.
`photo-filters-banner` takes real uploads but runs `applyFilterToImageData` on the main
thread, and its own `ingest.ts` apologises above 4096px. `image-lab` moved pixel work to
sharp but processes a single image baked in at deploy time, so it has no photo to offer.
Neither composes: both are fixed pipelines with controls bolted on.

The utility's bet is that the bottleneck was never tooling power — it is friction at the
moment of impulse, and forgetting what produced a good result. A module stack addresses
the first by making composition a gesture, and saved stacks address the second.

Building it in the hub costs almost nothing extra: the Vercel project, the vaulted
credentials, the Supabase buckets, the CI and the deploy workflow all already exist.

## What changes

- **New prototype** at `experiments/generative-sandbox/prototype/` — a Next.js surface
  matching the hub's stack, MVDS chrome, port assigned from `data/prototypes.json`.
- **Module registry**: each transform declares its parameters and is applied server-side
  by sharp. Stack state is an ordered list of `{module, enabled, params}`.
- **Processing route** applies the stack in order against the stored source, returning a
  rendered preview; export re-runs the same stack at full resolution.
- **Supabase**: private buckets for source and output following
  `lib/etsy-listing-kit/orders.ts`, plus a table for saved stacks. A TTL purge for
  session scratch — elk keeps inputs because they are order records; a scratch session's
  photo belongs to nobody once the tab closes.
- **Ported in**: `image-lab`'s sharp render lib and vitest suite, its independent pan/zoom
  viewport; `photo-filters-banner`'s three presets, banner overlays, and upload ingest —
  each becoming a module.
- **Retired**: `photo-filters-banner`'s client-side path and `image-lab` as a live
  surface; registry rows updated; the superseded generative-art PR #3 closed.
- **Port collision fixed**: that prototype's `package.json` runs `next dev -p 3003`,
  which is `proto-simple-seed-organizer`'s port, while its README and the registry say
  3009.

## Capabilities

### New Capabilities

- `transform-module-stack`: transforms are first-class modules — toggled, reordered, and
  tuned in the browser, applied in order server-side.
- `stack-memory`: an output is stored with the stack that produced it, and that stack can
  be reopened and extended.

### Modified Capabilities

_None promoted in `openspec/specs/` — `photo-filters-banner` shipped without specs._

## Impact

- **Hub repo:** new prototype directory; `data/experiments.json` and
  `data/prototypes.json` updated; `experiments/photo-filters-banner/` retired or
  redirected.
- **Supabase:** two private buckets and one table, plus a purge job. New surface area,
  but on an established pattern.
- **generative-art:** `image-lab` retired as a live surface; `sketch.js` untouched. What
  that repo becomes — archive, or working surface beside the sandbox — is a founder
  decision still open in the parent.
- **Deploy:** no new Vercel project, no new secrets. The reason this lives here.
- **Figma gate:** this is a new UI surface, so design.md requires an as-is + proposed
  pair before approval (`rules/figma.mdc`). As-is is the two existing prototypes; proposed
  is the stack surface.
- **Registry identity — pending your call.** Written for a new
  `experiments/generative-sandbox/` slug, on the reading that the utility is not
  `photo-filters-banner` any more. The alternative is reusing that slug to preserve its
  `experimentId` / `prototypeId` / `linkPath`. Say which and I will align before specs.

## Optional links

- Parent: `openspec/changes/generative-sandbox/` (explore, propose, apply)
- Storage pattern: `lib/etsy-listing-kit/orders.ts`
- Sources folded in: `experiments/photo-filters-banner/prototype/`, and
  `beckharrisdesign/generative-art` → `image-lab/`
- Adjacent: `experiments/pbn-research/` — would want the same stack shape for pipeline
  comparison
