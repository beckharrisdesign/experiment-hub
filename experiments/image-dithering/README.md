# Dither & Halftone Generator: for designers and laser makers

*Working title (2026-11-11 scope update). Experiment slug: `image-dithering`. Earlier names: "Image Dithering for Laser Engraving", "Image to Laser".*

Give any image a dither or halftone effect, then download it for screen, print, or the exact millimetre size a laser needs. It runs entirely in the browser. It's the first test of whether a programmatic-SEO tool site for makers can rank.

**Status:** Step 1 (engine) done, 47/47 green. The Figma first round is up and waiting on your go before any UI code. This is an autonomous build: see the review queue before trusting any default.

- **Founder intent + full brief:** [`docs/intent.md`](docs/intent.md)
- **Review queue:** [`docs/review-queue.md`](docs/review-queue.md)
- **OpenSpec:** [`openspec/changes/image-dithering-build`](../../openspec/changes/image-dithering-build)
- **Code:** [`prototype/`](prototype/), an Astro static site with one vanilla TypeScript island. It's a **standalone pnpm project with its own lockfile**, deliberately *not* a hub workspace member: Astro 7 brings Vite 8, and as a member it re-resolved the hub's own vitest onto Vite 8 and broke the hub's typecheck and deploy (PR #591, first CI run).
- **Notion row:** not created yet (review queue #5)

## Run locally

```bash
cd experiments/image-dithering/prototype
pnpm install --ignore-workspace      # its own lockfile; never the hub's
pnpm dev                             # http://localhost:4321
pnpm test                            # Vitest: dither + halftone engine, PNG export (76 tests)
```

## Checklist

### Step 1 — engine
- [x] Tests 1–13 written and shown red: 46 failed / 1 trivially passed of 47 ([`docs/test-runs/step1-red.txt`](docs/test-runs/step1-red.txt))
- [x] Engine + pHYs injection implemented: 47/47 green ([`docs/test-runs/step1-green.txt`](docs/test-runs/step1-green.txt)). Atkinson's 25%-gray tolerance set explicitly, see review queue #15

### Step 1b — halftone mode
- [x] Halftone tests red: 25 of 76 failing ([`docs/test-runs/halftone-red.txt`](docs/test-runs/halftone-red.txt))
- [x] Dot / line / cross screens, angle, LPI, dot shape: 76/76 green ([`docs/test-runs/halftone-green.txt`](docs/test-runs/halftone-green.txt))

### Step 2 — presets + UI
- [x] Figma first round: [`02 Proposed`](https://www.figma.com/design/jillBCo0orNQPZJaCAx0g7) (desktop 1024 + mobile 480)
- [x] Round 02.1: comparisons first, refine by picking four variations, controls on an Advanced tab (review queue #22–#25)
- [x] Round 02.2: stepped flow, chunky Back/Next, lazy previews, inverse header, ~740 words of content (review queue #26–#30)
- [x] Round 02.3: Image to Laser wordmark, lab caption removed (review queue #32, #34)
- [x] Keyword target decided: designers first, laser export as the differentiator (review queue #33)
- [x] Round 02.4: Dither & Halftone Generator as the H1, Dither/Halftone switch, laser options inside Export (review queue #35–#37)
- [ ] Your go on the round, then `design.md` (review queue #4)
- [ ] Tests 14–18 red → green
- [ ] Web Worker wired; previews downscaled, export full-res

### Step 3 — SEO + deploy
- [ ] Tests 19–21 red → green
- [ ] GitHub Actions workflow: unit + e2e
- [ ] Vercel project created (ask first)
- [ ] Lighthouse mobile ≥ 95 ×4, LCP < 1.5 s, CLS < 0.05
- [ ] Initial JS ≤ 60 KB gz (worker reported separately)
- [ ] Benchmarks recorded below

## Benchmarks

Early Node-only signal (2026-11-11, M1, no canvas/worker): 12 MP Floyd–Steinberg 231 ms; all 8 algorithms on a 12 MP source 373 ms. The formal numbers come from the browser benchmark in Step 3.

| Target | Budget | Measured |
| --- | --- | --- |
| Preview update after a slider change, 2 MP | ≤ 300 ms | — |
| Comparison grid, all 8 algorithms, 12 MP | ≤ 1.5 s | — |
| Full-res Floyd–Steinberg export, 12 MP | ≤ 2 s | — |
| Initial JS, gzipped (worker excluded) | ≤ 60 KB | — |
| Worker, gzipped | report only | — |

## Market outcomes plan (Katy measures after launch)

- Indexed in Google within 7 days of Search Console submission.
- **Keyword family** (US, Keywords Everywhere, Nov 2026): "image dithering" (720 US / 2,400 global),
  "dither effect" (720, rising), "dithering effect", "halftone generator" (880, +46%, $1.46 CPC),
  "halftone effect", "dither image online" (320 global). Laser-specific phrasings show ~0.
- ≥ 100 Search Console impressions for the keyword family within 28 days.
- Ranking somewhere in the top 50 for "image dithering", "dither effect" or "halftone generator" by day 28.
- **Decision at 6 weeks:** < 100 impressions → stop and rethink. ≥ 100 impressions with any clicks →
  build the per-material pages, then the DXF converter.

## Later

- One landing page per material preset, generated from `presets.json`
- DXF / SVG export
- 1-bit PNG encoder, if the export benchmark needs it (review queue #11)
