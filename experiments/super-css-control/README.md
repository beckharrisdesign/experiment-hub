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
<script src="https://labs.beckharrisdesign.com/super/lightbox.js" async></script>
<script type="module" src="https://labs.beckharrisdesign.com/super/components.js"></script>
```

> **Lightbox.** `public/super/lightbox.js` (styles in `site.css` §10)
> replaces Super's stock lightbox snippet. Remove Super's two lines that load
> `sites.super.so/snippets/v2/lightbox.css` and `…/lightbox.js`. If they are
> still installed nothing breaks: this script handles the click in the capture
> phase first, so Super's overlay never opens — but it is dead weight.
>
> Adds over the stock one: prev/next (arrows, buttons, swipe), Notion caption
> + counter, a larger Cloudflare variant (up to the original's size, vs the
> page's 1920px), click/Z to zoom to full size and pan, Esc, focus trap and
> focus return, keyboard-openable images, scroll lock, reduced motion.

> **Components.** `public/super/components.js` turns marked Notion callouts
> into components. See [Components](#components) below.

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

## Components

**The pattern: write in Notion, enhance with the script.** You write the
content in normal Notion blocks: a callout with a bulleted list inside. A
marker on the callout's first line (`::patents`) tells the loader what to
build. The loader finds those blocks, reads their content and replaces them
with the component. If the script fails to load, readers still see a readable
Notion callout, so nothing breaks.

Why not code blocks or JSON: collaborators edit plain Notion text, content
stays with the page it belongs to, and structure and styling live in this repo
so every page stays consistent.

### Files

```
public/super/
  components.js          loader + registry
  components/
    patents.js           one module per component
    patents.css          its styles (loaded into the component's shadow root)
```

Plus one hook in `site.css` §11: the host element's layout, and the rule that
hides a marked callout until it has been converted.

### What the content looks like in Notion

A callout block:

```
::patents  One attack, five lenses
• Probe — Check serial-number pattern | US 7,123,456 | Out-of-sequence serials flag access testing
• Test — Dollar-variance rings | US 7,234,567 | Widening variance tests owner attention
• Exploit — Multi-balance float | US 7,345,678 | Balances diverge as the kite widens
```

Rules:

- **First line:** `::name` plus an optional title.
- **Each bullet:** one item. A label, then fields split by `—` and `|`. The
  label separator may be an em dash, an en dash, or ` - ` with spaces on both
  sides (a hyphen inside a word is never one). Nested bullets are ignored.

### `::patents`

| Field | Meaning |
|---|---|
| label | the lens: Probe, Test, Exploit… |
| 1 | the claim, in plain words |
| 2 | the patent number. A real one (`US 7,123,456`, `US 9,876,543 B2`) links to Google Patents; a placeholder (`US X,XXX,XXX`) stays as text |
| 3 | the one-line note |

### Adding a component

1. One line in `REGISTRY` in `components.js`: `name: 'name.js'`.
2. One module, `components/name.js`, exporting
   `render(sourceEl, opts) → Element`. `opts` is the parsed spec
   (`name`, `title`, `items[{ label, fields, raw }]`) plus `css`, the text of
   `components/name.css`, for the shadow root.
3. Bump `VERSION` in `components.js` when a shipped component changes.

### Gotchas specific to Super

- **Client-side navigation.** Super is a Next.js app; page changes happen
  without a reload. A MutationObserver re-runs the pass on DOM changes, so a
  callout rendered by a route change is converted the same way.
- **Flash of raw content.** The loader stamps `data-bhd-pending` on a marked
  callout as soon as it runs; `site.css` §11 hides it under that attribute and
  reveals it again after 2 seconds regardless, as a CSS-only fallback in case
  the component never arrives. On a caught failure the loader strips the
  `::name` marker and reveals the callout at once. The window between first
  paint and the module executing on a cold load is not covered; module scripts
  run after parsing, so on most pages it is not visible.
- **Caching.** The served files are `max-age=0, must-revalidate`, so the
  loader is fresh on every page load. Component modules are imported with
  `?v=VERSION` as a second guard.
- **Style isolation.** Super's theme CSS uses a lot of `!important`, so
  components render inside a Shadow DOM. Inherited properties (`font-family`,
  `color`, `line-height`) and custom properties (`--accent`, `--primary-font`)
  cross the boundary on their own; `@font-face` is document-level, so the
  site's fonts simply work. Nothing else gets in.

### Who edits what

| What | Where | Who |
|---|---|---|
| Content (patents, copy) | Notion callouts | Anyone with Notion access |
| Structure and styles | GitHub, then deployed to labs | Katy, through PR review |
| Adding a new component type | One registry line plus one module | Katy |

### Testing

`tests/scripts/super-components.test.ts` builds the callout markup Super emits
and covers the loader–component contract in jsdom: marker parsing, item
splitting, replacement, idempotence, the unknown-marker and failed-load paths,
and the patents render including the Google Patents link rule. The live site
cannot be reached from CI, so a browser smoke test is manual: serve `public/`
locally, load a page carrying the callout above, and check that an
`<aside data-bhd="patents">` with a shadow root took its place.

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
  variables: 7/7 present
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
| **variables** | Is every Super theme variable the library reads still defined? |
| **selectors** | Does every class the library targets still appear in the DOM? |

Current reading — `external-link`, remote `in-sync`, inline
`n/a (not inlined)`, 7/7 variables, 49/49 selectors. Verbatim output is
under [Current state](#current-state--2026-10-02), so a run can be diffed
against it directly.

The drift check compares meaning, not formatting: Super rewrites `.5rem` to
`0.5rem`, strips spaces around `/`, and drops quotes in `[class*="page__for-"]`
when it compiles the CSS in. Whitespace *between* values is preserved, because
`padding: 0 .5rem` and `padding: 0.5rem` are not the same declaration.

## Compatibility baseline

All seven Super theme variables the library depends on are present with their
assumed values; zero missing selectors across 14 class hooks x 5 pages.

The table in explore.md covers the original six. `--column-spacing` joined
them when the page properties moved onto the same column grid as the block
columns below them — the library now reads that variable rather than
hard-coding a gap, so the two grids cannot drift apart. Full table in
[`openspec/changes/super-css-control/explore.md`](../../openspec/changes/super-css-control/explore.md).

## Artifacts

- Explore: [`openspec/changes/super-css-control/explore.md`](../../openspec/changes/super-css-control/explore.md)
- Schema: `bhd-experiment` (phases explore -> propose -> apply -> archive)
- Code ships via a child change on `experiment-hub-lite`, per `rules/bhd-experiment.mdc`
