# Tasks — portfolio-as-is-figma

## 1. User outcomes (from spec scenarios)

- [x] 1.1 Extractor emits geometry for every canonical view
- [ ] 1.2 Every frame matches its measured geometry
- [ ] 1.3 Unlisted patterns sit outside the tree
- [ ] 1.4 A layout change fails the check
- [ ] 1.5 Token values match the served CSS

## 2. Prototype shell

No prototype app. The deliverables are a script in `scripts/portfolio-capture/`
and a Figma file; neither needs a dev server.

- [x] 2.1 Create `scripts/portfolio-capture/` and `experiments/super-css-control/geometry/`
- [x] 2.2 Confirm the repo's Playwright Chromium is usable without a fresh
      download (`scripts/capture-site-map.js` already depends on it); document the
      `npx playwright install chromium` fallback in the README

## 3. Implementation

**Geometry extractor**

- [x] 3.1 `geometry.mjs` — launch Chromium at a fixed desktop viewport, visit each
      canonical route, and record `.notion-root` box, every top-level block
      (class/x/width/height), every `.notion-column` **including empty ones**,
      collection grid template/gap/card/cover dimensions, and divider count/width
- [x] 3.2 Drive the route list from one shared module so the extractor, the frame
      generator and the drift check cannot disagree about what "canonical" means
- [x] 3.3 Write one JSON record per route to `experiments/super-css-control/geometry/`
- [x] 3.4 Fail loudly and name the route when a required selector is absent —
      silent partial extraction is the failure mode this change exists to end

**Frame generation**

- [~] 3.5 Generate the nine remaining frames from extractor output on a new
      numbered page, continuing the round series (never editing a built page)
- [ ] 3.6 Carry the measured left-gutter column through every view that has one,
      rendered so an empty column reads as deliberate
- [ ] 3.7 Rebuild the three views known to be structurally wrong from the
      extractor rather than patching them: `/katy-harris` (22 columns, 11
      dividers), `/bhd-consultation` (gallery + 23 columns), `/bhd-labs/mvds`
      (no callouts)
- [ ] 3.8 Reassemble the sitemap: eight views in the tree, `/for-*` and the raw
      databases in the unlisted zone, each annotated with why

**Drift check**

- [ ] 3.9 `check.mjs` — re-measure, diff against recorded geometry, exit non-zero
      naming route, block and changed numbers
- [ ] 3.10 Extend `scripts/super-css/check.mjs` so its markup-only checks say so,
      and point at the geometry check for layout

**Tokens**

- [ ] 3.11 Regenerate the `portfolio tokens` collection by parsing
      `public/super/site.css`, so token values cannot drift from the stylesheet

## 4. QA

- [ ] 4.1 Manual walkthrough: run the extractor → open the generated page → compare
      Home against the live site at the same width, checking the gutter, the five
      dividers and the 2×414 card grid
- [ ] 4.2 Automated smoke: geometry JSON exists for all ten routes and contains at
      least one empty-column record; drift check exits 0 against unchanged
      geometry and non-zero against a mutated fixture
- [ ] 4.3 Confirm the capture still asserts nothing about the live site — no
      request touches anything but GET, and `sitemap.xml` findings stay recorded
      rather than acted on

## Progress — 2026-09-24

**Done:** the extractor (`scripts/portfolio-capture/geometry.mjs`), the shared
route list (`routes.mjs`), the spec compactor (`to-figma.mjs`), and a generic
geometry-driven renderer on page `02.7`. Geometry captured for all 10 views.

**Generated so far (4/10):** projects, essay, labs-detail, database.

**Remaining:** generate home, consultation, about, labs, project-detail, curated
(3.5–3.7); reassemble the sitemap (3.8); drift check (3.9–3.10); tokens from CSS
(3.11); QA (§4).

### What measurement found that markup could not

| View | Inference said | Measurement says |
|---|---|---|
| `/all-projects` | 9 cards, 3 cols of 360 | **23 cards, 3 cols of 376px, gap 18** |
| `/bhd-labs/mvds` | prose + 3 callouts | **one properties layout, 526px tall, 0 callouts** |
| `/bhd-database` | a table | **a collection BOARD, 3503px tall** |
| `/katy-harris` | stacked properties | **43 blocks, 11 dividers, 0 properties** |
| `/bhd-consultation` | stacked service list | **31 blocks, 7 empty gutter columns, a gallery** |
| `/emotional-design…` | plain body column | **an empty 212px gutter on the RIGHT** |

Six of ten views were structurally wrong. The gutter device is not one pattern
but several — left on Home, right on the essay, seven of them on Consultation.

