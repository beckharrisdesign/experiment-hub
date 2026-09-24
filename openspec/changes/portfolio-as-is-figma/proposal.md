# Proposal — portfolio-as-is-figma

## Human anchor

> "lets start an openspec change so taht we can generate an as is figma of the
> portfolio site right now. create all the main views in the site so far."

## Outcomes

- **Who:** Katy — the portfolio's designer and its only maintainer.
- **Job:** Get a design source of truth for beckharrisdesign.com, which today
  exists only as rendered HTML. Right now any change to the site is authored
  blind, straight into CSS, and reviewed by looking at production.
- **Done when:** Every main view type of the live site is a frame in a Figma
  design file titled `portfolio-as-is-figma`, the portfolio's own tokens are
  defined as Figma variables taken from `public/super/site.css`, and each frame
  is traceable to the live route it was captured from.
- **Not doing:** Redesign. No proposed changes, no cleanup of things that look
  wrong — as-is means as-is, including the parts worth fixing later.

## Why

`super-css-control` put the portfolio's CSS under version control, so the
*rules* are now diffable and reviewable. But there is still no representation of
what those rules produce. The 630 lines describe overrides to a Notion page
rendered by Super; nothing in the repo shows the resulting pages.

That gap has a concrete cost. The library's own comments are full of measurements
taken by inspecting production — "Super ships its own callout padding and it is
ASYMMETRIC (21.6px left / 27px right)", "at ~420px the navbar's own row measures
~449px". Those numbers were earned by looking at a live browser because there was
nowhere else to look. A design file is where that knowledge should accumulate.

It also makes the next change cheaper. With frames to draw on, a portfolio change
can be composed and argued before it is written as CSS — which is the order
`rules/figma.mdc` asks for everywhere else.

## What changes

A new Figma **design file** (not FigJam — this is a set of surfaces, not a flow),
titled `portfolio-as-is-figma`, containing:

**1. The view inventory.** One frame per main view type. The set is derived from
the CSS itself, which is scoped per page shape and therefore already enumerates
them — each section below names the rules that prove the view is distinct:

| View | Route captured | Why it is its own view |
|---|---|---|
| Home | `/` | §4 hides its header; `#page-index` spacer rule |
| Project / case study | `/connected-china` | `.parent-page__index` full-bleed callouts (§5) |
| Gallery collection | `/all-projects` | §6 card grid, §4 hidden header |
| Labs index | `/bhd-labs` | §6 top-cropped covers + §8 borderless tables |
| Labs detail | `/bhd-labs/mvds` | `.parent-page__bhd-labs` header treatment (§4) |
| Database view | `/bhd-database` | §7 page properties incl. `.notion-property__url` |
| Curated collection | `/for-babylist` | §9 in full — the only view with the card row |
| Consultation | `/bhd-consultation` | §5 accent-coloured H2 section labels |
| About | `/katy-harris` | §7 stacked properties at length |
| Essay / talk | `/what-i-believe` | §4 body measure with no collection |

**2. The token set.** Defined as Figma variables, read from the live CSS rather
than sampled by eye:

- `--accent` `#ADDFE3`, `--color-bg-default` `#143639`, `--color-card-bg` `#1B4448`
- `--site-max-width` 1200px, `--content-max-width` 45rem (810px at the 18px base)
- 18px root, 1.6 line-height, Playfair Display display / Roboto body

**3. Breakpoints.** The three the CSS actually defines — 1000px and 640px (§9
card row), 600px (§3 navbar) — not invented ones.

**This file does not subscribe MVDS.** MVDS is the hub's design system; the
portfolio runs on Super's theme and has a different visual language entirely.
Subscribing it here would import a vocabulary this surface does not use.

## Capabilities

### New Capabilities

- `portfolio-figma-source`: a Figma design file holding every main view of
  beckharrisdesign.com as-is, plus the token set its live CSS defines, traceable
  frame-by-frame to the routes captured.

### Modified Capabilities

None.

## Impact

- **New:** one Figma design file, `portfolio-as-is-figma`.
- **Touched in repo:** this change's artifacts only. No app code, no CSS.
- **Depends on:** `public/super/site.css` as the token source — already merged
  (#517, #518) and verified `in-sync` with what the site serves.
- **Risk:** the capture is a point-in-time snapshot. It goes stale the moment the
  CSS or the Notion content changes, and nothing enforces that it does not. Worth
  naming now rather than discovering later; whether to add a staleness check is a
  `design.md` question, not a reason to skip the capture.

## Figma

**Round 01 — as-is inventory** (rough: shape and composition, enough to argue with)

- File: [portfolio-as-is-figma](https://www.figma.com/design/Lqe4n3Ir7zWwnFLd01m9mN/portfolio-as-is-figma?node-id=1-2)
- Page: `02 Proposed`
- Anchor node: `1:2` (page) · tokens block `2:2` · first view frame `2:15`

A **design file**, not a FigJam board — this change is about surfaces, and a board
cannot answer "what does this view actually look like."

Contains the token block (colours, measures and type read from
`public/super/site.css`, plus a `portfolio tokens` variable collection) and all ten
view frames at 1200px:

| # | Frame | Node |
|---|---|---|
| — | Tokens | `2:2` |
| 01 | Home | `2:15` |
| 02 | Project / case study | `2:45` |
| 03 | Gallery collection | `3:2` |
| 04 | Labs index | `3:47` |
| 05 | Labs detail | `3:87` |
| 06 | Database view | `3:103` |
| 07 | Curated collection | `4:2` |
| 08 | Consultation | `4:44` |
| 09 | About | `4:61` |
| 10 | Essay / talk | `4:80` |

Each frame carries a caption naming the route it represents and the CSS section
that makes it a distinct view, so the inventory argues for itself rather than
asking to be taken on trust.

**What this round is for:** arguing with the *inventory and the cut* — is this the
right set of ten, is anything missing, is anything here really the same view as
something else. Fidelity is deliberately rough. The detailed as-is pass, the
breakpoint variants and the Visual design table belong to `design.md`, and
numbering continues from 01 there.

## Optional links

- Experiment directory: `experiments/super-css-control/`
- The CSS this reads tokens from: `public/super/site.css`
- Compatibility check: `scripts/super-css/check.mjs`
