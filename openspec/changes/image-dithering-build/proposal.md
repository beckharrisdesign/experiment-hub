## Human anchor

> "I want to experiment with an autonomous product experiment again, where we use the shared
> services of the hub and MVDS and secret sharing to make progress."
> "The goal of v1 is NOT revenue. It's a live, indexable, genuinely useful page I can submit to
> Search Console and measure. Ship small, ship today."
> — Katy, 2026-11-11. Full brief: [`experiments/image-dithering/docs/intent.md`](../../../experiments/image-dithering/docs/intent.md)

## Outcomes

- **Who:** Designers who want the dither or halftone *look* (the bigger search audience), and laser makers (Katy first, on an xTool M1 Ultra) who need it at exact physical size. Scope update 2026-11-11, see intent.md.
- **Job:** Give an image a dither or halftone effect and export it for screen, print, or a laser at
  the exact physical size, without installing anything or uploading the image anywhere.
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

- `laser-dither-engine`: grayscale/tone/invert/resample → dither (8 algorithms) or halftone (dot / line /
  cross screens) → mirror, plus a PNG export carrying a correct pHYs chunk.
- `laser-dither-page`: the tool page, with comparison grid, material presets reflected in the URL,
  explainer, FAQs, and the SEO surface.

### Modified Capabilities

None.

## Impact

- The hub's `pnpm-workspace.yaml` and `pnpm-lock.yaml` are untouched. The prototype has its own lockfile and installs with `--ignore-workspace`, so its Vite 8 (via Astro 7) can't re-resolve the hub's dependencies. As a workspace member it did exactly that and broke the hub's typecheck in the first CI run.
- The hub's Vercel build is unaffected: `vercel.json` already skips the `experiments/` path in its
  ignore command, and the hub's `next build` doesn't import the app.
- Root CI is unaffected: root Vitest only collects `tests/**`, and root tsconfig/ESLint exclude
  `experiments/**/prototype/**`.

## Optional links

- Experiment directory: `experiments/image-dithering/`
- Review queue (autonomous defaults): `experiments/image-dithering/docs/review-queue.md`
- **Figma, first round (`02 Proposed`):** design file [`image-dithering-build`](https://www.figma.com/design/jillBCo0orNQPZJaCAx0g7)
  · page `02 Proposed` (node `1:267`) · frames `Proposed · Desktop 1024` (node `5:231`) and
  `Proposed · Mobile 480` (node `6:61`). Built on MVDS Core (team default library). The image tiles
  are real Step 1 engine output on a procedural stand-in image, not mock-ups. `00 Components` holds the
  local `Comparison tile` (`4:22`) and `Slider (stand-in)` (`4:23`). `01 Current state` notes that the
  surface is net-new.
- **Figma, round 02.1** (`02.1 Proposed — comparisons first, Advanced tab`, page `7:10`), from Katy's
  2026-11-11 note: *"lead with the comparisons and only offer the specific toggles and sliders on an
  advanced tab. In theory I could click one of the dithered options and be presented with four more so
  I could pick the one I like the best."* Frames: `Proposed · Desktop 1024 · Pick` (`8:9`),
  `Proposed · Mobile 480 · Pick` (`9:41`), `Proposed · Desktop 1024 · Advanced tab (tool area only)`
  (`9:127`). `02 Proposed` is left intact for comparison.
- **Figma, round 02.2** (`02.2 Proposed — stepped flow, Next and Back`, page `10:2`), from three more
  notes the same day: *"add in chunky next and back buttons so people can move freely up and down the
  process. the previews only load when they've picked the previous series."* · *"bump up the visual
  contrast particularly in the header. if this is an seo test don't we need content? even some terms and
  faqs at the bottom could help."* · *"its weird to have a l-r workflow status for a process that's
  actually going top to bottom."* Frames: `Proposed · Desktop 1024 · Step 2, nothing picked yet` (`10:3`),
  `Proposed · Desktop 1024 · Step 3 active` (`10:87`), `Proposed · Mobile 480 · Step 3 active` (`13:51`),
  `Proposed · Desktop 1024 · Content below the tool (SEO)` (`12:51`, ~740 words). Screenshots of every
  round are in [`assets/`](assets/).
- **Figma, round 02.3** (`02.3 Proposed — Image to Laser name, no lab caption`, page `16:2`): 02.2 copied
  with the lab caption replaced by the **Image to Laser** wordmark. Katy: *"take the BHD Labs Free Tool
  off"* · *"we learned that laser folks don't know the word dither... something else? Image to laser?"*
  Frames `16:62`, `16:103`, `16:148`, `16:186`. The H1 still targets "image dithering"; that's an open
  question (review queue #33).
- **Figma, round 02.4** (`02.4 Proposed — Dither & Halftone Generator, designers first`, page `18:11`),
  after the keyword-research scope update and Katy's *"the most valuable phrase is almost the smallest
  text?"* Frames: `Proposed · Desktop 1024 · Step 2, Halftone` (`19:4`) and `Proposed · Desktop 1024 ·
  Step 4, Export for laser` (`19:71`). The halftone tiles are real output from the new halftone engine.
