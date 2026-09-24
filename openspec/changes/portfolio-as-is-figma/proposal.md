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
| Essay / talk | `/emotional-design-in-the-age-of-ai` | §4 body measure with no collection |

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

**Round 02.1 — sitemap structure**

- Page: `02.1 Proposed — sitemap structure, hierarchy from parent-page classes` (node `7:2`)
- Round 01 left untouched, per the never-edit-a-built-page rule in `rules/figma.mdc`.

The same ten views, arranged as a tree instead of a row. **The hierarchy is read,
not assumed:** Super emits a `parent-page__<slug>` class on every page, so the
structure comes from the live markup.

| Depth | Views | Evidence |
|---|---|---|
| 0 | Home | `page__index`, no `parent-page__*` |
| 1 | Gallery, Project, Curated, Consultation, About, Essay, Labs index, Database | all carry `parent-page__index` |
| 2 | Labs detail | `parent-page__bhd-labs` |

Worth noting the tree is the **Notion page tree, not the navigation**. `/connected-china`
is a child of home by this measure, though a visitor reaches it from the homepage
gallery *and* from `/all-projects`. Any navigation model belongs in `design.md`.

### Two corrections this round forced

**The Essay / talk exemplar was a dead route.** `/what-i-believe` returns **404** —
no `notion-root`, no page classes, nothing rendered. Round 01 named it as the
canonical essay view on the strength of its appearing in `sitemap.xml`. Swapped for
`/emotional-design-in-the-age-of-ai`, which is a real page carrying
`parent-page__index`.

**The sitemap advertises routes that do not resolve.** Auditing all 82 non-history
routes found three 404s:

| Route | Note |
|---|---|
| `/what-i-believe` | dead, advertised in `sitemap.xml` |
| `/design-leadership` | dead, advertised in `sitemap.xml` |
| `/site-unavailable` | Super system page; expected |

The first two are live SEO and UX bugs — crawlers are being pointed at them. Out of
scope for a capture change, and not something to fix quietly inside one; raised
here so it is on the record.

**Round 02.2 — detail views re-parented, readable canvas**

- Page: `02.2 Proposed — detail views re-parented, readable canvas` (node `10:2`)
- Supersedes 02.1; earlier rounds left intact.

Two fixes. The 02.1 canvas was `#143639`, the same colour as the node backgrounds,
so the views dissolved into the ground instead of reading as cards. 02.2 uses a
neutral `#EDEFEF` canvas with dark labels.

And the detail views moved: **Project detail under Projects, Labs detail under Labs**,
rather than both hanging off home.

### This makes it a navigation model, not a containment model

Worth stating plainly, because it changes what the artifact is and the two
structures genuinely disagree:

| View | Markup says | Sitemap places it | Agree? |
|---|---|---|---|
| Labs detail `/bhd-labs/mvds` | `parent-page__bhd-labs` | under Labs index | ✅ |
| Project detail `/connected-china` | `parent-page__index` | under Projects | ❌ |

Notion's containment is flat under home for case studies; the site's *navigation*
is not — a visitor reaches `/connected-china` through the Projects gallery. The
sitemap follows navigation, which is what a sitemap is for. The divergent node
carries the note on the board rather than hiding it.

The consequence is that `parent-page__*` can no longer be the sole source for the
tree. It was sufficient at 02.1 because the tree was flat; it is not sufficient
now. `design.md` should say what the authority is when the two disagree — the
honest answer is likely "navigation, with containment recorded as a second
attribute", but that is a decision, not an observation.

**Round 02.3 — populated views in sitemap structure**

- Page: `02.3 Proposed — populated views in sitemap structure` (node `12:2`)
- Supersedes 02.2. Earlier rounds left intact.

The nodes are now **full-size 1200px frames carrying real content**, not rough
blocks. At 0.25 scale the sitemap nodes were structurally correct but illegible —
you cannot critique type hierarchy, density or rhythm from a grey rectangle. Each
node is now the actual view, and the tree is drawn around them.

**The content is real, not simulated.** Scraped from the live routes, so what is on
the frames is what is on the site: the Connected China project copy with its
Challenges / Approach / Outcomes callout, the Babylist letter with its four case
cards, the six consulting service blocks, the Labs experiment table with real
taglines and statuses, the Cisco / Atlas / Carbonite role history. Simulated copy
would have been the same effort and worth less — real content exposes real length
problems.

| Node | Content source |
|---|---|
| Home | headline, intro, both expertise columns, 8 case-study cards, speaking list |
| Projects | 9 projects with company, year and multi-select tags |
| Curated collection | the Babylist letter, role card, 4 case cards with CTAs |
| Consultation | 6 service blocks with audience lines and body copy |
| About | intro, location, Cisco / Atlas / Carbonite roles with dates |
| Essay / talk | the CMU 70317 lecture write-up |
| Labs index | 3 experiment cards + 6-row utilities table with statuses |
| Database view | 12 rows with type, status and URL property |
| Project detail | Connected China in full — properties, full-bleed callout, press, awards |
| Labs detail | MVDS status, tagline, why-this-matters, hypothesis, the three Why cards |

**Caveat worth stating:** this is a point-in-time scrape. It is illustrative of
structure and density, not a content system of record — Notion remains that. The
staleness risk named in Impact applies to the copy as much as the layout.

**What this round is for:** arguing with the *inventory and the cut* — is this the
right set of ten, is anything missing, is anything here really the same view as
something else. Fidelity is deliberately rough. The detailed as-is pass, the
breakpoint variants and the Visual design table belong to `design.md`, and
numbering continues from 01 there.

## Optional links

- Experiment directory: `experiments/super-css-control/`
- The CSS this reads tokens from: `public/super/site.css`
- Compatibility check: `scripts/super-css/check.mjs`
