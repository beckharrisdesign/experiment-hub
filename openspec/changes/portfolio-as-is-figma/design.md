# Design — portfolio-as-is-figma

## Context

beckharrisdesign.com is a Notion site published through Super. `super-css-control`
put its ~630 lines of custom CSS under version control, so the *rules* are diffable.
Nothing in the repo shows what those rules produce.

Rounds 01–02.5 built that picture by reading markup. Round 02.6 established that
markup is not sufficient: the homepage's left gutter is an **empty `.notion-column`**
with no text and no distinguishing class, invisible to a parser and visible only
once a browser computes the box model. Three further views were structurally wrong
for the same reason.

This design therefore has two halves: how geometry is obtained, and what the
capture asserts once it has it.

## Goals / Non-Goals

**Goals:**

- Build every canonical view frame from measured rendered layout
- Separate what a visitor can navigate to from what merely exists
- Make drift between capture and site fail a check rather than wait to be noticed
- Source tokens from the served stylesheet

**Non-Goals:**

- Redesigning anything. As-is means as-is, including the parts worth fixing.
- Changing the live site — the `sitemap.xml` findings are a separate change
- Pixel parity. Measured structure (padding, columns, grids, dividers) is the bar;
  glyph-level fidelity is not
- Modelling Notion content. Notion stays the system of record

## User flow / IA

**Navigation is authoritative; containment is recorded as a second attribute.**

This is the decision rounds 02.2 and 02.4 kept deferring, and it needs stating
because the two structures genuinely disagree twice:

| View | `parent-page__*` says | Navigation says | Capture follows |
|---|---|---|---|
| `/bhd-labs/mvds` | child of `/bhd-labs` | child of Labs index | agree |
| `/connected-china` | child of home | reached via Projects | **navigation** |
| `/for-babylist` | child of home | not linked at all | **navigation** |

A sitemap answers "what can someone get to, and how" — so navigation wins. The
`parent-page__*` value is still recorded on each node, because where they disagree
is itself a finding.

Three tiers:

1. **Tree** — eight views reachable through navigation
2. **Unlisted** — reachable only by direct link, in a separated zone, no connector
3. **Dead** — advertised in `sitemap.xml` but returning 404; recorded, not drawn

## Technical approach — the geometry extractor

`scripts/portfolio-capture/geometry.mjs`, using the `@playwright/test` Chromium
already in the repo for `scripts/capture-site-map.js`.

Per canonical route it records, at a fixed viewport:

- `.notion-root` box, so frame padding is measured rather than assumed
- every top-level block: class, x, width, height
- every `.notion-column` inside a block, **including empty ones** — this is the
  specific thing markup cannot give
- collection grids: template columns, gap, card and cover dimensions
- divider count and width

Output is JSON per route under `experiments/super-css-control/geometry/`. The
frames are generated from that file; nothing is hand-measured.

**Why this doubles as the staleness answer.** The recorded JSON is the baseline.
Re-running and diffing turns "the capture has drifted" from something noticed
months later into a non-zero exit naming the route and the changed numbers — which
is the open risk the proposal's Impact section names.

**Viewport.** One fixed desktop width for the baseline. Breakpoint variants come
from the three the CSS actually defines, not invented ones.

## Visual design / Figma

| Item | Value |
| --- | --- |
| Primary file URL | https://www.figma.com/design/Lqe4n3Ir7zWwnFLd01m9mN/portfolio-as-is-figma |
| As-is frame(s) | The whole capture is the as-is. `02.6 Proposed — Home rebuilt from measured geometry` (page `20:2`) is the first frame built from measurement; `01`–`02.5` are the inference-based series it supersedes. |
| Proposed frame(s) | **N/A — nothing on the live site changes.** This change produces an as-is capture; there is no proposed surface to pair against it. Recorded rather than left blank, per the board convention in `rules/figma.mdc`. |
| Libraries / version | **None by design.** MVDS is the hub's system; the portfolio runs on Super's theme. A local `portfolio tokens` collection is sourced from `public/super/site.css`. |
| Breakpoints | 1000px and 640px (§9 card row), 600px (§3 navbar) — the three the stylesheet defines. Baseline captured at desktop width. |
| Code Connect | N/A — the surface is Notion + Super, not a component codebase. |

### Round series

| Round | Page | What changed |
| --- | --- | --- |
| 01 | `02 Proposed` | Ten views as a row; tokens block |
| 02.1 | `02.1 …sitemap structure` | Tree from `parent-page__*`; flat |
| 02.2 | `02.2 …detail views re-parented` | Detail views under their sections; readable canvas |
| 02.3 | `02.3 …populated views` | Full-size frames, real scraped content |
| 02.4 | `02.4 …/for-* moved out` | `/for-*` to an unlisted zone |
| 02.5 | `02.5 …raw databases also unlisted` | Databases join it; unlisted ≠ private |
| 02.6 | `02.6 …measured geometry` | Home rebuilt from measurement; method corrected |

Rounds are never edited in place, per `rules/figma.mdc`.

## Open risks

- **The remaining nine frames are still inference-based.** Known wrong:
  `/katy-harris` (22 columns, 11 dividers — not stacked properties),
  `/bhd-consultation` (gallery + 23 columns — not a stacked list), `/bhd-labs/mvds`
  (no callouts). These are regenerated from extractor output, not patched.
- **Content is a point-in-time scrape.** Illustrative of density, not authoritative.
- **The extractor depends on Super's class names.** If Super renames
  `.notion-column`, extraction breaks loudly — which is preferable to the current
  failure mode of breaking silently.
