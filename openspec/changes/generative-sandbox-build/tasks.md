# Tasks: generative-sandbox-build

Child of `openspec/changes/generative-sandbox/` (`bhd-experiment`). Sections 3.1–3.4 map
to that parent's Build Units 1–4. Package manager is **npm**, matching the prototype
convention and the root `dev:` scripts.

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 User uploads a photo once and keeps adjusting it
- [ ] 1.2 User toggles a module off without losing its settings
- [ ] 1.3 User reorders modules in the stack
- [ ] 1.4 User adjusts a module's parameters
- [ ] 1.5 User sees a different image after reordering the same modules
- [ ] 1.6 User applies a preset and a banner from the module catalogue
- [ ] 1.7 User saves a result and its recipe is kept with it
- [ ] 1.8 User reopens a saved stack and builds on it

## 2. Prototype shell

- [x] 2.1 **Revised 2026-08-28 (founder): a route in the hub app, not a standalone prototype.** `app/generative-sandbox/` + `app/api/generative-sandbox/` + `lib/generative-sandbox/`, served at `/generative-sandbox` by the hub's own dev server and deploy. The first pass scaffolded a separate Next app on port 3011, which would have required its own Vercel project because `deploy-hub.yml` path-ignores `experiments/**`
- [x] 2.2 Register `proto-generative-sandbox` with `linkPath: app/generative-sandbox` and **no port** — a hub route needs none, matching `proto-web-to-figma-grabber` and `proto-snap-issue`. Port 3011 and the root `dev:` script were removed with the standalone prototype
- [x] 2.3 Register the experiment in `data/experiments.json`: `type: tool`, the utility statement, tags. Note the hub registry of record is Notion (`lib/notion-experiments.ts`); the JSON is legacy fallback, so the Notion row is the one that matters
- [x] 2.4 MVDS needs no new wiring — the hub app already imports it (`@beckharrisdesign/mvds@^0.3.0`, which includes Switch, added 2026-06-12 and published in 0.3.0)
- [x] 2.5 Parameter slider composed locally — a **native range input** styled with MVDS tokens rather than Radix, so no new dependency and no `pnpm-lock.yaml` churn against CI's `--frozen-lockfile`. MVDS Core still has no Slider; `image-lab` hit the same gap (design.md)

## 3. Implementation

### 3.1 Build Unit 1 — module stack spine

- [x] 3.1.1 Module registry: each transform declares `{id, label, params: [{name, type, min, max, default}]}`, and a sharp implementation. Seeded with blur and colour simplify, ported from `image-lab`'s `api/_lib/render.ts` with its vitest suite
- [x] 3.1.2 Stack state as an ordered list of `{module, enabled, params}`; disabled entries keep their params (spec scenario 1.2 — the state shape is what makes that free)
- [x] 3.1.3 Upload-once: source to a private Supabase bucket, client holds only the reference. Render requests carry `{sourceRef, stack, preview}`
- [x] 3.1.4 Render route applies **enabled modules strictly in stack order** — no reordering optimisation; order-dependence is the product behaviour (design.md)
- [x] 3.1.5 Preview proxy at ~1600px longest edge; export re-runs the same stack at full resolution
- [x] 3.1.6 Stack UI per the approved Figma `Proposed · Desktop 1024` (`5:2`) / `Proposed · Mobile 480` (`6:17`): drag handle, name, enable Switch, inline params. MVDS instances for controls
- [x] 3.1.7 Viewport with independent pan/zoom, ported from `image-lab`'s `zoom-viewport.tsx`
- [x] 3.1.8 Commit-on-release, latest-params-win, stale requests aborted (AbortController)
- [x] 3.1.9 Instrument **time from open to first visible result** — the Measurement Brief's leading indicator, and what decides whether parent Build Unit 5 ever starts
- [x] 3.1.10 Instrument reorder and toggle events — the composition threshold depends on them

### 3.2 Build Unit 2 — photo module port

- [ ] 3.2.1 Port the three presets (slate, mono-pop, high-contrast) from `applyFilterToImageData` to sharp modules
- [ ] 3.2.2 Port header/footer banner overlays as modules
- [ ] 3.2.3 Port upload ingest and validation (`ACCEPTED_MIMES`, `MAX_EDGE_PX`) — the 4096px "for smoother editing" warning goes away, since the browser no longer does the work
- [ ] 3.2.4 **Parity check**: each ported preset matches the client implementation on a fixture image, so the port is not a silent regression
- [ ] 3.2.5 Retire `photo-filters-banner`'s client-side path
- [ ] 3.2.6 Fix the port collision: its `package.json` runs `next dev -p 3003`, which is `proto-simple-seed-organizer`'s port, while its README and the registry say 3009

### 3.3 Build Unit 3 — stack memory

- [ ] 3.3.1 Supabase migration: saved-stacks table + private output bucket, following `lib/etsy-listing-kit/orders.ts` (private input/output, `createSignedUrl`)
- [ ] 3.3.2 Save an output with its complete stack — order, per-module enabled state, params, seed
- [ ] 3.3.3 Reopen a saved stack into the editing surface with everything restored; saving again creates a **new** entry rather than overwriting (spec scenario 1.8 — building on an accident must not destroy it)
- [ ] 3.3.4 **TTL purge for session scratch.** elk keeps inputs because they are order records; a scratch session's photo belongs to nobody once the tab closes. Without this the bucket grows forever
- [ ] 3.3.5 Instrument stacks saved and stacks reopened-and-modified (threshold: 2 reopened in the four-week window)

### 3.4 Build Unit 4 — retirement and registry

- [ ] 3.4.1 Retire `image-lab` in `generative-art` as a live surface; `sketch.js` and `index.html` stay untouched
- [ ] 3.4.2 Close the superseded [generative-art PR #3](https://github.com/beckharrisdesign/generative-art/pull/3) (open during the transfer, per the founder)
- [ ] 3.4.3 Decide what `generative-art` becomes — archive, or working surface beside the sandbox. **Founder call, still open in the parent explore.md**
- [ ] 3.4.4 Retire or redirect `experiments/photo-filters-banner/`; free port 3009

## 4. QA

- [ ] 4.1 Manual walkthrough of every §1 outcome, on the deployed hub rather than localhost
- [x] 4.2 Automated: vitest on the render lib (`tests/generative-sandbox-render.test.ts`, in the hub's suite) — **order-dependence is the headline test** (blur→quantize must differ from quantize→blur), disabled modules excluded from the pipeline, out-of-range params rejected, palette size honoured
- [ ] 4.3 Automated: saved-stack round trip — save, reopen, assert every module/order/param/seed survives
- [ ] 4.4 Confirm the page stays responsive while a render is in flight, on a large photo — the failure that started this whole chain

## 5. Follow-ups raised, not fixed here

- [ ] 5.1 **MVDS `Switch` `size=sm` variants are 1×16px** in MVDS Core (`size=default` is a correct 40×24), so any small switch is invisible. Found while building the proposed frames. Belongs in `beckharrisdesign/mvds` `src/components/**` plus a re-sync — Figma is a generated mirror and does not get hand-fixed
- [ ] 5.2 **Slider belongs in MVDS.** Two consumers have now composed one locally (`image-lab`, this)
- [ ] 5.3 **Rubric drift**: `openspec/config.yaml:23` advertises the retired v2 scoring, and the `bhd-experiment` explore template still ships the v1 five-dimension table, while `rules/scoring-criteria.mdc` is v3. Two one-line fixes, own change
- [ ] 5.4 **`docs/PROTOTYPE_PORTS.md` does not exist** but is referenced by the schema's apply instruction and the photo-filters-banner README. `data/prototypes.json` is the real registry
- [ ] 5.5 **Hub linked-repos task 0.3 is stale** — it blocks the dashboard UI on `NODE_AUTH_TOKEN` for `@beckharrisdesign/mvds` "on GitHub Packages", but MVDS 0.4.0 publishes to registry.npmjs.org and fetches anonymously
