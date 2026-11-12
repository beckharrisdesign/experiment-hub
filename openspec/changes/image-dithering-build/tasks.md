# Tasks: image-dithering-build

> §1 checkboxes are claims: ticked only with a dated receipt (test file, saved run, live check).
> Founder decisions and autonomous defaults live in
> [`experiments/image-dithering/docs/review-queue.md`](../../../experiments/image-dithering/docs/review-queue.md)
> (#1–#49), not here. Approved design: Figma round **02.4**
> (<https://www.figma.com/design/jillBCo0orNQPZJaCAx0g7>, page `18:11`). Test runs are saved under
> [`experiments/image-dithering/docs/test-runs/`](../../../experiments/image-dithering/docs/test-runs/).

## 1. User outcomes (from spec scenarios)

**Engine (`laser-dither-engine`)**

- [x] 1.1 Eight dither algorithms output only black and white — `engine.test.ts` (test 4, all eight), 2026-11-11 (`step1-red.txt` → `step1-green.txt`)
- [x] 1.2 Flat gray keeps its tone — `engine.test.ts` (test 5); Atkinson's 25% tolerance set to ±8% per the brief, measured 17.5% at 64² and 17.7% at 256² (review queue #15)
- [x] 1.3 Flat 50% gray at 45° with round dots inks 50% ± 3% — `halftone.test.ts`, 2026-11-11 (`halftone-red.txt` → `halftone-green.txt`); tone also held at 25/50/75% for every screen and dot shape
- [x] 1.4 The screen angle rotates the screen — `halftone.test.ts` (independent FFT in `tests/unit/fft.ts`: line screens at 0/15/45/75°, dot screens at 15/45°, within 3°)
- [x] 1.5 100 mm at 300 DPI is 1181 px and the PNG records 300 DPI — `engine.test.ts` (tests 1–2), `png-phys.test.ts` (tests 12–13, CRC checked against `node:zlib`); end to end in `flow.spec.ts` (download is 1181 × 886, pHYs 11811/11811/1); live export checked 2026-11-12
- [x] 1.6 Invert and mirror for slate and back-engraved acrylic — `engine.test.ts` (tests 9–10, mirror checked on every pixel for all eight), `halftone.test.ts` (mirror, invert in halftone mode)
- [x] 1.7 Previews and exports stay within budget — `tests/bench/bench.spec.ts`, Chromium on Katy's M1, 2026-11-11: slider → preview **89 ms** (2 MP, budget 300), 8 tiles **467 ms** (12 MP, budget 1.5 s), full-res FS export **502 ms** (12 MP, budget 2 s); numbers in the README

**Page (`laser-dither-page`)**

- [x] 1.8 Pick an effect from all eight, then fine-tune by picking — `flow.spec.ts` (8 tiles → pick → 4 variations), `variations.test.ts` (step halves each round); hand-checked in the browser pane 2026-11-11 (desktop + 375 px)
- [x] 1.9 Later steps stay locked until a pick — `flow.spec.ts` ("later steps stay locked")
- [x] 1.10 ?material=slate opens with invert on; unknown falls back — `url.test.ts` (test 15), `presets.test.ts` (test 14, ajv against the schema), `flow.spec.ts` (Slate → URL + invert; `?material=acrylic`); live 2026-11-12: `?material=slate` reaches Export with Laser + Slate + Invert on
- [x] 1.11 Whole flow by keyboard — `keyboard.spec.ts` (test 17)
- [x] 1.12 No axe violations — `a11y.spec.ts` (test 18, before and after load); a 4.34:1 MVDS muted-on-muted pair fixed locally (review queue #38) and upstream as draft beckharrisdesign/mvds#142
- [x] 1.13 No image data leaves the device — `privacy.spec.ts` (test 21: no requests after load, locally); `analytics.test.ts` (payload = `exportFor` + `mode` only); live 2026-11-12: captured `png_downloaded {"exportFor":"laser","mode":"halftone"}` and `/downloaded/laser-halftone`, both 200, nothing else
- [x] 1.14 The built page is complete for search — `tests/build/seo.test.ts` (tests 19–20 + base path + Search Console tag), `budget.test.ts` (initial JS 7.4 KB gz, worker 2.6 KB); live 2026-11-12: all files 200, no `noindex`, canonical self-referencing
- [x] 1.15 Lighthouse passes on the live URL — 2026-11-12, `https://dither-halftone-generator.vercel.app/`, median of 3 (95/100/100): **100 / 100 / 100 / 100, LCP 860 ms, CLS 0** (`docs/test-runs/lighthouse-live.json`); CI gate on the built site: green since `53ce73a`

## 2. Prototype shell

- [x] 2.1 Astro 7 static site + one vanilla TS island at `experiments/image-dithering/prototype/` — a **standalone pnpm project** (`pnpm install --ignore-workspace`, own lockfile, own empty `postcss.config.mjs`); not a hub workspace member, because Astro 7's Vite 8 broke the hub's typecheck when it was one (review queue #1)
- [x] 2.2 Dev: `cd experiments/image-dithering/prototype && pnpm dev` (port 4321); launch config `image-dithering` in `.claude/launch.json`
- [x] 2.3 Test first throughout: every step's red run is saved before its implementation (`step1-red`, `halftone-red`, `step2-red`, `step3-red`, `analytics-red`, `analytics-v2-red`)

## 3. Implementation

- [x] 3.1 **Engine** (`src/engine/`): pipeline, data-driven kernels, Bayer, threshold, mm/DPI sizing, pHYs injection — commits `0a0f056`, `695a997`
- [x] 3.2 **Halftone** (`src/engine/halftone.ts`): spot functions + rank table; same pipeline via `prepareGray` — `9b7a53f`
- [x] 3.3 **Figma rounds** 02 → 02.4 on MVDS Core, with real engine output in every tile; 02.4 approved ("Go, build Step 2") — `design.md`
- [x] 3.4 **Page** (Step 2): stepped flow, Dither/Halftone switch, fluid grid, fine-tune variations, export for screen or laser, presets + schema, Web Worker — `a2b424f`
- [x] 3.5 **SEO + CI** (Step 3): canonical, OG + engine-made share image, JSON-LD, sitemap, robots, base path; path-filtered workflow with Lighthouse gate — `70e71f8`; CI hardening `c901516`, `a3f4c7c`, `0fb5021`, `2055c90`
- [x] 3.6 **Deploy**: Vercel project `dither-halftone-generator`, production since 2026-11-12 via `scripts/deploy-vercel.sh` (vault token, Katy's terminal)
- [x] 3.7 **Analytics**: cookieless Vercel Web Analytics; `png_downloaded {exportFor, mode}` + `/downloaded/<exportFor>-<mode>` page-view fallback — `2bb9289`, `28068e9`
- [x] 3.8 **Search Console**: verification tag (`ee3d0fd`), verified, sitemap submitted 2026-11-12 (day 0)

## 4. QA

- [x] 4.1 Automated: 95 unit (Vitest) + 12 build-output + 8 browser (Playwright: flow, keyboard, axe, privacy) + benchmarks + Lighthouse gate, all green in CI on PR #591 at `0f9c1e8` (12 passed, 2 skipped; read 2026-11-12)
- [x] 4.2 Walkthrough in the browser pane (Claude), 2026-11-11 and live 2026-11-12: Halftone → pick → fine-tune → Laser → Slate → download, desktop and 375 px; clean console
- [ ] 4.3 **Katy:** the downloaded PNG imports into **LightBurn** and **xTool Creative Space** at the size set in mm
- [ ] 4.4 **Katy:** one test burn per material preset on the M1 Ultra; tune `src/data/presets.json` from the results
- [ ] 4.5 **Katy:** Request indexing in Search Console (hit the daily quota 2026-11-12; Notion task due 2026-11-13)
