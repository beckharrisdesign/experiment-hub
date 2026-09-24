# Explore — Super CSS Control

## Hypothesis

A portfolio published through a no-code host (Notion → Super) can keep its
custom CSS under **version control, review, and rollback** without changing
anything a visitor sees — by moving the canonical copy into the repo and
reducing the host's custom-code panel to a pointer.

The test is whether the indirection is worth its one real cost: replacing an
inline stylesheet with an external one.

## Why this matters (Personal)

The library is ~630 lines of carefully reasoned overrides. Its comments carry
real judgment — why `overflow-x: clip` belongs on `<html>` and not `<body>`,
why one `!important` is honest and the rest are not, which of Super's paddings
are asymmetric and by how many pixels. That reasoning took iterations to earn.

Its only copy lives in a dashboard textarea. No history, no diff, no review, no
way to answer "what changed, when, and why." One bad paste ends it, and there
is no rollback.

That is the whole problem. It is a maintenance and provenance problem, not an
outage.

## Why this matters (Strategic)

**Proposed: makers.** Tooling that lets a solo practitioner keep craft control
of a professional surface without adopting a team-sized stack.

> ⚠️ Needs Katy's confirmation — see open question at the bottom.

## Who it's for

**Primary user:** Katy. Not proxy mode.

The pattern generalises to anyone running Super / Potion / Feather over Notion
with hand-written CSS, but v1 is built for one site.

## What it does

- Holds the CSS (and later JS) as a versioned file in `public/super/`, served
  from `labs.beckharrisdesign.com` — a domain already on the hub's Vercel project
- Reduces Super's custom-code panel to a single `<link>` that never changes
- Makes every styling change to the portfolio a commit — diffable, reviewable,
  revertable
- Lets the library be edited from a Claude Code session and shipped by merge
- Flags when Super's markup or theme variables move underneath the selectors
  the library depends on

## What it does NOT do

- Does not replace Super or move the portfolio off it — Notion stays the CMS
- Does not change how the site looks — the CSS is already live and working
- Does not manage or generate Notion page content
- Does not provide a GUI, visual editor, or per-page style picker
- Does not do visual regression testing (v1 — compatibility check only)
- Does not ship as a product for other people (v1)

## Current state — measured 2026-09-24

**The library is live and working.** Super v2 compiles custom code into the same
inline `<style>` block that carries the theme variables — the 53,525-byte block
in the server HTML. It is present, identically, on every route checked.

This corrects an earlier reading in this session that concluded the CSS was not
applied. That conclusion came from sampling only the first 400 characters of
that block, seeing `html.theme-dark { --gray-h: … }`, and classifying the whole
thing as stock. The library sits further down the same block.

Verified by removing all injected styles from the DOM and measuring: with zero
added CSS the page already computes `html` at 18px, `.notion-root` at 1200px,
`.notion-text__content` at 810px (= 45rem × 18px), gallery gap 18px, navbar
padding 0 — every one of them the library's own value.

## Compatibility baseline

All six Super theme variables the library depends on are present with the
values its comments assume:

| Variable | Live value | Library assumption |
|---|---|---|
| `--navbar-button-background-color` | `#ADDFE3` | matches `--accent: 173 223 227` |
| `--navbar-button-border-radii` | `50px` | comment says 50px ✓ |
| `--layout-max-width` | `1200px` | matches `--site-max-width` |
| `--color-card-bg` | `#1B4448` | used for table dividers |
| `--primary-font` | Playfair Display stack | used for property labels |
| `--secondary-font` | Roboto stack | — |

Zero missing selectors across 14 class hooks × 5 pages. `/for-babylist` and
`/for-customerio` both carry `page__for-*` **and** `parent-page__index`, exactly
as section 9's scoping assumes.

## The one real cost

Super currently ships the CSS **inline, in the initial HTML**. That is the
fastest possible delivery: zero extra requests, zero round trips, no flash.

An external `<link>` cannot beat that. It adds one cross-origin request on the
critical path — mitigated by `preconnect` and a 24KB file, but not eliminated.

So this experiment trades a small, real load cost for version control. That is
the trade to judge, and it should be stated plainly rather than buried.

## Existing options

| Option | Why it loses |
|---|---|
| **Status quo** — paste into Super's textarea | Fastest delivery, but no history, no review, no rollback, no diff. The reasoning in the comments is one bad paste from gone. |
| **Gist / jsDelivr** | Hosting works, but no PR review, and `raw.githubusercontent.com` serves `text/plain` — browsers refuse it as a stylesheet. |
| **Super's own version history** | Does not exist for custom code. |
| **Move to a static site generator** | Full control, but discards Notion-as-CMS and 404 working routes to solve a styling-provenance problem. |

## Market analysis

Personal-first; TAM is not the deciding input. A real niche exists (Super,
Potion, Feather users who write custom CSS) if this ever generalises. Not
pursued in v1.

## Scorecard

Using the v3 rubric (`rules/scoring-criteria.mdc`, PI/SI/BI 1–5).

| Dimension | Score | Reasoning |
|---|---|---|
| **Personal Impact** | 3 | Solves an occasional problem — provenance and rollback for a library that is currently working fine. Real, but not urgent. Was drafted at 4 on the mistaken belief the CSS was switched off. |
| **Social Impact** | 2 | Infrastructure for one person's portfolio. Minor need beyond the niche. |
| **Business Impact** | 2 | The portfolio is a commercial asset, but this tool is not sold. Differentiation would be a story, not a revenue path. |

**Impact Score: 7 / 15** — shape reads as *Cheap-and-useful*: low ceiling, low
cost, removes a real but non-urgent risk.

> ⚠️ Scores are proposals pending Katy's grade.

> **Schema drift noted:** `openspec/schemas/bhd-experiment/schema.yaml` still
> specifies the retired v1 five-dimension scorecard (B/P/C/$/S). The current
> rule is v3 PI/SI/BI, dated 2026-08. Scored with v3; schema.yaml needs updating.

## Permutations

**1. Self-hosted file + pointer — CHOSEN**
CSS in `public/super/site.css`; one `<link rel="stylesheet">` in Super's head
injection. Versioned, reviewable, editable from a session. Costs one
cross-origin request that does not exist today. A broken hub commit cannot take
the styling down — Vercel only promotes successful builds.

**2. Repo as source, Super as build target — REJECTED (for now)**
Keep the CSS inline in Super for speed, but make the repo canonical and paste on
release. Keeps the performance, adds history. Rejected because the paste step is
manual and unenforced — the two copies drift the moment one is edited in place,
which is exactly today's problem with extra ceremony.

> Worth revisiting if the added request turns out to be noticeable. The gap
> between this and option 1 is automation, not architecture.

**3. Move off Super — REJECTED**
Static site generator, full control of markup and styling. Disproportionate: it
solves a provenance problem by discarding the CMS and the publishing flow.

## Open question

**Strategic Why** — proposed as *makers* above. Confirm, choose another Soul
theme (neurodiversity / environment / other), or mark
`intentionally blank — personal-only experiment`.
