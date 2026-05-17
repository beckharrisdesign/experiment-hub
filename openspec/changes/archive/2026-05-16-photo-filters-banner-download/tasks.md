## 1. Prototype scaffolding

- [x] 1.1 Create `experiments/photo-filters-banner/prototype/` Next.js workspace with package.json + Turborepo wiring + README (`pnpm install`, `pnpm dev` script names).
- [x] 1.2 Add single route exporting the studio shell matching design layout (controls + canvas split).

## 2. Rendering core

- [x] 2.1 Implement ingest pipeline (`<input type="file" accept="image/jpeg,image/png,image/webp">` + decoding helpers).
- [x] 2.2 Build Canvas redraw loop syncing source backing buffer plus overlays.
- [x] 2.3 Implement filter preset functions (at least three deterministic transforms) selectable via UI radios.
- [x] 2.4 Bake two authored banner overlays (SVG or programmatic draw helpers) selectable via thumbnails.

## 3. Accessibility and safeguards

- [x] 3.1 Guarantee focus-visible ordering and labelled controls referencing the spec keyboard scenario.
- [x] 3.2 Add soft guardrail copy for oversized assets and unsupported MIME rejection messaging.

## 4. Export and QA hooks

- [x] 4.1 Wire Download button using `canvas.toBlob`, temporary anchor, and object URL revocation.
- [x] 4.2 Add smoke automation (manual Playwright or Vitest scaffold) covering ingest → tweak → PNG download checklist.
