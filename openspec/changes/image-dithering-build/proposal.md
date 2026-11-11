## Human anchor

> "I want to experiment with an autonomous product experiment again, where we use the shared
> services of the hub and MVDS and secret sharing to make progress."
> "The goal of v1 is NOT revenue. It's a live, indexable, genuinely useful page I can submit to
> Search Console and measure. Ship small, ship today."
> — Katy, 2026-11-11. Full brief: [`experiments/image-dithering/docs/intent.md`](../../../experiments/image-dithering/docs/intent.md)

## Outcomes

- **Who:** A laser maker (Katy first, on an xTool M1 Ultra) with a photo to engrave.
- **Job:** Turn the photo into a 1-bit image tuned for the material, at the exact physical size,
  without installing anything or uploading the photo anywhere.
- **Done when:** The brief's ship gate passes: tests 1–21 green in CI, Lighthouse mobile ≥ 95 on all
  four categories, initial JS ≤ 60 KB gz, the three benchmarks met or reported with a fix, and the page
  deployed on Vercel.
- **Not doing:** accounts, payments, server-side processing, AI features, per-material landing pages,
  DXF/SVG export.

## Why

It's the first probe of a programmatic-SEO tool site for makers. "image dithering" gets 2,400 searches a
month, at medium difficulty, with weak incumbents (DA 11–15). The comparison grid and material presets are
the differentiation. Revenue is out of scope. The measure is Search Console impressions at 28 days, with a
stop-or-expand decision at 6 weeks.

## What changes

- A new static Astro site at `experiments/image-dithering/prototype/`, with one vanilla TypeScript island
  and the dithering engine in a Web Worker.
- Built in three steps, each red → green → check-in: engine → presets + UI → SEO + deploy.
- Its own Vercel project and a path-filtered GitHub Actions workflow. Hub routes are untouched.

## Capabilities

### New Capabilities

- `laser-dither-engine`: grayscale/tone/invert/resample/dither/mirror pipeline with 8 algorithms and a
  PNG export carrying a correct pHYs chunk.
- `laser-dither-page`: the tool page, with comparison grid, material presets reflected in the URL,
  explainer, FAQs, and the SEO surface.

### Modified Capabilities

None.

## Impact

- `pnpm-workspace.yaml` gains one member, and `pnpm-lock.yaml` grows by Astro and its test tooling.
- The hub's Vercel build is unaffected: `vercel.json` already skips the `experiments/` path in its
  ignore command, and the hub's `next build` doesn't import the app.
- Root CI is unaffected: root Vitest only collects `tests/**`, and root tsconfig/ESLint exclude
  `experiments/**/prototype/**`.

## Optional links

- Experiment directory: `experiments/image-dithering/`
- Review queue (autonomous defaults): `experiments/image-dithering/docs/review-queue.md`
- Figma round: due before Step 2 UI code (review queue #4)
