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
- [ ] 1.8 **One supporting line under the title**: the homepage hero shows
      the title, one short line and the button, with no paragraph.
- [ ] 1.9 **Call to action is in the first phone screen**: at 390×844 the
      "Book a 30m call" button ends at or above 600px.
- [ ] 1.10 **Hero art is anchored to the content grid, behind the content**:
      the hero runs full width in its colour. The art sits
      behind the text at 150% of the hero's height, centred on the gutter
      between columns 2 and 3, and clipped to the hero. Nothing is added
      to the art.
- [ ] 1.11 **Hero text stays readable over the art**: title, line and
      button label each hold at least 4.5:1 against whatever is behind
      them.
- [ ] 1.12 **Call to action stays in the first phone screen with art behind it**:
      at 390×844, with art in place, the button still ends at
      or above 600px.
- [ ] 1.13 **Swapping the visual needs no pull request**: Katy replaces
      the hero image in Notion, and the live hero shows it with no change
      to `public/super/`.
- [ ] 1.14 **No image yet shows a built-in pattern, not an empty half**:
      with no image in Notion, the art's box shows a dot pattern, never an
      empty area or a broken image.
- [ ] 1.15 **Consulting hero sits on a band**: Consulting, About and case
      studies open on a full-width band that ends before the first body
      section.
- [ ] 1.16 **Case study cover is hero art on the content grid**: on a case
      study with a cover, at 1024px and wider, the cover sits behind the
      title, properties and summary under the same 150% / gutter rule,
      and the title starts in the first screen.
- [ ] 1.17 **Case study without a cover shows no empty box**: no empty
      cover box is drawn, and the title starts at the top of the band.

## 2. Prototype shell: preview and measure against the live site

The site is Super rendering Notion, so there is no local copy of the
pages. The shell loads the live pages in Playwright and swaps in the
local files, which makes every check runnable before a merge.

- [x] 2.1 `scripts/super-css/preview.mjs`: opens beckharrisdesign.com
      pages in Playwright (Chromium). When `--local` is set, it routes
      `labs.beckharrisdesign.com/super/site.css` and `/super/components*`
      to the files in `public/super/`. Pages: `/`, `/bhd-consultation`,
      `/bhd-labs`, `/katy-harris`, `/rebuilding-a-design-function`, plus
      one Labs sub-page. Viewports: 1440×900, 1024×768 and 390×844.
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
        study, and a grandchild with no match;
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
        `.page__all-projects`.
- [x] 3.5 §4 Homepage hero (`.page__index .notion-root >
      .notion-column-list:first-child`):
      - a 62 / 38 column split;
      - the display size and accent rule;
      - a 24px / 18px supporting line;
      - full-width `--primary-1` band;
      - art in column 2 placed by design.md decision 11: `height: 150%`,
        `left: calc((100% - 2rem) * 2 / 3 + 1.5rem)`, translate −50% /
        −50%, `clip-path: inset(calc(100% / 6) 0)`;
      - the dot pattern when column 2 has no image.
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

**Content, in Notion (Katy):**

- [ ] 3.10 Shorten the homepage hero copy to one supporting line, and move
      the current 70-word paragraph to About.
- [ ] 3.11 Put the hero art as an image block in column 2 of the homepage
      hero. Use the diamond placeholder until the final art is ready.
- [ ] 3.12 Set covers on the case studies that have a project visual.
      First check whether the Rebuilding image (lightsabers) belongs to
      that project.

## 4. QA

- [x] 4.1 Automated smoke: `npm test` is green, and the new jsdom tests run
      in CI.
- [x] 4.2 Before merge: `npm run super:measure -- --local` passes every
      §1 check at 1440×900, 1024×768 and 390×844. In the PR, show one
      screenshot (homepage, 1440) and put the rest in a collapsed
      `<details>`.
- [ ] 4.3 After merge and deploy:
      - `node scripts/super-css/check.mjs` reports that the served bytes
        match the repo and every class hook is present on the live pages;
      - `npm run super:measure` against the live site passes;
      - save the table as `to-be/after.json`, next to `before.json`.
- [ ] 4.4 Manual walkthrough on the live site, at 1440 and on a phone:
      - scroll each page and watch the bar shrink and grow back;
      - turn on reduced motion and repeat;
      - click between pages, without reloading, to check that the current
        link follows;
      - check that VoiceOver reads "current page" on the active link;
      - swap the homepage art in Notion and see it live without a PR;
      - remove it and see the pattern.
- [ ] 4.5 Compare the live site with Figma page 04 row A (navbar) and page
      04.2 (heroes) at 1440 and 390, and note any differences in the PR.
