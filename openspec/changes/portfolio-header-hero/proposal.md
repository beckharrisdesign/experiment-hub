## Human anchor

> "A great colleague wrote down some feedback for my portfolio site. I want to note the elements, and then do an openspec proposal for each. This morning I want to focus on building an as is representation of the pieces I want to change, and start to tackle the header/hero portion of things."
>
> — Katy, 2026-11-13

The notes this change answers, verbatim from the colleague's review (full log in
[`portfolio-feedback-2026-11/README.md`](../../../experiments/super-css-control/docs/portfolio-feedback-2026-11/README.md)):

> "Reduce the header height on scroll. The height of it is fine on load, but feels like it takes up too much space on scroll" (HD-1)
>
> "Make the hero on the homepage more immersive than what's on the subpages. This should be your front door. Less text, bigger type?" (HR-1)
>
> "Try adding a visual element that expresses something about you, e.g. pattern, photo, doodle, anything really." (HR-2)
>
> "Breadcrumb is redundant if menu link is highlighted" (HD-2, HD-3) · "Hero bg in different color than the page?" (HR-4) · "Try a visual element that expresses something about the project" (HR-3)

## Outcomes

- **Who:** A hiring manager, founder or design lead landing on
  beckharrisdesign.com for the first time, usually from a link, deciding
  in seconds whether to keep going. Second: Katy, who wants the front door to
  look as confident as the work behind it.
- **Job:** Know who Katy is and why she is worth a call from the first screen,
  then read the rest without the chrome taking up room.
- **Done when:**
  - The navbar is **80px at the top of a page and shrinks to about 56px once
    the reader scrolls**, and grows back at the top.
  - The **current section is highlighted in the nav**, and the breadcrumb bar
    is gone from top-level pages (Consulting, Labs, About, Projects).
  - The **homepage hero is clearly different from every subpage hero**:
    bigger type, one short supporting line instead of 70 words, the CTA in the
    first screen on a phone, and a **personal visual element** filling the
    empty right half.
  - **Subpage heroes read as heroes**: a band that sets them apart from the
    page body, and on case studies a project visual where the empty right
    side is now.
- **Not doing:**
  - The warm accent palette (`portfolio-warm-accents`). The hero leaves one
    slot open for it and ships on today's greens.
  - Any section below the hero: expertise, grid, contact, footer. Each has
    its own change in the feedback log.
  - Leaving Super, or moving content out of Notion.
  - The phone menu (Super's hamburger stays as it is).
  - Making the final personal illustration. This change builds the frame
    and ships with a placeholder or an existing image if the art is not
    ready.

## Why

The colleague's strongest note was about the **front door**. Today the
homepage hero is built exactly like every subpage hero: same 45px title,
same column layout. On top of that it carries a five-line, 70-word paragraph,
and the right half of the screen is empty. On a phone the title wraps to five
lines and the CTA only just stays in the first screen.

The header is the other half of the first impression, and it stays
expensive for the whole visit. **80px, sticky, never shrinks**: 9% of a
laptop screen for as long as someone reads. Each subpage then adds a 32px
breadcrumb bar under it. That bar does a job the nav should do, because
the nav has **no active state at all** (no class, no `aria-current`, same
colour for every link).

**Designer:** the hero is where the site gets to show taste before it
argues anything. Bigger type and a personal mark do more than another
sentence of credentials. **Engineer:** most of this is CSS that the
site.css pipeline already ships in one PR, and both blockers have known
answers: Super gives us no scroll hook and no active class. **Founder:** this
is the screen every visitor sees, and the "Book a 30m call" conversion
starts here. It is the cheapest high-leverage change in the log.

## What changes

1. **Compact-on-scroll navbar.** 80px at rest, about 56px once scrolled, a
   short transition. Logo and CTA scale with it. No motion with
   `prefers-reduced-motion`: the bar swaps height instantly. Super offers no
   scroll class, so the trigger is ours. Design picks between CSS
   scroll-driven animation (no JS, not in every browser yet) and a small
   sentinel script folded into the existing `components.js` (works
   everywhere, no change to Super's head snippet).
2. **Active nav state; breadcrumb retired where redundant.** Highlight the
   link for the current section, pure CSS via `:has()` on Super's page classes
   (`.page__bhd-consultation` → Consulting; children of the homepage →
   Projects). Add `aria-current` semantics through the same small script, if
   one ships. Hide the breadcrumb bar on top-level pages. Whether deep pages
   (a Labs sub-page, a project under a collection) keep it is a design
   decision. The "Is the breadcrumb needed here?" note on the case study says
   probably not.
3. **Homepage hero as front door.** Bigger display type (a new
   homepage-only size, well above today's 2.5rem), the paragraph cut to one
   line, and the hero sized to take most of the first screen. Copy edits
   happen in Notion. Katy writes the line, and the current paragraph moves
   to About, where it fits better.
4. **Personal visual element.** A slot in the hero's right column (stacked
   under the text on a phone) for a pattern, photo or doodle. Built so the
   artwork is a Notion image, not hard-coded, so Katy can swap it without a
   PR.
5. **Subpage hero band.** A background band, a step off the page colour,
   behind subpage heroes (Consulting, About, case studies). Case studies get
   a project visual on the right, using the Notion cover image they can
   already carry, laid out beside the title instead of above it.

## Capabilities

### New Capabilities

- `portfolio-header`: the navbar's compact-on-scroll behaviour, its active
  state, and when the breadcrumb shows.
- `portfolio-hero`: the homepage front-door hero, the personal visual slot,
  and the subpage hero band with its project visual.

### Modified Capabilities

None. The site.css pipeline (`super-css-control`) is used as it is. This
change adds styles to it and does not change how they ship.

## Impact

- **`public/super/site.css`**: §3 Navbar (compact state, active link,
  breadcrumb visibility) and §4 Page headers (homepage hero scale, hero
  band, case-study cover-beside-title layout). New homepage display size in
  §1 tokens.
- **`public/super/components.js` / `components/loader.js`**, only if design
  picks the script trigger. Folding it in keeps the promise that the Super
  head snippet never changes again. Bump `VERSION` in both.
- **`scripts/super-css/check.mjs`**: add any new Super class hooks the
  styles depend on (e.g. `.super-navbar__item`, `.super-navbar__breadcrumbs`)
  so a Super markup change is caught.
- **Notion (Katy):** homepage hero copy shortened. Personal visual uploaded
  as an image block. Case-study covers set where a project visual exists.
- **Tests:** a jsdom test for the scroll trigger if it is JS. The selector
  check covers the CSS hooks. The manual pass runs on the live site at
  1440 and 390 widths.
- **Figma (required round, blocked this session):** the proposal round
  belongs in a **design file** titled `portfolio-header-hero` (this is a
  surface question), page `02 Proposed`. The Figma MCP server failed to
  connect in the session that wrote this proposal, so the round has not been
  made yet. The as-is captures are ready to place on `01 As-is` once it
  reconnects:
  [`portfolio-feedback-2026-11/as-is/`](../../../experiments/super-css-control/docs/portfolio-feedback-2026-11/as-is/).

## Optional links

- Feedback log and as-is captures: [`experiments/super-css-control/docs/portfolio-feedback-2026-11/README.md`](../../../experiments/super-css-control/docs/portfolio-feedback-2026-11/README.md)
- Pipeline this ships through: [`experiments/super-css-control/README.md`](../../../experiments/super-css-control/README.md)
- Stylesheet: [`public/super/site.css`](../../../public/super/site.css)
- Experiment directory: `experiments/super-css-control/`
