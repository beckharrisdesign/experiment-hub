# Proposal: etsy-ecosystem-map

## Human anchor

> "This is the bigger picture of the ecosystem for me personally. Not even thinking product yet, just learning on the job. 🙂 At the end of the day I want to be able to embroider projects that seem fun and relaxing and IRL and help others do the same." — Katy, 2026-09-16

## Outcomes

- **Who:** Katy — designer and solo founder running Watermark & Hue as a learning vehicle; downstream, the stitchers who buy a pattern hoping for a fun, relaxing, IRL evening.
- **Job:** Hold the whole Etsy ecosystem in one legible, governed picture, so that day-to-day work — a listing batch, an experiment, a new script — always knows where it plugs in and what it serves.
- **Done when:** The ecosystem map is a spec'd capability rather than a snapshot doc: surfaces and seams are named, the two fragment layers (the shop design system; the manual data-capture rituals) have written homes, and a change anywhere in the pipeline can cite the map section it touches.
- **Not doing:** Product or commercial strategy, revenue targets, new feature builds, or resurrecting MVDS as a product. This change documents and governs what exists; it ships no tooling.

## Why

The ecosystem grew faster than its own record. In one week it gained write tooling, a gallery sync, a nine-listing holiday batch, and an experiment with a measurement protocol — and the knowledge holding it together lives in code comments, one experiment's doc, and session memory. That's fine for shipping and bad for learning, and learning is the stated point. A governed map turns each week's improvisation into something the next week can stand on — and keeps the north star in the room: the shop exists so making and stitching these patterns stays fun, relaxing, and IRL, not so a dashboard goes up and to the right.

## What changes

`docs/ETSY_ECOSYSTEM_MAP_2026-09.md` (the September snapshot: 12 sections from Figma design through sync, evaluation, sweeps, and the in-flight Stitch Check line) graduates from a dated document into a living capability with requirements — what the map must always answer, who updates it when a surface changes, and how the fragment layers get codified. The standards layer (W&H shop design system: image principles + content principles, the MVDS-expressed instance) becomes its own named capability with a codification path.

## Capabilities

### New Capabilities

- `ecosystem-map`: the living map of every surface that produces a W&H component or listing — design, files, registries, writing, tooling, sync, intelligence tiers, evaluation, sweeps — with its live-state table and update rules.
- `shop-design-system`: the W&H standards layer codified from fragments — image principles (scene composition, palette, photography) and content principles (copy rules, house-style skeleton, alt-text templates) — written so both a human and the evaluation rubric can check work against it.

### Modified Capabilities

None — the surfaces themselves keep their existing specs (etsy-notion-sync, listing kit); this change gives them a shared picture.

## Impact

- `docs/ETSY_ECOSYSTEM_MAP_2026-09.md` becomes the capability's first artifact and gains an owner and update trigger (any PR that adds/moves a surface updates the map).
- The shop design system codification unblocks a future brand-adherence tier in the ELK evaluation rubric (out of scope here; noted as the seam).
- The FigJam board mirrors the map for visual review.
- No code, no schema, no new tooling.

## Optional links

- Ecosystem map: `docs/ETSY_ECOSYSTEM_MAP_2026-09.md`
- Copy rules source: `experiments/etsy-notion-sync/docs/tag-positioning-experiment.md`
- Improvement plan pattern: `docs/ETSY_LISTING_IMPROVEMENT_PLAN_2026-09.md`
