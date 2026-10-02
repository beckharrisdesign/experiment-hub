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

Pasted once into **Super → Settings → Code → Head**. It should never need
editing again.

```html
<link rel="preconnect" href="https://labs.beckharrisdesign.com" crossorigin>
<link rel="preload" href="https://labs.beckharrisdesign.com/super/site.css" as="style">
<link rel="stylesheet" href="https://labs.beckharrisdesign.com/super/site.css">
<script src="https://labs.beckharrisdesign.com/super/redirects.js" async></script>
```

**Head, not Body.** A stylesheet in `<head>` is render-blocking, which is what
prevents a flash of unstyled content. In the body it would guarantee one.

The `preconnect` opens the connection to the asset origin early, hiding most of
the cross-origin handshake behind the rest of the page load. The `preload`
starts the CSS fetch before the parser reaches the stylesheet line.

> **Installed vs. documented.** The live head currently emits the `preload`
> **twice**. Harmless — the browser dedupes the fetch — but it means one copy
> is redundant and should come out of the field next time it is edited.
> Re-read what is actually installed with:
>
> ```bash
> curl -s https://beckharrisdesign.com/ | grep -o '<link[^>]*labs\.beckharrisdesign[^>]*>'
> ```

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

## Current state — 2026-10-02

**The migration is complete.** The external `<link>` is installed in Super's
head and Super no longer holds an inline copy, so `public/super/site.css` is
the only copy applying. Current reading from the check:

```
  delivery : external-link
  remote   : in-sync
  inline   : n/a (not inlined)
  markers  : remote=yes inline=no
  variables: 6/6 present
  selectors: 49/49 present
```

Until this landed, Super compiled its own copy of the library into the same
inline `<style>` block that carries the theme variables, and both copies
applied at once. The `--bhd-css-remote` marker in `site.css` stays anyway —
it is how the check tells the two apart if an inline copy ever comes back.

### The trade, now paid

Super used to ship the CSS *inline in the initial HTML* — the fastest possible
delivery. The external `<link>` costs one cross-origin request on the critical
path; `preconnect`, `preload` and a 25KB file soften it, nothing removes it.

That cost buys version control: history, diff, review and rollback for a
library that had none. It was a real trade, not a free win.

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

Current reading — `external-link`, remote `in-sync`, inline
`n/a (not inlined)`, 6/6 variables, 49/49 selectors. Verbatim output is
under [Current state](#current-state--2026-10-02), so a run can be diffed
against it directly.

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
