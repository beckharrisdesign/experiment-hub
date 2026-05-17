## Why

Standalone browser utility makers need an obvious way to **upload a portrait/photo**, **layer simple filters plus promo banners/overlays**, and **download** the composed bitmap without juggling heavy tools. A tiny client-side canvas flow keeps onboarding fast and lowers hosting friction for experiments.

## Experiment links / human anchor

`/opsx:propose` prompt (2026-05-15): founder wants a super simple photo filter + banner + download web app MVP.

## Evidence (experiment)

N/A yet — exploratory capability spike documented here as the originating prompt; future PRDs can live under `experiments/<slug>/docs/` if this graduates.

## Proceed attestation

N/A • hub playground / tool spike (no sponsor rubric enforced for this scaffold).

## Visual board (FigJam / light Figma)

[Figma — Prototype: photo-filters-banner-studio](https://www.figma.com/design/kgPYePkPOC4Sg0VdVEvfYh/Prototype--photo-filters-banner-studio?node-id=13-99) · desktop frame `13:99` · mobile `13:160`

**shadcn/ui** instances scaffolded: Choose photo, filter group, banner toggles, Download PNG, live preview placeholder. Desktop: controls left, preview right; mobile: stacked.

## What Changes

- Add a **minimal web prototype** (Next.js-compatible with the Hub stack) reachable at `/experiments/<slug>/prototype` conventions used elsewhere (`pnpm dev` scoped script).
- **Client-side only** ingest: user picks JPEG/PNG/WebP (**no server upload/storage** baseline).
- **Preview canvas** composites source photo + selectable **filter presets** + **banner/overlay presets** (vector/text assets drawn onto canvas bitmap).
- **Download** flattened PNG (**MUST**) with deterministic filename fallback.
- Accessible controls (labels + keyboard-focusable selectors) scoped to MVP.

## Capabilities

### New Capabilities

- `photo-filters-banner-studio`: End-to-end client-only photo ingest, transformations, overlays, composite preview, and downloadable export surfaced through a cohesive single-page UX.

### Modified Capabilities

- (none — net-new sandbox surface)

## Impact

Introduces net-new UX + assets confined to prototype directory; avoids touching production auth/marketing routing until promoted. Perf budget: keep canvases capped to reasonable resolutions with soft guidance in UI copy.
