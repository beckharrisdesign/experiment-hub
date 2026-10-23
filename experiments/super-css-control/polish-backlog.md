# Portfolio polish backlog

Small fixes found by manual testing of beckharrisdesign.com. Collected here as
they come up; the change boundary gets drawn once the list is complete.

Each item records **where the fix actually lives**, because that decides who can
make it: the stylesheet (`public/super/site.css`, shipped by PR), Notion content,
or a Super dashboard setting. They are not interchangeable.

| # | Fix | Lives in | Status |
|---|---|---|---|
| 1 | CTA label consistency | Notion content | Open — one question |
| 2 | Thumbnail leading the Speaking list | CSS only | Ready |
| 3 | Callout variants without hijacking all | CSS + Notion convention | Open — two questions |
| 4 | Page properties horizontal, not stacked | CSS | Open — one question |
| 5 | Selective lightbox on images | CSS + **new JS file** | Open — one question |
| 6 | Reusable link callout on Labs pages | Notion properties + CSS | Open — one question |

---

## 1. CTA label consistency — "Schedule a conversation"

**Observed:** the hero button on `/` reads "Let's connect!" while the navbar CTA
beside it reads "Schedule a conversation".

**Wanted:** one label for the scheduling CTA everywhere.

**Lives in: Notion content — not CSS.** The label is
`<span class="notion-semantic-string">` inside the link. A stylesheet cannot
change text; `content:` on a pseudo-element would leave the real link text wrong
for screen readers and for anyone copying the link. This is a Notion edit.

### Actual scope — 3 edits, not "all CTAs"

Scanned all 82 non-history routes; 11 CTA buttons exist.

| Current | Count | Routes | Target |
|---|---|---|---|
| `Let's connect!` | 2 | `/`, `/bhd-consultation` | → Schedule a conversation |
| `Let's connect` | 1 | `/all-projects` | → Schedule a conversation |
| `Schedule a conversation` | 2 | `/`, `/bhd-consultation` | already correct |

All five point to the same target: `https://calendar.app.google/jc9qDdyEVvNbTutd6`

**Deliberately excluded** — six project-specific CTAs whose labels describe their
destination, not a scheduling action:

`Explore Connected China`, `Explore Datlas`, `Explore Open India for the Web`,
`Explore project`, `View full documentation`, `View all projects`

### ⚠️ Open question

`/` and `/bhd-consultation` already carry a second "Schedule a conversation"
button further down the page, and the navbar CTA says it on every route. After
this change the homepage shows **three identically-labelled CTAs** — navbar, hero,
and Next steps.

That may be the point (one action, said consistently), or it may read as
repetitive. If the latter, options are to drop the hero button, or vary the hero
label while keeping the destination.

**Needs Katy's call before editing.**

### Verify

After the Notion edit, re-run the CTA scan: zero occurrences of `Let's connect`
in any form, and every scheduling CTA reading `Schedule a conversation`.

---

## 2. Thumbnail at the front of the Speaking list

**Observed:** the "Speaking + teaching" list renders a 30×24 image at the *end* of
each row, beside the year pill. Wanted: a proper thumbnail leading the row.

**Lives in: CSS only.** The images already exist — every row's file property
carries a real asset:

```
emotional_design_in_the_age_of_ai__medium.png
entrepreneurship_is_design__stories_from_a_design_cofounder__medium.png
the_mentor_and_the_machine__scaling_mentorship_in_the_age_of_ai__medium.png
```

No Notion work needed.

### Measured structure

`.notion-collection-list__item` is `display:flex; position:relative`, 846px wide:

| Child | Width | Note |
|---|---|---|
| `a.notion-collection-list__item-anchor` | 846 | `position:absolute` — click overlay |
| `div.notion-property__title` | 501 | the headline |
| `div.notion-collection-list__item-content` | 99 | wraps the next two |
| ↳ `div.notion-property__file` | 38 | **the thumbnail**, img at 30×24 |
| ↳ `div.notion-property__select` | 61 | the year pill |

**The constraint:** the file property is nested inside `__item-content`, a
*sibling* of the title. So `order` cannot move it ahead of the title — `order`
only sorts within one flex parent, and CSS cannot reparent. Setting
`order:-1` on `__item-content` would drag the year pill along with it.

### Approach — absolute placement inside the relative item

```css
.notion-collection-list__item {
  padding-left: 84px;
  min-height: 64px;
  align-items: center;
}
.notion-collection-list__item .notion-property__file {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 68px;
  height: 51px;              /* 4:3, matching §9's card thumbs */
}
.notion-collection-list__item .notion-property__file img {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
```

**Blast radius checked:** `.notion-property__file` appears 3 times on the
homepage and **zero times outside a collection list**, so the scoped selector
touches nothing else. Only one collection list exists on the homepage
(Speaking + teaching).

### Verify

Thumbnails lead each row at 68×51, the year pill stays right-aligned, and the
whole row is still one click target (the anchor overlay stays on top).

---

## 3. Callout variants without hijacking every callout

**Observed:** §5 styles `.notion-callout` unqualified, so every callout in Notion
gets the frosted-panel treatment — and on homepage children, the full-bleed band.
There is no way to opt a callout out or give it a different role.

**Lives in: CSS + a Notion authoring convention.** No new machinery required.

### Super already emits Notion's callout colour as a class

Scanned all 82 non-history routes — 34 callouts, in five distinguishable states:

| Class | Count | Example route |
|---|---|---|
| `notion-callout border` | 10 | `/connected-china` |
| `notion-callout color-default border` | 4 | `/fis-memento` |
| `notion-callout bg-green-light border` | 1 | `/` |
| `notion-callout bg-gray-light border` | 1 | `/bhd-labs-mvds-case-study` |
| `notion-callout bg-blue-light border` | 1 | `/zero-to-one-trill-deep-dive` |

So the hook exists already: **set the callout's colour in Notion, target
`.notion-callout.bg-<colour>-light` in CSS.** Notion's full background palette is
available, not just the three in use.

### Shape of the fix

Invert the current rule. Today the full-bleed band is the default and everything
inherits it; instead make the plain panel the default and let colour opt *in*:

```css
/* base: quiet panel, every callout */
.notion-callout { background: var(--callout-bg); border: none !important; border-radius: .5rem; }

/* opt-in: the full-bleed section band */
.parent-page__index .notion-callout.bg-gray-light { /* the §5 full-bleed treatment */ }

/* opt-in: a tighter inline variant */
.notion-callout.bg-blue-light { /* … */ }
```

### ⚠️ Two things to decide

1. **Which colour means what.** Today's usage is incidental, not semantic — green
   on `/`, gray on the MVDS case study, blue on Trill. Assigning meaning means
   re-colouring existing callouts to match, or the convention starts inconsistent.
2. **Colour becomes load-bearing.** Once `bg-gray-light` means "full-bleed
   section band", a gray callout can no longer just be gray. Worth naming the
   convention in a comment in §5 so the next edit does not break it silently.

### Ruled out

**Emoji icon as the marker.** Notion callouts carry an icon, but **no callout on
the site renders a `notion-callout__icon` element** — Super is not emitting it, so
it cannot be selected on.

---

## 4. Page properties horizontal, not stacked

**Observed:** each key/value pair takes a full-width row. Wanted: each pair as its
own column (label over value), columns flowing left to right.

**Lives in: CSS.**

### What is actually forcing the stack — not your rule

§7 sets `display:flex; flex-wrap:wrap` on `.notion-page__properties-layout`, but
that has no effect, because its only child is a **block-level wrapper**:

```
.notion-page__properties-layout      flex, wrap   ← §7 targets this
  └ .notion-page__properties.middle  display:BLOCK  ← the real culprit
      ├ .notion-page__property        1164px
      ├ .notion-page__property        1164px
      └ …
```

Super emits **three wrapper variants** depending on the page's property-layout
setting — the fix has to handle whichever a page uses:

| Wrapper | Routes |
|---|---|
| `notion-page__properties-layout` | 46 |
| `notion-page__layout-property` | 30 |
| `notion-page__properties middle` | 16 |

### Shape of the fix

Make the inner wrapper the layout context, and stop properties claiming 100%:

```css
.notion-page__properties,
.notion-page__properties-layout > .notion-page__layout-property {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, max-content));
  gap: 1.5rem 3rem;
  align-items: start;
}
.notion-page__property { width: auto !important; max-width: 320px; }
```

§7's existing `width:100%` on `.notion-page__property-name-wrapper` already stacks
label over value *within* a column, which is the wanted behaviour — keep it.

### ⚠️ The thing to decide: long values break this

Of 91 property values across the site, **61 are short (≤60 chars) and 30 are
long**. The longest is 431 characters:

| Chars | Route | Property |
|---|---|---|
| 431 | `/bhd-labs/pdf-metadata-viewer` | Exec Summary |
| 355 | `/bhd-labs/simple-seed-organizer` | Why this matters |
| 352 | `/bhd-labs/openspec-visualizer` | Exec Summary |

A 431-character value in a 320px column is a very tall, very thin ribbon. The rule
cannot tell short metadata from prose. Options:

1. **Split by property type** — `notion-property__select`, `__url`, `__date` go
   horizontal; `__text` stays full width. Mechanical, no authoring discipline.
2. **Cap the count** — first N properties horizontal, rest stacked. Fragile.
3. **Author's call** — a max-width that lets prose wrap to full measure.

Option 1 looks right and is checkable, but **needs Katy's call.**

---

## 5. Selective lightbox on images

**Observed:** wanted a lightbox on *certain* images, controlled from Notion.

### Super already emits lightbox hooks — they are just inert

Every image on the case study page (7 of 7) already renders:

```html
<div class="notion-image align-start page-width">
  <span data-full-size="https://images.spr.so/…/image/public"
        data-lightbox-src="https://images.spr.so/…">
```

**But clicking does nothing** — verified by clicking one and watching the DOM; no
dialog, no modal, body children unchanged. So Super ships the attributes and the
behaviour is off (a Super setting, likely plan-gated — the thing Katy did not want
to pay for).

**This is good news:** `data-full-size` is a per-image, full-resolution URL already
in the DOM. A lightbox needs no Notion change to know *what* to show.

### The per-image marker already exists too

The image block carries Notion's own alignment and width choices as classes:

```
notion-image align-start page-width
```

Both are set per-image in Notion and are not otherwise load-bearing. So
"full-width images lightbox, inline ones do not" is a convention available today —
no hidden checkbox property needed, and nothing new for the UI to surface.

### What this needs that does not exist yet

**A JS file, served the way the CSS is.** `public/super/site.js` on
`labs.beckharrisdesign.com`, injected with a `<script>` beside the existing
`<link>`. That is a natural extension of `super-css-control` and unlocks every
other behavioural fix on this list.

~25 lines: delegate a click listener on `.notion-image.page-width`, read
`data-full-size`, show an overlay, close on Escape or backdrop click.

### ⚠️ Decide first

Is `page-width` the right marker, or should it be a dedicated signal? Using
alignment means an image's *layout* choice and its *lightbox* behaviour become the
same decision, and they may not always agree.

---

## 6. Reusable link callout on Labs detail pages

**Observed:** wanted a repeatable block on each Labs detail page pointing at the
case study, the live link, and the GitHub repo where applicable.

**Lives in: Notion database properties + CSS.** No synced blocks needed.

### The mechanism is already half-built

Labs detail pages are database rows, so properties are reusable by construction —
add one to the database and every row has it. Current state across five pages:

| Page | Properties |
|---|---|
| `/bhd-labs/mvds` | Status, Tagline, Why this matters, Hypothesis |
| `/bhd-labs/etsy-notion-sync` | + Exec Summary |
| `/bhd-labs/figma-grabber` | + **URL** |
| `/bhd-labs/simple-seed-organizer` | + **URL** |
| `/bhd-labs/snap-issue` | Status, Tagline only |

**Two pages already carry a `URL` property** rendering as
`notion-property__url` — the mechanism works, it is just used inconsistently.

### Shape of the fix

1. **Notion:** add `Case study`, `Live URL`, `Repo` as URL properties on the Labs
   database. Empty ones render nothing, so "where applicable" is free.
2. **CSS:** group the URL properties into a band that reads as a callout, using the
   `notion-property__url` type selector — §7 already styles it flush-left with no
   highlight, so this extends existing work rather than fighting it.

Because empty properties do not render, the same rule produces a three-link band
on MVDS and a one-link band on snap-issue with no per-page authoring.

### ⚠️ Decide first

Property **order** is a database-level setting, not per-page. Whatever order these
three take, every Labs page gets it. Worth picking deliberately: probably live link
first (most actionable), then case study, then repo.
