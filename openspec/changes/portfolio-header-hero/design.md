## Context

This change restyles the first screen of beckharrisdesign.com: the navbar and the hero. The approved specs are
[portfolio-header](specs/portfolio-header/spec.md) and
[portfolio-hero](specs/portfolio-hero/spec.md). The site is Super rendering
Notion. Everything here ships through the existing pipeline:
`public/super/site.css` for styles, and `public/super/components/loader.js`
for the one small behaviour Super can't give us.

What the live DOM says (fetched 2026-11-16). This shapes every decision below:

- **The navbar is outside `<main>`.** Super renders
  `<nav class="super-navbar">` before `.super-content-wrapper`. The page
  classes (`page__bhd-consultation`, `parent-page__index`) sit on
  `<main class="super-content …">`. So a rule like
  `.page__bhd-consultation .super-navbar__item` never matches. The breadcrumb
  bar *is* inside `<main>` (its first child), which is why §4's existing
  hide rules work.
- **Nav links:** Projects → `/`, Consulting → `/bhd-consultation`,
  Labs → `/bhd-labs`, About → `/katy-harris`.
- **Consulting, Labs and About are children of the homepage**
  (`parent-page__index`), exactly like case studies. "Child of the homepage"
  therefore does not mean "case study" on its own.
- **Homepage hero** = the first `.notion-column-list` in `.notion-root`.
  Column 1 has the H1, the paragraph and the button. Column 2 holds only
  empty spacer text blocks.
- **Consulting:** no Notion header (§4 hides it). The hero is the H1, text
  and button before the first `.notion-divider`.
- **About:** has a Notion header (title). Intro paragraphs follow, then the
  first `.notion-divider`.
- **Case study:** Notion header (title), then in `.notion-root` the
  properties list, the summary paragraph, and the Challenges callout. There
  is no divider before the body.
- **Cover boxes:** none of the captured pages has a cover. The 54px box on
  the case study is §4's `.no-cover` cap (3rem), not an image.

## Goals / Non-Goals

**Goals:**

- The reader gets 24px of screen back for the whole visit, and the content
  never jumps when the bar shrinks.
- The nav says where you are, using one mapping that a new nav item joins
  without a code change.
- The homepage reads as the front door at every width, with the CTA well
  inside the first phone screen.
- Katy can change the hero visual and the case-study covers in Notion
  alone.
- No wrappers injected into Super's React tree. Everything is CSS on
  existing blocks, except one class and one attribute set by the loader.

**Non-Goals:**

- The warm palette (`portfolio-warm-accents`). It gets one token to change
  later (decision 8).
- The Labs page hero. The spec doesn't list it, and its hero is a table
  intro, which is a different shape. It keeps today's look.
- The phone menu, and every section below the hero.
- The final personal artwork.

## User flow / IA

1. **Arrive at the top of any page.** The navbar is 80px. The current
   section's link is full strength and underlined; the others sit at 75%.
   There is no breadcrumb on the homepage, on top-level pages, or on case
   studies.
2. **Scroll past 80px.** The bar eases to 56px over 200ms. Logo, links and
   button step down one size. The page content doesn't move. With reduced
   motion, the change is instant.
3. **Scroll back to the top.** The bar returns to 80px.
4. **Homepage.** A big display title, one line, the CTA. On the right is
   the personal visual (stacked under the CTA on a phone), or a pattern
   drawn by `site.css` until Katy adds an image.
5. **Consulting / About / case study.** The hero sits on a band a step
   lighter than the page, and the band ends before the first body section.
   On a case study with a cover, the cover sits on the right of the band at
   1024px and wider.
6. **Deeper pages** (a Labs sub-page, or a page under a collection) keep
   the breadcrumb. It shows a level the nav can't.

## Visual design / Figma

| Item                | Value |
| ------------------- | ----- |
| Primary file URL    | https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy (`portfolio-header-hero`) |
| As-is frame(s)      | Page `01 As-is` (`0:1`): live captures. Homepage at load `1:3`, scrolled `1:4`, phone `1:5`; Consulting `1:6`, case study `1:7`, About `1:8`. Captured from the running site, so the pixels are real; the labels and measurements come from `as-is/measurements.json`. |
| Proposed frame(s)   | Page `02 Proposed` (`1:2`), round 1 from the proposal: header `2:5` / `2:14` / `2:23` / `2:28`, homepage `3:12` / `3:27`, Consulting `4:3` / `4:20`, case study `4:32` / `4:59`. Page [`03 Design`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=13-2) (`13:2`), round 2, for this artifact. **A. Navbar, current link and compact sizes:** 1440 at 80px `13:6`, compact 56px `13:15`; 390 at 80px `13:24`, compact `13:29`. **B. Homepage with no image yet** (the pattern, the 86px title, Projects current): `13:37` / `13:832`; the phone frame marks the 600px CTA limit (CTA ends at 521px). **C. Case study:** with cover `13:1183`, no cover `13:1212`. Notes `13:1239`–`13:1241`. One change from round 1: phone frames at the top of a page show the 80px bar, as the spec requires. |
| Libraries / version | None. This is the Super/Notion portfolio, not a hub surface. It uses the live `site.css` tokens instead of MVDS: navbar `#102D2F`, accent `#ADDFE3`, button text `#143639`, page about `#15373A` (estimate; Figma had no colour sampler), the new hero band `#1E474B`, and the callout band `#2C4A4E`. Fraunces 300 for display, Roboto Variable 300 for body. |
| Code Connect        | N/A. There is no React component; the surface is Notion blocks styled by `site.css`. |
| Breakpoints         | S · 480px / L · 1024px (BHD Content Types). The site's own steps also apply: 600px (phone button size), 760–860px (nav links stay in the bar), and Super's column stack. Designs are drawn at 1440 and 390. |
| Status              | Draft, awaiting approval. |

## Decisions

### Header

1. **The scroll trigger is a script in the components loader, not CSS
   scroll-driven animation.**
   - `loader.js` adds a passive `scroll` listener. Through
     `requestAnimationFrame`, it toggles `bhd-nav-compact` on `<html>` when
     `scrollY > 80`.
   - It ships in the existing `components.js`, so Super's head snippet
     doesn't change. `VERSION` bumps from 6 to 7 in both files.
   - Scroll-driven animation was rejected for three reasons. It scrubs with
     the scroll, so it can't do the spec's instant swap under reduced
     motion. It isn't in every browser yet. And it can't set
     `aria-current`, which needs script anyway (decision 4).
   - Without the script, the bar simply stays 80px, which is today's
     behaviour.
2. **Shrinking never moves the content.**
   - The navbar is sticky and in the page flow. If it simply lost 24px,
     everything below would jump up 24px at the moment of scrolling.
   - So the compact state is `height: 56px` plus `margin-bottom: 24px`. The
     bar's footprint in the flow stays 80px. That footprint is above the
     viewport by then, so the margin is never seen.
   - Super's own `--navbar-height` is also set to 56px in the compact
     state, so anything Super positions against it follows.
3. **Compact sizes.**
   - Bar: 80 → 56px.
   - Logo and links: 18 → 16px (`.889rem`). Link padding goes to 8px
     top and bottom, so the hit area still fills the bar.
   - The navbar button text goes to 16px, with padding `.3rem .875rem`
     (about 38px tall).
   - Only `height`, `font-size` and `padding` transition, over 200ms
     ease-out. `@media (prefers-reduced-motion: reduce)` sets
     `transition: none`.
   - Phones (≤600px) already use the smaller button, so on a phone only the
     bar height and the logo change.
4. **Active link: the loader sets `aria-current="page"`, and CSS styles
   that attribute.**
   - The navbar is outside `<main>` (Context), so pure CSS would need
     `:root:has(main.page__…)`, plus a hand-kept list of slugs to tell case
     studies apart from Consulting, Labs and About. With `aria-current`
     added, the mapping would exist twice. One mapping in code, tested
     against a table, is the safer shape.
   - The mapping reads only the classes on `<main>` and the nav's own
     links, in this order:
     1. `page__<slug>` where a nav link points to `/<slug>` → that link.
     2. `parent-page__<slug>` where a nav link points to `/<slug>` → that
        link. This is how Labs sub-pages light up Labs.
     3. `page__index`, `page__all-projects` or `parent-page__index` →
        Projects (`/`).
     4. Anything else → no current link.
   - A new nav item joins with no code change. A grandchild page
     (two levels down) gets no highlight. That is acceptable, and those
     pages keep their breadcrumb (decision 5).
   - It re-runs on the loader's existing `MutationObserver` pass, so
     Super's client-side page changes update it.
   - Style: non-current links at `rgb(var(--accent) / .75)` (5.76:1, the
     ratio §3 measured for the breadcrumb). The current link is full
     `--accent` with a 2px underline at a 6px offset, so colour isn't the
     only signal. Hover takes any link to full strength without the
     underline.
   - Without the script there is no highlight, which is today's state, and
     nothing else breaks.
5. **Breadcrumb: hidden on every child of the homepage, kept on deeper
   pages.**
   - Rule: `:is(.parent-page__index, .page__all-projects)
     .super-navbar__breadcrumbs { display: none }`. This is pure CSS, in
     §3, with no dependency on the script.
   - It covers Consulting, Labs, About and the case studies in one rule.
     Labs sub-pages (`parent-page__bhd-labs`) and pages under a collection
     keep the trail.
   - **This goes one step past the spec.** The spec requires no breadcrumb
     on top-level pages. Case studies are dropped too, because of the
     colleague's note on the case study ("Is the breadcrumb needed
     here?"). Once Projects is highlighted, the trail repeats it.
   - §3's "breadcrumb floats on the cover" rules then only apply to
     deeper pages. They stay as they are.

### Homepage hero

6. **The selector uses the page class, not the id.**
   - The rule is `.page__index .notion-root > .notion-column-list:first-child`.
   - §4 uses `#page-index` today, but `check.mjs` only guards classes. The
     class form means a Super markup change is caught.
7. **The display size is a new §1 token.**
   - `--home-display-size: clamp(2.667rem, 1.2rem + 4.5vw, 4.889rem)`.
     At the site's 18px base that gives 48px on a phone, about 68px at
     1024 and about 86px at 1440.
   - It applies only to the H1 in the homepage hero; subpage H1s stay at
     2.5rem (45px).
   - The supporting paragraph shrinks to one line. That is a Notion edit
     Katy makes, and the current paragraph moves to About.
   - With the 48px title on four lines and one line of copy, the phone CTA
     lands at about 500px, against the spec's ≤600px. That figure is a
     prediction from Figma `3:27`; implementation measures it.
8. **Warm-accent slot.**
   - A 48 × 2px rule sits above the homepage H1, drawn as `::before` in a
     new §1 token: `--hero-accent: rgb(var(--accent) / .4)`.
   - `portfolio-warm-accents` changes that one value.
9. **The homepage hero gets no band.** The band marks subpage heroes. Leaving
   it off the homepage is one more way the front door differs from the
   rooms behind it, and the larger type already gives it the weight.

### Personal visual

10. **The visual is a Notion image block in the hero's second column.**
    - `.notion-column:nth-child(2):has(.notion-image)`: the image fills
      the column at a 4:5 aspect ratio, `object-fit: cover`, with the
      site's 8px radius. Column 2's empty spacer text blocks are hidden.
    - To swap it, Katy replaces the image in Notion and Super republishes.
      No pull request is needed.
    - The page cover was rejected: Super renders the homepage cover as a
      full-width banner above the hero, not in the column. A hard-coded
      asset was rejected because it breaks the "no pull request" scenario.
11. **No image yet: the column draws a pattern.**
    - `.notion-column:nth-child(2):not(:has(.notion-image))` gets a dot
      grid as a CSS `radial-gradient` background. Dots are
      `rgb(var(--accent) / .14)` at a 16px pitch, on a 4:5 box with the
      same 8px radius.
    - It takes the same size and position the image would. It is
      decorative, so it is a background, with no `alt` and nothing for
      screen readers.
    - It is the same rule §9 uses (`.notion-callout:has(.notion-image)`): a
      selector that keys on content, already guarded by `check.mjs`.
12. **Phone: the visual stacks under the CTA.**
    - Super stacks columns at phone width. The visual becomes 3:2 with a
      maximum height of 240px.
    - It comes after the CTA in the DOM, so it can't push the button down.

### Subpage hero band

13. **The band is painted per block with `border-image`, with no wrapper.**
    - Each hero block gets `border-image: conic-gradient(var(--hero-band)
      0 0) fill 0 / / .75rem 100vmax`. The image extends outward 100vmax
      to each side, so the band runs the full page width, and .75rem
      above and below, so it closes the gaps between blocks.
    - `border-image` paints with the block's background, under every
      block's text. Unlike the `box-shadow` + `clip-path` trick, it can't
      cover a neighbour's descenders, and it creates no stacking context.
    - New §1 token: `--hero-band: #1E474B`.
    - The band ends 2rem before the first body block, through padding on
      the last hero block, so the page colour shows between the band and
      the body.
14. **Which blocks are "the hero", by page shape:**
    - **Consulting, About:** every `.notion-root` child before the first
      `.notion-divider` (`:not(.notion-divider, .notion-divider ~ *)`),
      plus About's `.notion-header`. That first divider is hidden, because
      the band's edge replaces it.
    - **Case study** (`.parent-page__index` that is not
      `page__bhd-consultation`, `page__bhd-labs` or `page__katy-harris`):
      `.notion-header`, the properties list, and the paragraph after it,
      ending before the first `.notion-callout` or `h2`. This is the one
      hand-kept slug list in the change. It sits beside §4's existing
      list, with the same comment telling the next editor to add new
      top-level pages to both.
    - The Challenges callout keeps its own `#2C4A4E` fill. The 2rem of
      page colour between the two bands keeps them reading as separate
      things.
15. **Case-study cover beside the title, at 1024px and wider.**
    - The cover lives inside `.notion-header`, while the properties and
      summary live in `.notion-root`, a different parent. No CSS grid can
      place them side by side without restructuring Super's DOM.
    - So on `main:has(.notion-header__cover.has-cover)` the cover is
      positioned absolutely in the top right of the band. It takes 40% of
      the site width at a 4:3 aspect ratio, `object-fit: cover`, and keeps
      Notion's own reposition through its inline `object-position`.
    - Title, properties and summary get `max-width: 56%`, so they never
      run under it.
    - If the cover is taller than the text, it hangs past the bottom of
      the band, on purpose: an editorial overlap, not a clipped image.
    - Below 1024px, the cover goes back above the title at 16:9 instead of
      Super's banner crop.
16. **No cover: no box.** `.no-cover` drops from §4's 3rem cap to `0`, and
    the band's 3rem top padding gives the title its room. This replaces
    §4's cap on every page with a Notion header, which is the point: the
    54px empty box is the defect the spec names.

### Guards and tests

17. **`check.mjs` needs no new code.** It already collects every `.notion-*`,
    `.super-*`, `.page__*` and `.parent-page__*` class in `site.css` and
    checks each against the live pages. New hooks such as
    `.notion-column`, `.notion-divider`, `.notion-page__properties-layout`
    and `.super-navbar__item` are covered the moment they appear in the
    file. Element ids (`#page-index`) are not checked, which is why
    decision 6 uses the class.
18. **Tests: jsdom in `tests/scripts/super-components.test.ts`.**
    - The scroll class goes on past 80px and comes off at the top.
    - The `aria-current` mapping is checked against a table of `<main>`
      class sets: homepage, all-projects, Consulting, Labs, a Labs
      sub-page, About, a case study, and a grandchild.
    - The CSS is verified by the manual pass at 1440 and 390 on the live
      site, using the measurement script that produced
      `as-is/measurements.json`, re-run to check every "Fails until" line
      now passes.

## Risks / Trade-offs

- **The active state and the compact bar depend on an external script.**
  If `labs.beckharrisdesign.com` fails, both fall back to today's
  behaviour; nothing renders wrong. The breadcrumb rule is pure CSS, so it
  doesn't depend on the script. Consulting with no breadcrumb and no
  highlight is still a clean page.
- **Super's client-side navigation could re-render the nav and drop
  `aria-current`.** The loader's `MutationObserver` re-applies it. The
  manual pass checks this by clicking between pages, not only by loading
  each one.
- **The case-study slug list can drift.** A new top-level page added under
  the homepage would be banded as a case study until it is added to the
  list. The comment beside §4's list covers it, and the risk is cosmetic
  (a band where none was planned).
- **Notion covers are wide banners.** The 4:3 crop cuts the sides of the
  covers set today. Katy picks or repositions covers where the project
  visual matters. This is a Notion task in `tasks.md`, not code.
- **`border-image` with a 100vmax outset** is supported everywhere current,
  but it is less familiar than `box-shadow`. The comment in §4 needs to
  say why it was chosen (decision 13), or the next editor will "simplify"
  it into the version that covers descenders.
- **The page colour `#15373A` is an estimate** (no colour sampler during
  round 1). The band is set by its own token, so the risk is only that
  the step between page and band looks larger or smaller than drawn. It
  is checked on the live site, and the token is tuned there.
- **Fluid type at 1024–1440** has not been drawn at the in-between widths.
  The `clamp()` keeps it monotonic, and the manual pass checks 1024 and
  1280 as well as 1440 and 390.
