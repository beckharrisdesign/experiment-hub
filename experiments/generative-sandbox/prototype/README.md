# Generative Sandbox — prototype

Stack transform modules, reorder them, tune their parameters. All pixel work runs
server-side (sharp), so the browser never blocks on a large photo.

**Port:** 3011 (registered in `data/prototypes.json`)

Change record: `openspec/changes/generative-sandbox/` (utility lifecycle) and
`openspec/changes/generative-sandbox-build/` (this code).
Figma: <https://www.figma.com/design/WYoo1eYmfh72vtIulHnNPV> — `02 Proposed`.

## Dev

```bash
npm install
npm run dev     # http://localhost:3011
npm test        # vitest over the render pipeline
```

Supabase credentials are optional locally: without `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` the source image is written to a temp directory
instead of a private bucket. That fallback is a convenience, **not** production
parity — the deployed hub always uses Supabase.

## What is here (Build Unit 1)

- `lib/modules.ts` — the module registry. Adding a module is a code change here;
  composing modules needs no code. That split is the point.
- `lib/render.ts` — applies enabled modules **strictly in stack order**. No
  reordering optimisation: order-dependence is the product behaviour.
- `lib/storage.ts` — upload once to a private bucket; later requests carry
  `{sourceRef, stack, preview}` and never the file again.
- `app/api/source`, `app/api/render` — the two routes that implement that.

## Not here yet

Presets and banner overlays (Build Unit 2), saved stacks (Build Unit 3), and
retirement of the surfaces this replaces (Build Unit 4). See
`../../../openspec/changes/generative-sandbox-build/tasks.md`.

## QA checklist

- [ ] Add a photo → a result renders
- [ ] Drag a parameter → label tracks continuously, render fires on release
- [ ] Toggle a module off → it leaves the result, its parameters stay put
- [ ] Reorder blur and colour simplify → the image visibly changes
- [ ] Drag/zoom the viewport; Reset refits
- [ ] Drag a slider repeatedly while busy → UI stays responsive, last value wins
