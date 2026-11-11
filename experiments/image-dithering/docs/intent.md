# Image Dithering for Laser Engraving — Founder intent

> "I want to experiment with an autonomous product experiment again, where we use the shared
> services of the hub and MVDS and secret sharing to make progress."
> — Katy, 2026-11-11 (Claude Code session)

> "Yes, in the hub"
> — Katy, 2026-11-11, approving the plan: an Astro app inside the hub repo, MVDS through
> `tokens.css` only, hub rails (OpenSpec, review queue, CI, PRs), its own Vercel project.

The brief, as she brought it (verbatim):

---

# Build: Image Dithering for Laser Engraving (v1, ~3-hour timebox, test-first)

## Context
I'm Katy, a product designer / frontend dev and laser maker (xTool M1 Ultra). I'm testing whether a
programmatic-SEO tool site for makers can rank. This page is the first experiment. Keyword research
(Keywords Everywhere, Nov 2026):
- "image dithering": 2,400/mo global, 720/mo US, difficulty 60/100 (Medium), no advertisers.
  The #1 result is a DA 11 site; ditherimage.online (DA 15) is #4; LaserGRBL's dithering page is #8.
- "dither image online": 320/mo global.
The goal of v1 is NOT revenue. It's a live, indexable, genuinely useful page I can submit to Search
Console and measure. Ship small, ship today.

## What to build
A single-page, fully client-side tool: upload a photo → dither it for laser engraving → download a
PNG at the exact physical size.

### Engine (runs in the browser, in a Web Worker)
- Pipeline: decode → grayscale (luma) → brightness / contrast / gamma → optional invert → optional
  horizontal mirror → resample to target size → dither → 1-bit output.
- Algorithms: Floyd–Steinberg, Atkinson, Jarvis-Judice-Ninke, Stucki, Sierra Lite, Bayer 4×4,
  Bayer 8×8, threshold. Error-diffusion kernels with a serpentine-scan toggle.
- Implement the kernels as a small data-driven table (weights + divisor), not copy-pasted loops.
- Output size: width/height in mm (lock aspect) + DPI → exact pixel dimensions.
- Export a PNG with a correct pHYs chunk so LightBurn / xTool Creative Space import it at the right
  physical size (canvas.toBlob does not write DPI, so inject the chunk yourself).
- Previews use a downscaled image for speed; export runs at full resolution.

### The unique value (this is the point of the page)
- A comparison grid: the user's photo dithered with every algorithm side by side, click one to select it.
- Material preset chips that set starting values and are reflected in the URL (e.g. ?material=slate):
  - Wood: Jarvis, slight gamma lift
  - Slate: invert ON, higher contrast
  - Acrylic (back-engrave): mirror ON, invert ON
  - Glass: lower DPI, coarser algorithm
  - Leather: compressed dark range
  Label all preset values in code as STARTING POINTS for me to tune on the machine.
- Keep presets in one data file (src/data/presets.json) with a schema, shaped so a future build can
  generate one landing page per preset.

### Page design (I'm a designer; keep it clean and restrained)
- Above the fold: a drop zone (click, drag and paste), material chips, a large preview, the
  comparison grid, and a download button. The tool is the page.
- Below the fold: a short plain-English explainer (what dithering is, which algorithm suits which
  material, why slate needs invert and acrylic needs mirror), then 4–6 FAQs.
- Trust line near the tool: "Your images never leave your device."
- No accounts, no modals, no cookie banner. Works on mobile.

### SEO / technical
- Static output. Astro is preferred, with the tool as a single vanilla TypeScript island. If you think
  plain Vite is clearly better for v1, say why before starting.
- <title>, meta description, canonical, Open Graph + share image, JSON-LD describing the tool as a
  free web app, sitemap.xml, robots.txt.
- H1 and copy written for people first: target "image dithering" / "dither an image for laser
  engraving" naturally, with no keyword stuffing.
- Base path configurable (it may live at labs.beckharrisdesign.com/dither or on its own domain later).

## Test-first workflow (required)
For every step: write the tests first, run them, and show me the failing (red) output BEFORE writing
the implementation. Then implement until green and show the passing output.
- Never weaken, skip or delete a test to make it pass. If you think a test is wrong, stop and tell me why.
- Unit tests: Vitest. Browser tests: Playwright. Accessibility: axe (via @axe-core/playwright).
- Use small fixed fixtures (tiny arrays, a few committed test images). Tests must be deterministic.

### Step 1 tests: engine (Vitest), write these first
1. mmToPx(100, 300) === 1181 and mmToPx(25.4, 300) === 300.
2. Aspect lock: a 4000×3000 source at width 100 mm gives height 75 mm.
3. Threshold at 128 on [0, 127, 128, 255] → [0, 0, 255, 255].
4. Every output pixel is exactly 0 or 255, for every algorithm.
5. Tone preservation: a flat 64×64 image at 50% gray → white-pixel share within 50% ± 2% for each
   error-diffusion algorithm; at 25% gray → 25% ± 2%. (Atkinson may drift more; if so, set its
   tolerance explicitly in the test with a comment.)
6. Bayer 4×4 on a flat 50% gray 64×64 image → exactly 50% white.
7. Determinism: same input + settings → identical output (compare a hash).
8. Identity: gamma 1.0, brightness 0 and contrast 0 leave the grayscale input unchanged.
9. Invert: flat 25% gray with invert ON → 75% ± 2% white after Floyd–Steinberg.
10. Mirror: output pixel (0, y) equals the unmirrored output's pixel (w−1, y).
11. Serpentine ON vs OFF give different output on a horizontal gradient (proves the toggle is wired).

### Step 1 tests: PNG export (Vitest)
12. 300 DPI writes a pHYs chunk with 11811 pixels per meter on both axes, unit = 1 (meter).
13. The pHYs chunk sits before the first IDAT, its CRC is valid, and the file still decodes with the
    same pixel dimensions.

### Step 2 tests: presets + UI (Vitest + Playwright)
14. Every entry in presets.json validates against the schema.
15. ?material=slate loads with invert ON; ?material=acrylic loads with mirror + invert ON; an unknown
    material falls back to the default without errors.
16. E2E: upload a fixture photo → the comparison grid shows 8 thumbnails → clicking the slate chip
    updates the URL → Download produces a PNG with the expected pixel size and 300 DPI in pHYs.
17. Keyboard-only: the full flow (upload via the file input, choose a preset, choose an algorithm,
    download) works without a mouse.
18. axe reports 0 violations on the page, before and after an image is loaded.

### Step 3 tests: build output (Vitest against the built HTML)
19. The built page has a title (≤ 60 chars), a meta description (120–160 chars), a canonical URL,
    exactly one H1, and JSON-LD that parses as valid JSON.
20. sitemap.xml includes the page URL; robots.txt references the sitemap.
21. No network request is made with image data (Playwright: watch requests during upload + export).

## Measurable outcomes
### Ship gate (must all pass before you call v1 done)
- All tests above green in CI (add a GitHub Actions workflow running unit + e2e).
- Lighthouse mobile on the deployed preview: ≥ 95 in Performance, Accessibility, Best Practices, SEO.
- LCP < 1.5 s and CLS < 0.05 on the Lighthouse mobile run.
- Initial JS ≤ 60 KB gzipped (worker excluded; report the worker size separately).
- Benchmarks (run a script and report the actual numbers in the README):
  - Preview updates within 300 ms of a slider change on a 2 MP image.
  - The comparison grid (all 8 algorithms) renders within 1.5 s for a 12 MP photo.
  - Full-resolution Floyd–Steinberg export of a 12 MP photo finishes within 2 s.
  If a benchmark misses, report by how much and propose the fix. Don't silently relax the target.

### Manual check (Katy)
- The downloaded PNG imports into LightBurn and xTool Creative Space at the size set in mm.
- One test burn per material preset on the M1 Ultra; I'll log results and tune presets.json.

### Market outcomes (Katy measures after launch; put this plan in the README)
- Indexed in Google within 7 days of Search Console submission.
- ≥ 100 Search Console impressions for the dithering keyword family within 28 days.
- Ranking somewhere in the top 50 for "image dithering" by day 28.
- Decision at 6 weeks: < 100 impressions → stop and rethink; ≥ 100 impressions with any clicks →
  build the per-material pages, then the DXF converter.
- If I approve cookieless analytics (ask me; don't add it unasked), track one event: PNG downloaded.

## How to work
1. Start with a short plan and file structure. Wait for my OK before writing code.
2. Build in three steps (engine → presets + UI → SEO + deploy). At each step, show red test output,
   then green, then stop for a quick check-in.
3. Commit in small, clearly named steps. Keep a running checklist in the README.
4. Ask before: creating the GitHub repo (my handle is katybeck), deploying to Vercel, adding any
   analytics, or touching any domain or DNS settings.

## Out of scope for v1
Accounts, payments, server-side processing, AI features, the per-material landing pages, DXF/SVG
export. Note good ideas in the README's "Later" section rather than building them.

## Done means
Every item in the Ship gate passes, the app is deployed to a Vercel preview URL, and the README has
the benchmark numbers, the market-outcomes plan, and a "Submit to Search Console" checklist.
