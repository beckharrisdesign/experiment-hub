# Tasks — portfolio-as-is-figma

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Extractor emits geometry for every canonical view
- [ ] 1.2 Every frame matches its measured geometry
- [ ] 1.3 Unlisted patterns sit outside the tree
- [ ] 1.4 A layout change fails the check
- [ ] 1.5 Token values match the served CSS

## 2. Prototype shell

No prototype app. The deliverables are a script in `scripts/portfolio-capture/`
and a Figma file; neither needs a dev server.

- [ ] 2.1 Create `scripts/portfolio-capture/` and `experiments/super-css-control/geometry/`
- [ ] 2.2 Confirm the repo's Playwright Chromium is usable without a fresh
      download (`scripts/capture-site-map.js` already depends on it); document the
      `npx playwright install chromium` fallback in the README

## 3. Implementation

**Geometry extractor**

- [ ] 3.1 `geometry.mjs` — launch Chromium at a fixed desktop viewport, visit each
      canonical route, and record `.notion-root` box, every top-level block
      (class/x/width/height), every `.notion-column` **including empty ones**,
      collection grid template/gap/card/cover dimensions, and divider count/width
- [ ] 3.2 Drive the route list from one shared module so the extractor, the frame
      generator and the drift check cannot disagree about what "canonical" means
- [ ] 3.3 Write one JSON record per route to `experiments/super-css-control/geometry/`
- [ ] 3.4 Fail loudly and name the route when a required selector is absent —
      silent partial extraction is the failure mode this change exists to end

**Frame generation**

- [ ] 3.5 Generate the nine remaining frames from extractor output on a new
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
