## 1. User outcomes (from spec scenarios)

`portfolio-header`

- [ ] 1.1 **Navbar shrinks once the reader scrolls**: a reader who scrolls
      past the top sees the bar settle at 56px, with the logo, links and
      "Book a 30m call" stepped down to fit.
- [ ] 1.2 **Navbar grows back at the top**: scrolling back to the top
      returns the bar to 80px.
- [ ] 1.3 **Reduced motion swaps height without animating**: with reduced
      motion on, the bar changes between 80px and 56px instantly.
- [ ] 1.4 **Consulting page highlights Consulting**: on Consulting, its nav
      link is full strength and underlined, and the others are not.
- [ ] 1.5 **A case study highlights Projects**: on any case study, Projects
      shows as the current section.
- [ ] 1.6 **Top-level pages show no breadcrumb**: Consulting, Labs, About
      and Projects start straight under the navbar, with no breadcrumb bar.

`portfolio-hero`

- [ ] 1.7 **Homepage title is larger than any subpage title**: the
      homepage title is visibly bigger than any subpage title at the same
      width.
- [ ] 1.8 **The hero holds the title alone**: the homepage hero shows the
      title over its art; the intro paragraph and the button follow
      directly below it. (Was "one supporting line" until 2026-11-17;
      Katy moved the full intro below the hero instead.)
- [ ] 1.9 **A "Book a 30m call" button is in the first phone screen**: at
      390×844 one ends at or above 600px; the navbar's counts.
- [ ] 1.10 **Hero art is anchored to the content grid, behind the content**:
      the hero runs full width in its colour. The art sits
      behind the text at 150% of the hero's height, centred on the gutter
      between columns 2 and 3, and clipped to the hero. Nothing is added
      to the art.
- [ ] 1.11 **Hero text stays readable over the art**: title, line and
      button label each hold at least 4.5:1 against whatever is behind
      them.
- [ ] 1.12 **Hero art never moves the intro or the button**: at 390×844
      the intro and the button sit where they would without the art.
- [ ] 1.13 **Swapping the visual needs no pull request**: Katy replaces
      the hero image in Notion, and the live hero shows it with no change
      to `public/super/`.
- [ ] 1.14 **No image yet shows the plain hero, not a placeholder**:
      with no image in Notion, the hero shows only its colour behind the
      text: no pattern, no empty box, no broken image. (Was a dot pattern
      until 2026-11-17; Katy asked for it to go.)
- [ ] 1.15 **Consulting hero sits on a band**: Consulting and About, and
      case studies narrower than 1024px, open on a full-width band that
      ends before the first body section.
- [ ] 1.16 **Case study cover fills the hero behind a text card**: on a
      case study with a cover, at 1024px and wider, the cover fills a
      hero at least 480px tall, one 1920px image centred and tiled
      sideways on wider screens, the title, properties and
      summary sit on a card in the hero colour, and the title starts in
      the first screen.
- [ ] 1.17 **Case study without a cover shows no empty box**: no empty
      cover box is drawn; on desktop the card sits on the placeholder
      colour, and on a phone the title starts at the top of the band.
- [ ] 1.18 **Case study cover sits above the title on narrower screens**:
      below 1024px the cover runs full width above the title at 39:20.

## 2. Prototype shell: preview and measure against the live site

The site is Super rendering Notion, so there is no local copy of the
pages. The shell loads the live pages in Playwright and swaps in the
local files, which makes every check runnable before a merge.

- [x] 2.1 `scripts/super-css/preview.mjs`: opens beckharrisdesign.com
      pages in Playwright (Chromium). When `--local` is set, it routes
      `labs.beckharrisdesign.com/super/site.css` and `/super/components*`
      to the files in `public/super/`. Pages: `/`, `/bhd-consultation`,
      `/bhd-labs`, `/katy-harris`, `/rebuilding-a-design-function`, plus
      one Labs sub-page (`/bhd-labs/experiment-hub`). Viewports: 1440×900,
      1024×768 and 390×844. A `/super/*` file missing from the repo fails
      the run instead of falling back to the live file.
- [x] 2.2 `scripts/super-css/measure-hero.mjs`: rebuilds the as-is
      measurement script that was never committed (described in
      `docs/portfolio-feedback-2026-11/README.md` §4). It adds one check
      per §1 outcome and prints a pass / fail table:
      - navbar height at the top and after 1200px of scroll;
      - `aria-current` and the computed underline;
      - whether the breadcrumb is present;
      - H1 sizes, homepage against a subpage;
      - the CTA's bottom at 390×844;
      - the art's box against the hero box (height ratio 1.5 ±0.02, and
        centre x on the column 2/3 gutter ±4px);
      - contrast sampled under the title, line and button;
      - whether a cover box exists without a cover.
- [x] 2.3 Run `measure-hero.mjs` against the live site as it is today.
      Check that every "Fails until" line in the specs fails, and save the
      table as `docs/portfolio-feedback-2026-11/to-be/before.json`. This is
      the failing test the change ships against.
- [x] 2.4 Add `npm run super:preview` and `npm run super:measure` (both
      take `--local`).

## 3. Implementation

Write the tests first, and see them fail before the code that passes them.

- [x] 3.1 jsdom tests in `tests/scripts/super-chrome.test.ts`, failing
      first:
      - the compact class goes on past `scrollY` 80 and comes off at the
        top;
      - the `aria-current` mapping across 8 `<main>` class sets: homepage,
        all-projects, Consulting, Labs, a Labs sub-page, About, a case
        study, and a grandchild with no match (all-projects dropped in
        3.17, leaving 7);
      - the mapping re-applies after a simulated client-side navigation;
      - `--hero-top` and `--hero-h` are set only on a case study with a
        cover.
- [x] 3.2 `public/super/components/loader.js`, with the behaviour in a new
      sibling module `components/chrome.js`:
      - compact class on `<html>` from a passive `scroll` listener and
        `requestAnimationFrame`;
      - `aria-current="page"` from the class mapping (design.md decision
        4), re-run on the existing `MutationObserver` pass;
      - case-study hero measuring with a `ResizeObserver`.
      Bump `VERSION` from 6 to 7 in `loader.js` and `components.js`.
- [x] 3.3 `site.css` §1 tokens:
      - the portfolio as an MVDS brand preset under MVDS names
        (`--background` … `--primary-1…5`, `--font-heading`,
        `--font-sans`);
      - `--hero-bg` `#2F3636`;
      - `--home-display-size` as a `clamp()`, 48 → about 86px;
      - `--hero-accent`.
      Rename the existing `--accent` (bare RGB) to `--accent-rgb` across
      the file, and point `--callout-bg` at `var(--muted)`.
- [x] 3.4 §3 Navbar:
      - the compact state: 56px high with a 24px margin, so the content
        doesn't jump; `--navbar-height`; 16px type; a 40px button;
        200ms ease-out; and none under `prefers-reduced-motion`;
      - current-link styles (full `--foreground`, a 2px underline at a 6px
        offset; others at 75%);
      - breadcrumb hidden on `.parent-page__index` and
        `.page__all-projects` (the latter removed in 3.17).
- [x] 3.5 §4 Homepage hero (`.page__index .notion-root >
      .notion-column-list:first-child`):
      - a 62 / 38 column split (on 2026-11-17: two of three grid columns,
        770px at 1440, per Katy's frame `55:72`);
      - the display size and accent rule (rule removed 2026-11-17, `55:72`);
      - sharp art: `chrome.js` `fitArtSizes` rewrites the image's `sizes`
        from Notion's "6vw" to its drawn width (added 2026-11-17);
      - a 24px / 18px supporting line;
      - full-width `--primary-1` band;
      - art in column 2 placed by design.md decision 11: `height: 150%`,
        `left: calc((100% - 2rem) * 2 / 3 + 1.5rem)`, translate −50% /
        −50%, `clip-path: inset(calc(100% / 6) 0)`;
      - the dot pattern when column 2 has no image (removed 2026-11-17,
        Katy's call: the hero shows its colour alone).
- [x] 3.6 §4 Subpage band:
      - the `border-image` band per hero block in `--card` (Consulting and
        About: blocks before the first divider, plus About's header
        content);
      - the first divider hidden;
      - padding 64px on desktop and 48px on a phone, and a 32px gap before
        the body.
- [x] 3.7 §4 Case study:
      - the hero block set (with the slug list beside §4's, comment
        included);
      - with a cover: band `--hero-bg`, the cover placed from
        `--hero-top` / `--hero-h` on the same gutter rule, a 668px text
        column, and Katy's properties cells (design.md decision 15);
      - with no cover: `.no-cover` set to 0;
      - on a phone: the cover above the title at 16:9.
- [x] 3.8 §2 guard: confirm `overflow-x` clipping covers art that runs
      past the right edge of the viewport, at 1024 and 1440. It didn't:
      on `<html>` the clip becomes `hidden` on the viewport, which still
      pans. `main.super-content` now clips too, and nothing scrolls
      sideways at 1440, 1024 or 390.
- [x] 3.9 Run `npm test`, and `npm run super:measure -- --local` at all
      three viewports, until every §1 check passes.

- [x] 3.13 Case-study hero to Katy's final frame (`55:328` / `55:353`,
      design.md decisions 15–16, 2026-11-17):
      - §4: the cover fills a hero at least 480px tall behind a card in
        `--hero-bg`, painted per block; four equal property cells with no
        dividers; the `--accent` placeholder when there is no cover; below
        1024px the band stays and the cover sits above the title at 39:20;
      - §1: `--text-h1-size` (36) and `--text-caption-size` (12, a
        portfolio gap);
      - `chrome.js`: measures every case study that §4 marks with
        `--bhd-hero: card`, marks it `cover` or `plain`, and sets the mark
        before measuring, so a cover lifted out of the flow isn't counted;
      - tests rewritten for the marker, the plain state and the
        cover → no-cover change; `VERSION` 7 → 8;
      - `measure-hero.mjs`: 1.15–1.17 rewritten and 1.18 added.
      Local run: 14 pass, 0 fail, 3 waiting on Notion, 1 manual.

**Content, in Notion (Katy):**

- [x] 3.10 In Notion, drag the intro paragraph and the "Book a 30m call"
      button out of the hero's left column, to just below the two-column
      block (above the synced block). The paragraph stays as written.
      (Was "shorten to one line" until 2026-11-17. The button can't be
      moved through Notion's API: it reads as an unknown block, and
      rewriting the column would delete it.) Done by Katy; live check 1.8
      passes on 2026-11-18.
- [x] 3.11 Put the hero art as an image block in column 2 of the homepage
      hero. (Live 2026-11-17: check 1.12 passes, and text contrast over
      the art is 6.51–6.61:1.)
- [ ] 3.11a Re-upload the homepage art at 3840px wide (the `hero-art/home`
      export preset). The file in Notion is 1200px, softer than the
      ~1,440px it is drawn at, so check 1.10 reads `content` until this
      is done. (2026-11-18: with the intro moved out, the art is drawn
      1,208px wide, so the 1200px file passes 1.10 at 1x. A Retina screen
      still wants ~2,400px, so the re-upload is still worth doing.)
- [ ] 3.12 Set covers on the case studies that have a project visual.
      Export each from Figma page 05 (`hero-art/<slug>`, preset to PNG at
      3840px wide) and set it as that page's cover. First check whether the
      Rebuilding image (lightsabers) belongs to that project.
- [ ] 3.14 Case-study page layout in Notion: show **Company** where
      **Reported to** is today (Katy's frame `55:328`).
- [x] 3.16 Consulting band seam and a 500px minimum hero on Consulting and
      Labs, matching Home and About (design.md decision 21). Measured at
      1440: Consulting 370 → 500px, Labs 351 → 500px, line gone; phones
      unchanged. `fillTopHero()` has six tests (38 in all).
- [x] 3.17 Drop the All Projects page from the styles (Katy removed the
      view on 2026-11-19, and its link now goes to the homepage):
      `.page__all-projects` out of `site.css` and the nav-link mapping in
      `chrome.js`, `/all-projects` out of `check.mjs`'s routes, and its
      row out of the nav-link test. Loader v12. Also the Labs score-pill
      rule from #537 (`.notion-property__number`): the Labs table has no
      score column any more (Katy, 2026-11-20).

## 4. QA

- [x] 4.1 Automated smoke: `npm test` is green, and the new jsdom tests run
      in CI.
- [x] 4.2 Before merge: `npm run super:measure -- --local` passes every
      §1 check at 1440×900, 1024×768 and 390×844. In the PR, show one
      screenshot (homepage, 1440) and put the rest in a collapsed
      `<details>`.
- [x] 4.3 After merge and deploy (2026-11-17, #595 merged):
      - the served `site.css`, `components.js`, `loader.js` and
        `chrome.js` match `main` byte for byte;
      - `node scripts/super-css/check.mjs`: in sync. It first reported
        `--hero-h` / `--hero-top` (set at runtime by `chrome.js`, so now
        listed as self-defined) and `.page__katy-harris` (About wasn't a
        sampled route; it is now). Two misses remain, neither from this
        change: `.page__all-projects` (`/all-projects` now redirects to
        `/`, so that page class no longer exists) and
        `.notion-property__number` (#537's Labs score pill, on a table
        no sampled route shows). Both rules were removed in 3.17;
      - `npm run super:measure` against the live site
        (`to-be/after.json`): 14 pass, 0 fail, 3 waiting on Notion
        (3.10, 3.11), 1 manual. Same as the branch measured before merge.
        This file is a snapshot of #595 as deployed. The touch-ups in #596
        (homepage text width, no dot pattern, sharp art) aren't live until
        it merges; 4.6 reruns it then.
- [ ] 4.4 Manual walkthrough on the live site, at 1440 and on a phone:
      - scroll each page and watch the bar shrink and grow back;
      - turn on reduced motion and repeat;
      - click between pages, without reloading, to check that the current
        link follows;
      - check that VoiceOver reads "current page" on the active link;
      - swap the homepage art in Notion and see it live without a PR;
      - remove it and see the plain hero (no pattern since 2026-11-17).
- [ ] 4.5 Compare the live site with Figma page 04 row A (navbar), page
      04.2 (homepage hero) and page 05 `55:328` / `55:353` (case-study
      hero) at 1440 and 390, and note any differences in the PR. Known:
      the card's 2px corner radius isn't drawn (each block paints its own
      slice, so there is no single box to round).
- [x] 4.6 After #596 merges and deploys, rerun `npm run super:measure`
      against the live site and replace `to-be/after.json`, so the saved
      result includes the touch-ups (plain hero for 1.14, the art-size
      check in 1.10, the art now in Notion for 1.12).
      Done 2026-11-17, after Deploy Hub finished and the served files
      matched `main`: 13 pass, 1 fail, 3 waiting on Notion, 1 manual.
      Rebuilding now has a real cover, which showed two things:
      - **A real bug, fixed in this PR:** with a cover, Super adds 48px
        above the title (`.has-cover.no-icon .notion-header__title-wrapper`).
        It made the desktop card 340px instead of 292px, and the phone gap
        under the cover 64px instead of 16px. §4 now zeroes it on case
        studies. Check 1.18 now requires a gap of 24px or less, which is
        why it fails live until this ships.
      - **A check bug, fixed:** 1.17 assumed the case study had no cover.
        It now removes the cover itself, and 1.16 / 1.18 use the page's own
        cover when there is one.
      This branch measures 14 pass, 0 fail.
- [x] 4.7 After this follow-up merges and deploys, rerun the live
      measurement into `to-be/after.json` and confirm 1.18 passes.
      Done 2026-11-18 after #597 deployed, with the served files matching
      `main`: 17 pass, 0 fail, 0 waiting on Notion, 1 manual (1.13).
      `check.mjs` is in sync with 29/29 variables; the two old selector
      misses remain (see 4.3).
- [x] 4.8 After #601 (cover tiled past 1920px) deploys, rerun the live
      measurement into `to-be/after.json` and confirm 1.16 sees the tiles.
      Done 2026-11-18, with the served files matching `main`: 17 pass,
      0 fail, 1 manual (1.13). At 2560, 1.16 reads "tiled 1920px 1081px
      repeat-x", full width, image hidden. Known: the tiles meet at a
      visible seam, because the art isn't drawn to repeat.
- [x] 4.9 After #604 (Consulting seam, 500px Consulting and Labs heroes)
      deploys, rerun the live measurement and check the hero heights.
      Done 2026-11-19, with the served files matching `main`: 17 pass,
      0 fail, 1 manual (1.13), the same readings as 4.8. Hero heights,
      measured the way `fillTopHero` does: Consulting 501px and Labs
      500px at 1440, 500px and 501px at 1920. No fill on phones, and
      1.15 still finds Consulting's band unbroken (46px to the body).
- [x] 4.10 After #606 (All Projects and the Labs score pill removed)
      deploys, rerun the live check and measurement. Done 2026-11-20, with
      the served files matching `main`: `check.mjs` in sync, 67/67
      selectors present; the only misses are `--hero-cover-url` and
      `--hero-cover-tile`, which #603 lists as self-defined. Measurement:
      17 pass, 0 fail, 1 manual (1.13); nav highlight and breadcrumbs
      (1.4–1.6) unchanged.
