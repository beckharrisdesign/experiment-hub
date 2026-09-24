# Super CSS Control

Version the custom CSS/JS behind **beckharrisdesign.com** in this repo, and
reduce Super's custom-code panel to a single pointer that never changes again.

The portfolio stays on Notion → Super. Only the styling moves.

---

## The file

| | |
|---|---|
| **Source** | `public/super/site.css` |
| **Live URL** | `https://labs.beckharrisdesign.com/super/site.css` |
| **Served by** | the hub's Vercel project (`experiment-hub`), same deploy as labs |

`labs.beckharrisdesign.com` is already a verified custom domain on the hub
project, so the portfolio never references a URL Katy does not own. No DNS
work was needed.

## The snippet

Paste once into **Super → Settings → Code → Head**. It should never need
editing again.

```html
<link rel="preconnect" href="https://labs.beckharrisdesign.com" crossorigin>
<link rel="stylesheet" href="https://labs.beckharrisdesign.com/super/site.css">
```

**Head, not Body.** A stylesheet in `<head>` is render-blocking, which is what
prevents a flash of unstyled content. In the body it would guarantee one.

The `preconnect` opens the connection to the asset origin early, hiding most of
the cross-origin handshake behind the rest of the page load.

## Editing

1. Edit `public/super/site.css` on a branch
2. Open a PR — the diff is the review
3. Merge; Vercel redeploys; the new CSS is live

`cache-control` on the served file is `public, max-age=0, must-revalidate`, so
there is **no cache-busting step** — a merged change is live on the next page
load.

## ⚠️ Why the CSS is not in this directory

This repo deliberately does not deploy on `experiments/**` changes. Both
`vercel.json` (`ignoreCommand`) and `.github/workflows/deploy-hub.yml`
(`paths-ignore`) exclude it, so a file here would be edited and **silently
never shipped**.

The CSS therefore lives in `public/super/`. This directory holds the
experiment's docs and OpenSpec artifacts only.

## Failure modes

| If… | Then… |
|---|---|
| A hub commit breaks the build | Nothing happens. Vercel only promotes successful builds, so the last good CSS stays live. |
| `labs.beckharrisdesign.com` is down | The portfolio renders in Super's stock theme. Degraded, not broken — that is exactly what it looks like today. |
| Super moves a class or theme variable | The affected rules silently stop applying. This is the case the compatibility check exists to catch. |

## Current state — 2026-09-24

**The CSS is already live and working.** Super v2 compiles custom code into the
same inline `<style>` block that carries the theme variables (53,525 bytes in
the server HTML), present identically on every route.

So this experiment is about **provenance, not rescue**: history, diff, review
and rollback for a library that currently has none.

### The trade

Super ships the CSS *inline in the initial HTML* — the fastest possible
delivery. An external `<link>` adds one cross-origin request on the critical
path. `preconnect` and a 24KB file soften it; nothing removes it.

That cost buys version control. It is a real trade, not a free win.

## The check

```bash
node scripts/super-css/check.mjs
```

Four questions, no browser needed. Exit 0 clean, 1 if something needs attention;
`--json` for machine-readable output.

| Check | Answers |
|---|---|
| **delivery** | Is the external `<link>` installed, or is Super still inlining? |
| **drift** | If Super holds an inline copy, does it match `public/super/site.css`? |
| **variables** | Are all six Super theme variables the library reads still defined? |
| **selectors** | Do all 49 classes the library targets still appear in the DOM? |

Current reading — `super-inline`, `in-sync`, 6/6, 49/49.

The drift check compares meaning, not formatting: Super rewrites `.5rem` to
`0.5rem`, strips spaces around `/`, and drops quotes in `[class*="page__for-"]`
when it compiles the CSS in. Whitespace *between* values is preserved, because
`padding: 0 .5rem` and `padding: 0.5rem` are not the same declaration.

## Compatibility baseline

All six Super theme variables the library depends on are present with their
assumed values; zero missing selectors across 14 class hooks x 5 pages. Full
table in
[`openspec/changes/super-css-control/explore.md`](../../openspec/changes/super-css-control/explore.md).

## Artifacts

- Explore: [`openspec/changes/super-css-control/explore.md`](../../openspec/changes/super-css-control/explore.md)
- Schema: `bhd-experiment` (phases explore -> propose -> apply -> archive)
- Code ships via a child change on `experiment-hub-lite`, per `rules/bhd-experiment.mdc`
