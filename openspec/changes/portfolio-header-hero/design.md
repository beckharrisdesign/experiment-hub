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
- Built on MVDS: the portfolio is an MVDS brand preset, and the new styles
  use MVDS tokens and, in Figma, MVDS components (decision 20).
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
4. **Homepage.** A big display title on a full-width hero in the hero
   colour, with the intro paragraph and the CTA directly below it on the
   page colour. The hero art sits behind the title,
   at 150% of the hero's height, centred on the gutter between the second
   and third columns of the content grid, the same on every width. Until Katy adds art, the hero shows its colour alone.
5. **Consulting / About / case study.** The hero sits on a band a step
   lighter than the page, and the band ends before the first body section.
   A case study at 1024px and wider is different: its cover fills the hero
   edge to edge (1920px per copy of the image, repeated sideways beyond that), and the title, properties and summary sit on a card in
   the hero colour over it (Katy's frame `55:328`).
6. **Deeper pages** (a Labs sub-page, or a page under a collection) keep
   the breadcrumb. It shows a level the nav can't.

## Visual design / Figma

| Item                | Value |
| ------------------- | ----- |
| Primary file URL    | https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy (`portfolio-header-hero`) |
| As-is frame(s)      | Page `01 As-is` (`0:1`): live captures. Homepage at load `1:3`, scrolled `1:4`, phone `1:5`; Consulting `1:6`, case study `1:7`, About `1:8`. Captured from the running site, so the pixels are real; the labels and measurements come from `as-is/measurements.json`. |
| Proposed frame(s)   | Page `02 Proposed` (`1:2`), round 1 from the proposal: header `2:5` / `2:14` / `2:23` / `2:28`, homepage `3:12` / `3:27`, Consulting `4:3` / `4:20`, case study `4:32` / `4:59`. Page [`03 Design`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=13-2) (`13:2`), round 2, for this artifact. **A. Navbar, current link and compact sizes:** 1440 at 80px `13:6`, compact 56px `13:15`; 390 at 80px `13:24`, compact `13:29`. **B. Homepage with no image yet** (the pattern, the 86px title, Projects current): `13:37` / `13:832`; the phone frame marks the 600px CTA limit (CTA ends at 521px). **C. Case study:** with cover `13:1183`, no cover `13:1212`. Notes `13:1239`–`13:1241`. One change from round 1: phone frames at the top of a page show the 80px bar, as the spec requires. Page [`03.1 Design — real imagery + callout colour`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=17-2) (`17:2`), round 2.1, shows the same layouts with real pictures. **B.** The homepage with your W&H hand-drawn pattern as the visual: `17:6` / `17:800`. **C.** Case studies with live gallery images as covers: Rebuilding `17:1145`, Connected China `17:1173`, phone `17:1201`. **E.** Four callout colours: `17:1219` (today), `17:1249` (hero band, recommended), `17:1279` (a step lighter), `17:1309` (pill tint). Page [`03.2 Design — full-bleed heroes`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=19-2) (`19:2`), round 2.2, runs the hero image edge to edge. **H-A.** Homepage with the image behind the text and a scrim: `19:6` / `19:26`. **H-B.** Homepage with the image as a full-width band under the text: `19:42` / `19:62`. **C.** Case-study cover as a full-width band above the title: Rebuilding `19:77`, Connected China `19:105`, phone `19:133`. Page [`04 Design — on MVDS (round 3)`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=24-6) (`24:6`) is the build reference, the chosen design rebuilt on MVDS. **A.** Navbar: `24:10` (80px), `24:20` (56px), `24:30` (phone). **B.** Homepage H-A: `25:7` / `25:24`. **C.** Case study: `27:18` / `27:52`. The mapping and gaps are written on the page beside the frames. **Katy's case-study hero** `22:81` (her hand rework: the hero colour comes from the cover, the cover bleeds off the right, and the properties sit in divided cells). **D.** The same pattern on the homepage, keeping homepage type sizes: `31:33` (1440) / `31:53` (390; CTA ends at 500px). Page [`04.1 Design — hero art anchored to the right third`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=33-30) (`33:30`) applies the anchoring rule with Katy's placeholder art: case study `33:34`, homepage `33:60` / `33:85`. A dashed box marks the right third. Page [`04.2 Design — hero art on the content grid, 150%`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=37-2) (`37:2`) applies Katy's final rule from her logic Frames 10–12 (page 04, `32:184`, `32:185`, `32:197`): case study `37:6`, homepage `37:31` / `37:55`, with the three-column content grid drawn on. Page [`05 Hero imagery — components to fill`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=55-6) (`55:6`) holds the art: a base **Hero art** component (`65:26`) with an **Art** slot, and one `hero-art/<page>` component per hero (`hero-art/home`, and `hero-art/<slug>` for each of the nine case studies). Each one carries its export preset (PNG, 3840px wide). Its previews are instances of those components. **Katy's final case-study hero:** Connected China, [`55:328`](https://www.figma.com/design/1oYatzomx4nNMt6HJkChxy?node-id=55-328) (1440) and `55:353` (390). The other eight case studies on the page copy it. |
| Libraries / version | **MVDS Core** (team library, subscribed; `@beckharrisdesign/mvds@0.5.0` in code). From round 3 (page 04) the frames use MVDS Button, Hero, MediaFrame and Section instances, MVDS spacing and type-size variables, and a local collection, **"Portfolio — MVDS brand preset"**. That collection gives each MVDS colour and font role its portfolio value: background `#143639` (Super's `--color-bg-default`), foreground and primary `#ADDFE3`, card and muted `#1E474B`, secondary `#102D2F` (navbar), primary-foreground `#143639`, font-heading Fraunces, font-sans Roboto (decision 20). Binding audit across the seven page-04 frames: 42 of 42 text layers have size and family bound, and 68 of 69 solid fills are bound. The exception is a pink annotation line. Rounds 1–2.2 (pages 02–03.2) predate this and use raw values. |
| Code Connect        | N/A. There is no React component; the surface is Notion blocks styled by `site.css`. |
| Breakpoints         | S · 480px / L · 1024px (BHD Content Types). The site's own steps also apply: 600px (phone button size), 760–860px (nav links stay in the bar), and Super's column stack. Designs are drawn at 1440 and 390. |
| Status              | Approved. **Build from:** page 04 row A (navbar), page 04.2 for the homepage hero, and page 05 `55:328` / `55:353` for the case-study hero. Pages 04.1, 04 rows B–D, 04.2's case study and `22:81` as drawn are the steps that led there. |

## Decisions

> **Hero pattern (2026-11-16).** Katy reworked the case-study hero by hand
> (Figma `22:81`), then set the rule for hero art. Art arrives finished. It
> sits behind the hero content at 150% of the hero's height, centred on the
> gutter between columns 2 and 3 of a three-column grid as wide as the
> content (Katy's Frames 10–12). Page 04.2 applies the rule to the case study
> and the homepage. Decisions 10–12 describe it. The `portfolio-hero` spec
> was revised to match and goes back for re-approval with this design.
>
> **Case-study hero (2026-11-17).** Katy's final case-study hero (Figma
> `55:328`) replaces the 150% rule for case studies. The cover fills the
> hero edge to edge (one 1920px image, tiled beyond that, from 2026-11-18), and the text
> sits on a card in the hero colour.
> Decisions 15 and 16 describe it, and the spec's third requirement was
> revised to match. The homepage keeps decision 11.

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
   - The navbar button is 48px tall at rest and 40px compact (MVDS
     `space-48` / `space-40`), with 16px side padding. Its text is 18px
     at rest and 16px compact.
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
   - **The intro sits below the hero, not in it** (Katy, 2026-11-17: "this
     full intro blows out the hero section"). The earlier plan cut the
     paragraph to one line; instead the full paragraph and the button move
     out of the hero's column in Notion, to just after the column list.
     §4 gives them the hero's text width (two of three grid columns), the
     24px / 18px line, 48px (32px on a phone) below the hero and 32px to
     the button, and hides Notion's empty spacer blocks among them.
   - The navbar's "Book a 30m call" stays in view on every page, so the
     spec's phone-screen scenario now counts it; the hero's own button
     follows the intro.
8. **Warm-accent slot: removed.**
   - This drew a 48 × 2px rule above the homepage H1 from a §1 token,
     `--hero-accent`, which `portfolio-warm-accents` was to change.
   - Katy removed the rule from her homepage frames (`55:72`, 2026-11-17),
     so the rule and the token are gone. `portfolio-warm-accents` needs
     another place for its accent.
9. **The homepage hero gets no band.** The band marks subpage heroes. Leaving
   it off the homepage is one more way the front door differs from the
   rooms behind it, and the larger type already gives it the weight.

### Personal visual

10. **Hero art arrives finished, so the site only places it.**
    - Katy supplies hero art with its own borders, feathers or
      transparency (for example the diamond placeholder, a transparent
      PNG). The site adds no mask and no wash, and reads no colour from
      the art.
    - The hero colour is a token, painted full width with the
      `border-image` technique from decision 13. There are two values, as
      Katy set them in Figma:
      - **Homepage:** `--primary-1` `#1E474B`, an MVDS role. Katy rebound
        it on page 04.1.
      - **Case study:** `--hero-bg` `#2F3636`, from Katy's frame `22:81`
        (`portfolio/hero-bg` in Figma). No MVDS role matches it.
    - The earlier plan, reading the picture's edge colour in a canvas, is
      dropped, and so is the script it needed.
11. **Homepage art on the content grid: behind the content, 150% of the
    hero's height, centred on the gutter between columns 2 and 3** (Katy's
    Frames 10–12 on page 04). Case studies used this rule until
    2026-11-17; decision 15 replaces it for them.
    - **The grid.** The hero content sits on three equal columns as wide
      as the content at that breakpoint (1164px inside the 1200px site
      width, 354px on a phone), with 1rem (18px) gutters. Katy's three
      frames (1536×500, 1280×400 and 1280×300) all centre the art on the
      gutter between columns 2 and 3: two-thirds of the content width
      plus 3px.
    - **Homepage.** The hero column list is already exactly the content
      width, so it is the positioning box (`position: relative`,
      `isolation: isolate`). Column 2's image block is lifted out of the
      flow and placed with:
      `position: absolute; z-index: -1; top: 50%; height: 150%;
      width: auto; left: calc((100% - 2rem) * 2 / 3 + 1.5rem);
      transform: translate(-50%, -50%)`. The image itself is
      `height: 100%; width: auto`, so the art keeps its own shape.
    - **Why that `left` works.** Each column is `(C − 2g) / 3`, so the
      gutter between columns 2 and 3 is centred at `2 × (C − 2g) / 3 + 1.5g`.
      With `g = 1rem` that is the expression above. No viewport units are
      needed, so the scrollbar width can't shift it.
    - **Clipping.** The art clips its own overflow:
      `clip-path: inset(calc(100% / 6) 0)` trims the quarter of the hero
      height that runs past the top and the bottom (one-sixth of the art).
      The hero box doesn't need `overflow`, so the full-width band behind
      it isn't cut. Katy's logic frames leave the art unclipped; her hero
      frame `22:81` clips it, and this follows the hero frame. Overflow
      past the right edge of the viewport relies on §2's existing
      `overflow-x` guard.
    - **The text column spans two of the three grid columns and the
      gutter between them:** `calc((100% - 2rem) * 2 / 3 + 1rem)`, which is
      770px at 1440, as in Katy's frame `55:72`. The text ends where the art
      is centred. It was 62 / 38 at first, which put the button below a
      laptop's first screen (924px on 1512 × 860), and then the full width
      for a day, which Katy found too wide. At two columns the title is 3
      lines. With the intro moved below the hero (decision 7), the hero is
      499px tall at 1440 × 900 and 329px on a phone.
    - **The art must be sharp.** Notion's column 2 is about 6% of the
      page, so Super writes `sizes="… 6vw"` on the image, and the browser
      downloads the 96px file for art drawn about 1,500px wide.
      `components/chrome.js` (`fitArtSizes`) rewrites `sizes` to the width
      the art is drawn at, so the browser picks a sharp file from Super's
      srcset, which goes to 3840w. The upload must be big enough too: the
      `hero-art/*` exports on page 05 are 3840px wide, the largest size in Super's srcset. Check 1.10 marks a
      too-small upload as content, not as a code failure.
    - **Phone: the same rule.** At 390 wide and a 764px hero, the art is
      1146px tall and 1378px wide, centred at x 257, so it fills the hero
      behind the text. The CTA doesn't
      move, because the art is out of the flow: it still ends at 500px.
    - **Readable text is the art's job,** and the spec holds the line at
      4.5:1. The placeholder measures 6.46:1 under accent text on its
      densest overlap, and 7–8:1 on the outer layers.
    - **Type keeps the homepage's own sizes:** 86px display on desktop,
      48px on a phone, and a 24px / 18px supporting line.
    - **To swap the art:** Katy replaces the image in Notion, and Super
      republishes. No pull request is needed.
12. **No image yet: nothing.** When column 2 has no image, its other
    blocks are hidden, so it has no width, and the hero shows its colour
    alone.
    - Until 2026-11-17 this drew a dot grid (a `radial-gradient` of
      `--foreground` at 14% on a 16px pitch, in a 6:5 box). Once it was
      live, Katy asked for it to go: a plain hero reads better than a
      pattern standing in for art.

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
    - The band ends 32px (MVDS `space-32`) before the first body block,
      through padding on the last hero block, so the page colour shows
      between the band and the body. Band padding is 64px on desktop and
      48px on a phone (decision 20).
14. **Which blocks are "the hero", by page shape:**
    - **Consulting, About:** every `.notion-root` child before the first
      `.notion-divider` (`:not(.notion-divider, .notion-divider ~ *)`),
      plus About's `.notion-header__content`. That first divider is hidden,
      because the band's edge replaces it.
    - **Case study** (`.parent-page__index` that is not
      `page__bhd-consultation`, `page__bhd-labs` or `page__katy-harris`):
      `.notion-header__content` (the title, not the cover, which keeps its
      own picture), then the run of properties, paragraphs and buttons
      that follows, ending at the first block of any other kind: a
      callout, heading, image, column list, divider or empty spacer.
      Heading anchors pass. Until 2026-11-18 it ended only at the first
      callout or `h2`, so a Highlight page with neither put its whole body
      in the hero card. `site.css` uses `:where()` for these filters so
      they add no specificity, and `chrome.js` (`heroBlocks`) applies the
      same rule when it measures. This is the one
      hand-kept slug list in the change. It sits beside §4's existing
      list, with the same comment telling the next editor to add new
      top-level pages to both.
    - The Challenges callout takes the same colour as the hero band
      (decision 19). The 2rem of page colour between the two bands keeps
      them reading as separate things.
15. **Case-study hero: the cover fills the hero, and the text sits on a
    card** (Katy's frame `55:328` at 1440, and `55:353` at 390, on
    page 05).
    - **The card is painted per block, not wrapped.** As with the band
      (decision 13), the hero's blocks live in two parents. The title is
      in `.notion-header__content`, and the properties and summary are in
      `.notion-root`. So every block paints its own slice of the card,
      with no gaps between them:
      - `.notion-header__content` paints a `linear-gradient` strip
        786px wide, starting 16px left of the text (`2px` into its 18px
        padding). The strip stays inside the block's own box.
      - The `.notion-root` blocks are capped at 754px (Katy's text width)
        and paint with `border-image … fill 0 / / 0 16px`, so the card
        runs 16px past the text on each side.
      - `.notion-header`'s 16px bottom margin goes to 0, so the title's
        slice meets the properties' slice.
    - **The first callout meets the hero.** At 1024px and wider it starts
      at the hero's bottom edge, with no strip of page colour between them
      (Katy, 2026-11-17, after the live check). A heading that comes first
      instead keeps `space-32`.
    - **Even padding.** One value, `--hero-card-pad` (`space-16`), pads
      all four sides. The title is trimmed to its capitals
      (`text-box: trim-start cap alphabetic`) and the summary to its
      descenders (`trim-end cap text`), so the visible gap is 16px on every
      side. Measured on the live page's pixels: 16 / 16 / 16. Before the
      trim, the line heights added about 10px above the title and 5px below
      the summary. Browsers without `text-box` fall back to those.
    - **No seams.** Blocks inside the card have no top margin, so their
      slices meet. A hero button (Datlas's "Explore the Atlas") follows the
      summary at the paragraph's own 1rem; Super's 4px margin and 9px
      padding go. The descender trim applies only when the card ends in
      text (2026-11-18).
    - **Card spacing,** as drawn: 16px padding (`space-16`), 4px from the
      title to the properties (`space-4`), 32px from the properties to
      the summary (`space-32`). Katy's 2px corner radius isn't drawn:
      each block paints its own slice, so there is no single box to
      round, and at 2px the difference is barely visible.
    - **Type:** title 45px Fraunces Light on a 56px line; labels 12px
      Fraunces Regular; values 14px Roboto Light; summary 18px Roboto
      Light on a 28px line.
    - **Properties:** four equal cells with no dividers, padded 8 / 8 / 8
      / 0, with a 4px gap between label and value.
    - **The hero area is at least 480px tall, and the card is centred in
      it.** The loader measures the card (`--hero-top`, `--hero-h`, as
      before). CSS sets `--hero-pad: max(64px, (480px − --hero-h) / 2)`,
      as a top margin on the first block and a bottom margin on the last.
      The art layer spans `--hero-top − --hero-pad` for
      `--hero-h + 2 × --hero-pad`. Without the script, `--hero-pad` falls
      back to 64px.
    - **Capped at 1920px, tiled beyond** (Katy, 2026-11-18). The image is
      never drawn wider than 1920px (`--hero-art-max`): the 3840px export
      on a 2× screen, and the largest file in Super's srcset. On a wider
      screen the cover repeats sideways (`repeat-x`, 1920px per tile,
      centred), so the middle tile is exactly the single image, and a wide
      monitor shows more art instead of a hard edge. CSS can't read an
      `<img>`'s address, so `chrome.js` (`tileCover`) puts it on `<main>`
      as `--hero-cover-url` and sets `data-bhd-cover-tile`. Without the
      script, the cover stays one centred 1920px image on the page colour.
      Tiles meet at visible seams unless the art is drawn to repeat.
    - **The art:** with a cover (`main[data-bhd-hero="cover"]`), the cover
      is lifted out of the header. It is placed over that span, as wide as
      `<main>` up to `--hero-art-max` (1920px) and centred, with
      `object-fit: cover` centred. As on the
      homepage, the site adds nothing to it.
    - **No cover** (`main[data-bhd-hero="plain"]`): the same span is
      painted `--accent` (`#23474A`). That is the placeholder colour on
      page 05, so a case study waiting for art looks the way it does in
      Figma.
    - **Below 1024px:** the band of decision 13 stays, in the hero colour.
      The cover runs full width above the title at 39:20 (Katy's 390 × 200
      frame), with 16px to the title. The title drops to `--text-h1-size`
      (36px) on a 49px line.
    - **Without the script,** the card still draws, the cover stays where
      Super puts it (above the card), and there is no placeholder colour.
      Nothing is broken.
    - **Notion:** Katy's frame shows **Company** where the live page has
      **Reported to**. That is a change to the case-study page layout in
      Notion (`tasks.md` 3.13), not to code.

16. **No cover: no box.** `.no-cover` drops from §4's 3rem cap to `0`. On
    desktop the card sits on the placeholder colour (decision 15); on a
    phone the band's top padding (48px) gives the title its room. This
    replaces §4's cap on every page with a Notion header, which is the
    point: the 54px empty box is the defect the spec names.

21. **Consulting and Labs: at least as tall as Home and About** (Katy,
    2026-11-18: "the home page and about page match one another in terms
    of hero size … lets get consulting and labs to at least have the same
    hero height"). Home and About both measure ~500px at 1440, from their
    content rather than a set height; Consulting measured 370px and Labs
    351px. `--top-hero-min: 500px` on their `<main>` from 1024px up.
    Their hero is several Notion blocks with no box around them, so CSS
    can't apply a min-height: `chrome.js` `fillTopHero()` measures the
    opening run of headings, text and buttons (to Consulting's divider,
    Labs' callout), writes the shortfall as `--top-hero-fill`, and site.css
    puts half above the text and half below, so it stays centred like
    Home. Consulting is measured to its band's painted edge; Labs, which
    has no band, to where its callout starts. Phones keep their own
    height. Without the script, each hero keeps its own height.
    Same pass: Consulting now opens with a heading, which Notion precedes
    with an empty anchor `<span>`. The band's 64px top padding went on the
    anchor, and the heading's 30px top margin showed as a 6px strip of
    page colour across the band. The padding now goes on the heading, with
    no margin.

### Guards and tests

17. **`check.mjs` needed two lines, found after merge** (tasks.md 4.3): the
    runtime `--hero-h` / `--hero-top` go in its self-defined list, and About
    joins its routes. Otherwise it already collects every `.notion-*`,
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

### Callout colour

19. **The callout takes option B, `#1E474B`: `--callout-bg: var(--muted)`.**
    - When this was decided, `#1E474B` was the hero band on every subpage.
      Since 2026-11-17 the case-study hero is `--hero-bg` `#2F3636`
      (decision 15), and the callout deliberately stays `#1E474B`. Pointing
      it at `--hero-band` would turn case-study callouts `#2F3636`, a colour
      nobody chose for them. Consulting and About still use `#1E474B` for
      their band, so there the callout and the band still match.
    - Every green on the site is the same hue, about 185°. The navbar
      (`#102D2F`, saturation 49%), the page (`#143639`, 48%) and the hero
      band (`#1E474B`, 43%) all sit close together on saturation too.
      Today's callout is 10% white laid over the page, which pulls its
      saturation down to 27% (`#2C4A4D`). That is why it reads grey next
      to the hero.
    - Four options are drawn on page 03.1, row E:
      - **A. Today:** `#2C4A4D`.
      - **B. The hero band:** `#1E474B`, 7.02:1 for accent text.
        Recommended: one colour for every surface set apart from the page,
        and one token fewer.
      - **C. One step lighter on the same scale:** `#24575B`, 5.58:1. This
        draws more attention than the hero above it.
      - **D. The pill tint (accent at 10%):** `#23474A`. Close to B, but a
        little greyer.
    - `--callout-bg` styles every `.notion-callout`, so this changes all
      callouts across the site, not only on case studies. That is the
      intent: one set of greens everywhere.

### Built on MVDS

20. **The portfolio is an MVDS brand preset, and the new styles use MVDS
    tokens.**
    - **The model is MVDS's own.** `themes/terracotta.css` sets only the
      semantic colour roles, the five authored `primary-1…5` steps, and
      (per `themeable-typography`) `--font-heading` / `--font-sans`.
      Spacing, radius and the type ramp stay MVDS's. The portfolio follows
      the same contract:
      - `--background` `#143639`, `--foreground` `#ADDFE3`
      - `--card` and `--muted` `#1E474B` (the hero band and, by decision
        19, the callout)
      - `--muted-foreground` `#ADDFE3` at 75% (the non-current nav links)
      - `--primary` `#ADDFE3`, `--primary-foreground` `#143639` (the
        button)
      - `--secondary` `#102D2F` (the navbar)
      - `--accent` `#23474A`, `--border` `#ADDFE3` at 20%
      - `--primary-1…5` on the same 185° hue
      - `--font-heading` Fraunces, `--font-sans` Roboto
    - **Figma:** the local collection "Portfolio — MVDS brand preset"
      holds those values under the MVDS role names. Every MVDS instance
      on page 04 has its colour roles bound to it, so the stock components
      render as the portfolio. The final hero pattern (`22:81`, rows D and
      04.1) is built from plain auto-layout frames, not MVDS Hero or
      Section, because neither has a slot for art placed this way. Those
      frames bind MVDS spacing, the preset's colours, fonts and sizes, and
      the hero colour `portfolio/hero-bg`, and they use MVDS Button. Type uses MVDS size variables with the
      preset's font variables. MVDS's text styles are Inter Semi Bold, so
      they aren't applied.
    - **Code:** `site.css` §1 declares the preset under the same CSS names
      MVDS uses, and every rule this change adds reads them. Spacing
      follows the MVDS scale:
      - the band-to-callout gap is 32px (`space-32`), not 2rem;
      - band padding is 64px on desktop and 48px on a phone (Section
        `py=64` / `space-48`), not 3rem;
      - the navbar is 80px (`space-80`);
      - button heights are 48px and 40px (`space-48` / `space-40`).
      Type sizes use `--text-body-lg-size`, `--text-body-size`,
      `--text-small-size` and `--text-display-size`. These names don't
      collide with Super's CSS (checked against the live page).
    - **One collision, in `site.css` itself:** its `--accent` holds bare
      RGB numbers (`173 223 227`), used as `rgb(var(--accent) / α)` across
      the file. MVDS `--accent` is a full colour with a different meaning,
      a subtle surface. This change renames `site.css`'s token to
      `--accent-rgb`. The rename is mechanical, and every use is in the one
      file.
    - **Gaps (MVDS has no token or slot; local `portfolio/*` values):**
      - the 86px homepage display size (the MVDS ramp tops out at 48);
      - the 45px subpage title (between `h1` 36 and `display` 48);
      - the 56px compact bar (MVDS `chrome-top-height` is 64);
      - the pill button radius (MVDS radius tops out at 14);
      - the 18px site gutter (`space-16` is the nearest);
      - the hero colour `#2F3636` (`portfolio/hero-bg`; no MVDS role
        matches, and the nearest is `card`);
      - the 12px property labels on the case-study card (`--text-caption-size`;
        the MVDS ramp starts at 14);
      - line heights (56px title, 28px summary, 49px phone title): MVDS
        has no line-height tokens;
      - the card's 2px radius (no radius token is used in the Figma file,
        so it isn't confirmed against MVDS);
      - the 480px minimum case-study hero height (Katy's frame).
      Missing slots: Hero has no actions slot, Section has none between
      heading and body, and Chrome has no content slot. Each is drawn on
      page 04 as a local frame on preset colours, and each is a candidate
      for MVDS itself. They stay local here rather than bending this
      change around them.

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
- **Readable text depends on the art.** The site no longer dims or masks
  anything, so art that is bright or busy where the text sits can fail
  4.5:1. The placeholder passes at 6.46:1. Check each new piece of art
  against the spec's contrast scenario before it goes live. A wide,
  opaque photo would need its own fade built in.
- **On a phone the art fills the hero behind the text.** That is the rule
  as given: 150% of a 764px hero is 1146 by 1378px. It reads well with the
  translucent placeholder. A denser piece of art may want a phone-only
  size later.
- **The case-study art and placeholder need the loader;** the homepage
  doesn't. Without the script, the card still draws, and a cover falls
  back to Super's banner above it.
- **A busy cover can't hurt the text,** because the text sits on a solid
  card. The risk moves to the cover itself: it is cropped to fill the
  hero, so the sides or the top and bottom may be cut depending on the
  window's shape. Page 05's previews show the crop at 1440.
- **`border-image` with a 100vmax outset** is supported everywhere current,
  but it is less familiar than `box-shadow`. The comment in §4 needs to
  say why it was chosen (decision 13), or the next editor will "simplify"
  it into the version that covers descenders.
- **The Rebuilding gallery image is two lightsabers.** Page 03.1 uses the
  images the live gallery shows today. On the Rebuilding card that is a
  lightsaber picture, which may belong to "Use the force, Luke". Check the
  image before it becomes the case study's cover.
- **Cover shapes vary.** The `hero-art/<slug>` components are 16:9. At
  1440 a 480px hero is 3:1, so `object-fit: cover` cuts the top and bottom.
  On a phone, 39:20 cuts a little off the 16:9 art. Checking each cover is
  a Notion task in `tasks.md`, not code.
- **Fluid type at 1024–1440** has not been drawn at the in-between widths.
  The `clamp()` keeps it monotonic, and the manual pass checks 1024 and
  1280 as well as 1440 and 390.
