# Dither & Halftone Generator: for designers and laser makers

*Working title (2026-11-11 scope update). Experiment slug: `image-dithering`. Earlier names: "Image Dithering for Laser Engraving", "Image to Laser".*

Give any image a dither or halftone effect, then download it for screen, print, or the exact millimetre size a laser needs. It runs entirely in the browser. It's the first test of whether a programmatic-SEO tool site for makers can rank.

**Status (2026-11-12): LIVE at <https://dither-halftone-generator.vercel.app>** (Vercel production). Ship gate passed on the live URL: Lighthouse mobile **100 / 100 / 100 / 100, LCP 860 ms, CLS 0** (median of 3 runs: 95, 100, 100). Next: submit to Search Console (checklist below). This is an autonomous build: see the review queue before trusting any default.

- **Founder intent + full brief:** [`docs/intent.md`](docs/intent.md)
- **Review queue:** [`docs/review-queue.md`](docs/review-queue.md)
- **OpenSpec:** [`openspec/changes/image-dithering-build`](../../openspec/changes/image-dithering-build)
- **Code:** [`prototype/`](prototype/), an Astro static site with one vanilla TypeScript island. It's a **standalone pnpm project with its own lockfile**, deliberately *not* a hub workspace member: Astro 7 brings Vite 8, and as a member it re-resolved the hub's own vitest onto Vite 8 and broke the hub's typecheck and deploy (PR #591, first CI run).
- **Live:** <https://dither-halftone-generator.vercel.app> · Vercel project `dither-halftone-generator` (team katy-beckharrisdes-projects). Not Git-connected: deploy with `bash experiments/image-dithering/prototype/scripts/deploy-vercel.sh` from Katy's terminal (the token is vault-only)
- **Notion row:** not created yet (review queue #5)

## Run locally

```bash
cd experiments/image-dithering/prototype
pnpm install --ignore-workspace      # its own lockfile; never the hub's
pnpm dev                             # http://localhost:4321
pnpm test                            # Vitest: engine, presets, URL state, variations (91 tests)
pnpm test:build                      # builds, then SEO / sitemap / robots / base path / JS budget (11 tests)
npx playwright test                  # builds, previews: flow, keyboard, axe, privacy (8 tests, Chromium)
npx playwright test -c playwright.bench.config.ts   # benchmarks → bench-results.json
node scripts/lighthouse.mjs          # ship gate against `npx astro preview --port 4329 --ignore-lock`
BASE_PATH=/dither SITE_URL=https://labs.beckharrisdesign.com npx astro build   # serve under a base path
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
- [x] Your go on round 02.4 ("Go, build Step 2"); [`design.md`](../../openspec/changes/image-dithering-build/design.md) written
- [x] Tests 14–18 red → green: red was 11 unit + 7/7 browser failing ([`step2-red.txt`](docs/test-runs/step2-red.txt)), green is 91 unit + 7/7 browser ([`step2-green.txt`](docs/test-runs/step2-green.txt)). 16 and 17 follow round 02.4's four-step flow (material picked in Export → Laser)
- [x] Web Worker wired; previews render at tile size × devicePixelRatio (pure 1-bit, checked in the browser), export full-res
- [x] Checked by hand in the browser pane: desktop flow (Halftone → fine-tune → Laser → Slate → URL + size line) and mobile 375 (2 columns, no sideways scroll)

### Step 3 — SEO + deploy
- [x] Tests 19–21 red → green: red 8 of 11 build tests failing ([`step3-red.txt`](docs/test-runs/step3-red.txt)); green 91 unit + 11 build + 8/8 browser ([`step3-green.txt`](docs/test-runs/step3-green.txt)). Test 21 (no image data on the network) passed on its first run: the page makes no requests after load
- [x] Title, meta description, canonical, Open Graph + a 1200×630 share image made by the engine, JSON-LD (WebApplication + FAQPage from the same data as the visible FAQ), sitemap.xml, robots.txt; base path configurable (`BASE_PATH`, tested)
- [x] GitHub Actions: [`image-dithering.yml`](../../.github/workflows/image-dithering.yml): unit + build tests, Playwright + axe, Lighthouse gate; path-filtered
- [x] Lighthouse mobile on the built site: **100 / 100 / 100 / 100, LCP 758 ms, CLS 0** (first run was 69 performance / CLS 0.077: the sample image was drawn on the main thread and the grid was injected after load; both fixed)
- [x] Initial JS ≤ 60 KB gz: **6.4 KB** (worker 2.1 KB, reported separately)
- [x] Benchmarks recorded below
- [x] Vercel project created and deployed to production, 2026-11-12 (Katy: "Yes, create and deploy"; run from her terminal because the token is vault-only and the Vercel connector can't create projects)
- [x] Live checks: every file returns 200, no `noindex`, the canonical points at itself, `robots.txt` lists the sitemap, and `?material=slate` reaches Export with Laser + Slate + Invert on and a clean console
- [x] Lighthouse on the live production URL: **100 ×4, LCP 860 ms, CLS 0** ([`lighthouse-live.json`](docs/test-runs/lighthouse-live.json))
- [ ] Submit to Search Console (checklist below)

## Benchmarks

Measured 2026-11-11 in Chromium (Playwright, desktop profile) on Katy's M1 MacBook (8 GB), through the real page and Web Worker, from the user's action to pixels on screen or a file ready. Script: [`tests/bench/bench.spec.ts`](prototype/tests/bench/bench.spec.ts). All three met, so no fix is needed. A slower phone CPU would be roughly 3–5× slower and still inside the slider and export budgets; that's not measured.

| Target | Budget | Measured |
| --- | --- | --- |
| Preview update after a slider change, 2 MP | ≤ 300 ms | **89 ms** (median of 5; includes the 60 ms input debounce) |
| Comparison grid, all 8 algorithms, 12 MP | ≤ 1.5 s | **467 ms** (upload → all 8 tiles painted, decode included) |
| Full-res Floyd–Steinberg export, 12 MP | ≤ 2 s | **502 ms** (click → PNG with pHYs ready; best of 3, worst 580 ms) |
| Initial JS, gzipped (worker excluded) | ≤ 60 KB | **6.4 KB** |
| Worker, gzipped | report only | **2.1 KB** |
| Lighthouse mobile (local build) | ≥ 95 ×4, LCP < 1.5 s, CLS < 0.05 | **100 ×4, LCP 758 ms, CLS 0** |
| **Lighthouse mobile (live URL, the ship gate)** | ≥ 95 ×4, LCP < 1.5 s, CLS < 0.05 | **100 ×4, LCP 860 ms, CLS 0** (median of 3) |

Earlier Node-only signal (no canvas or worker): 12 MP Floyd–Steinberg 231 ms; all 8 algorithms on a 12 MP source 373 ms.

## Market outcomes plan (Katy measures after launch)

- Indexed in Google within 7 days of Search Console submission.
- **Keyword family** (US, Keywords Everywhere, Nov 2026): "image dithering" (720 US / 2,400 global),
  "dither effect" (720, rising), "dithering effect", "halftone generator" (880, +46%, $1.46 CPC),
  "halftone effect", "dither image online" (320 global). Laser-specific phrasings show ~0.
- ≥ 100 Search Console impressions for the keyword family within 28 days.
- Ranking somewhere in the top 50 for "image dithering", "dither effect" or "halftone generator" by day 28.
- **Decision at 6 weeks:** < 100 impressions → stop and rethink. ≥ 100 impressions with any clicks →
  build the per-material pages, then the DXF converter.

## Submit to Search Console (after deploy)

1. ✅ Deployed to production: <https://dither-halftone-generator.vercel.app> (2026-11-12).
2. ✅ Live page checked: no `noindex`, the canonical points at itself, `/sitemap.xml` and `/robots.txt` load.
3. ☐ [Search Console](https://search.google.com/search-console) → Add property → **URL prefix** with the exact production URL.
4. ☐ Verify ownership with the HTML-tag method (Katy adds the meta tag), or by DNS if a custom domain is in use (ask first: DNS).
5. ☐ Sitemaps → submit `sitemap.xml`.
6. ☐ URL Inspection → paste the page URL → **Request indexing**.
7. ☐ Write the submission date in this README; day 7 = indexed check, day 28 = impressions + rank check, week 6 = decision.
8. ☐ If it lives under a base path on another host (e.g. `labs.beckharrisdesign.com/dither`), add `Sitemap: …/dither/sitemap.xml` to **that host's** root robots.txt (review queue #42).

## Later

- A real, rights-cleared sample photo in place of the procedural sphere (review queue #40)
- Preset export sizes for screen and print (Instagram, A4…) (review queue #41)
- Colour halftone (CMYK screens at separate angles)

- One landing page per material preset, generated from `presets.json`
- DXF / SVG export
- 1-bit PNG encoder, if the export benchmark needs it (review queue #11)
