# Estate Sale Planner

Film a walkthrough of a parent's house → a vision model flags what might be worth something
→ two lists (sell / keep-toss) → swipe to decide → one tap to call the haul-away truck.

**Status:** Explore (autonomous build; see the review queue before trusting any default).

- **Founder intent:** [`docs/intent.md`](docs/intent.md)
- **Review queue (autonomous defaults, none approved until Katy says so):**
  [`docs/review-queue.md`](docs/review-queue.md)
- **Lifecycle (OpenSpec, `bhd-experiment`):**
  [`openspec/changes/estate-sale-planner`](../../openspec/changes/estate-sale-planner) —
  `explore.md` → `propose.md` → `apply.md` → `archive.md`
- **Build change (lite, code ships here):** `openspec/changes/estate-sale-planner-build` —
  created once Propose is drafted.
- **Surface (planned):** in-hub route `app/estate-sale-planner/` on MVDS, like
  `etsy-listing-kit` and `svg-to-stitch`; deploys with the hub.

## Gate

The code build waits on the next `@beckharrisdesign/mvds` release (npm latest is `0.4.0`,
2026-08-23; the unreleased changelog is a packaging release). When it is published:
bump `package.json` + `pnpm-lock.yaml`, re-check any z-index stacking (the `z-*` utilities
start emitting in that release), then run `/opsx:apply` on the build change.
