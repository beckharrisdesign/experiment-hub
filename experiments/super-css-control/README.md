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
<script src="https://labs.beckharrisdesign.com/super/components.js" async></script>
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

**The pattern: write in Notion, enhance with the script.** You write ordinary
Notion blocks: a line that starts with a marker (`::links`, plus an optional
title) and a bulleted list right under it. That is the custom block. The
loader finds the marker line, reads the list, and replaces both with the
component. If the script fails to load, readers see a line of text and a
readable list, so nothing breaks.

The same marker on the first line of a callout, with the list inside it,
also works. The callout is optional, not the container.

A block is a callout-sized aside, not a page section: drop one next to the
part of the story it supports, with **one link or several**. A page can carry
as many `::links` blocks as it needs. Thumbnails follow the same rule in both
shapes: an image right below a bullet, indented or not.

Why not code blocks or JSON: collaborators edit plain Notion text, content
stays with the page it belongs to, and structure and styling live in this repo
so every page stays consistent.

### Files

```
public/super/
  components.js          bootstrap: a plain <script src>, imports the loader
  components/
    loader.js            registry, parser, observer, fallback
    links.js             one module per component
    links.css            its styles (loaded into the component's shadow root)
```

Two files for the loader because Super rebuilds its Head code field as React
elements, and a classic `<script src>` is the one shape known to survive that
(it is how `redirects.js` and `lightbox.js` are installed). `components.js`
is therefore plain script and reaches the ES-module loader through a dynamic
`import()`. A `type="module"` install also works; the bootstrap falls back to
its production URL when `document.currentScript` is null.

Plus one hook in `site.css` §11: the host element's layout, and the rule that
hides a marked callout until it has been converted.

### `::links` — external links with a title, description, link and thumbnail

What the content looks like in Notion, anywhere on a page:

```
::links  Patents
- Presenting fraud detection information | https://patents.google.com/patent/US8306889B2 | Connects an analytics-generated alert to appropriate interface components.
- Presenting quasi-periodic activity | https://patents.google.com/patent/US8290845B2 | Visually connects recurring transactions and distinguishes them from other activity.
```

Rules:

- **Marker line:** `::links` plus an optional heading, as a paragraph of its
  own. Every bullet and image directly under it belongs to the block; a
  blank line (or any other block) ends it.
- **Each bullet:** one item. Fields are split by `|` and may come in **any
  order**:

  | Field | How the loader recognises it |
  |---|---|
  | link | a Notion link anywhere in the bullet (select the title, Cmd/Ctrl+K, paste), **or** a field that is a URL |
  | thumbnail | a field that is an image URL (`.png .jpg .jpeg .webp .gif .svg .avif`), **or** an image block right under the bullet, indented or not |
  | title | the first field that is not a URL |
  | description | every remaining non-URL field |

  So `[Title](url) \| Description`, `Title \| url \| Description` and
  `Title \| Description \| url` all render the same.
- **Thumbnail, from Notion:** add an image block directly below the bullet
  (`/image`, upload or paste). It does **not** need to be indented: images
  inside a Notion bullet are fiddly to edit, so an image right after a bullet
  counts as that bullet's thumbnail either way. To swap it, delete the image
  block and add a new one in the same spot. (Or paste an image URL as a field.)
  The pattern, top to bottom:

  ```
  ::links  Patents
  • Title | https://link | Description
  [image]
  • Title | https://link | Description
  [image]
  (blank line — ends the block)
  ```
- **Placeholder thumbnail:** `public/super/components/placeholder-thumb.png`
  (320×320, brand dark teal with an aqua image glyph), served at
  `https://labs.beckharrisdesign.com/super/components/placeholder-thumb.png`.
  The FIS Memento patents block uses uploaded copies of it under each bullet
  until real images replace them.
- **Lightbox:** a thumbnail opens in the site lightbox (`lightbox.js`) like
  any page image, in reading order with the rest of the page's images. Its
  caption is the row's own text: title, an em dash, then the description.
- Nested bullets under an item are ignored, so working notes can live there.
- `::patents` is an alias for `::links`: the first block shipped under that
  name and still works.

### Adding a component

1. One line in `REGISTRY` in `components/loader.js`: `name: 'name.js'`.
2. One module, `components/name.js`, exporting
   `render(sourceEl, opts) → Element`. `opts` is the parsed spec
   (`name`, `title`, `items[{ raw, fields, links, images }]`) plus `css`, the
   text of `components/name.css`, for the shadow root. Each component decides
   what its fields mean.
3. Bump `VERSION` in both `components.js` and `components/loader.js` when a
   shipped component changes.

### Gotchas specific to Super

- **Client-side navigation.** Super is a Next.js app; page changes happen
  without a reload. A MutationObserver re-runs the pass on DOM changes, so a
  callout rendered by a route change is converted the same way.
- **Flash of raw content.** The loader stamps `data-bhd-pending` on a marked
  callout as soon as it runs; `site.css` §11 hides it under that attribute and
  reveals it again after 2 seconds regardless, as a CSS-only fallback in case
  the component never arrives. On a caught failure the loader strips the
  `::name` marker and reveals the callout at once. The window between first
  paint and the bootstrap executing on a cold load is not covered.
- **Caching.** The served files are `max-age=0, must-revalidate`, so the
  bootstrap is fresh on every page load. The loader and component modules are
  imported with `?v=VERSION` as a second guard.
- **Cross-origin.** Every `import()` and `fetch()` the loader makes is a CORS
  request from beckharrisdesign.com to labs. `next.config.js` sets
  `Access-Control-Allow-Origin: *` on `/super/*`; `tests/ci/super-cors-headers.test.ts`
  pins it.
- **Style isolation.** Super's theme CSS uses a lot of `!important`, so
  components render inside a Shadow DOM. Inherited properties (`font-family`,
  `color`, `line-height`) and custom properties (`--accent`, `--primary-font`)
  cross the boundary on their own; `@font-face` is document-level, so the
  site's fonts simply work. Nothing else gets in.

### Debugging on the live site

In the browser console on any page:

```js
bhdComponents.report()   // every callout the loader saw, and what it made of it
```

`undefined` means the bootstrap never ran: check the head line is installed
and `labs.beckharrisdesign.com/super/components.js` loads in the Network tab.
A row reading `no marker` is a callout without a marker (plain paragraphs
are not listed); `unknown component` means the name is not in the registry;
`failed: …` names the error. `shape` says whether the block was a marker
paragraph (`block`) or a callout.

### Who edits what

| What | Where | Who |
|---|---|---|
| Content (links, copy, thumbnails) | Notion callouts | Anyone with Notion access |
| Structure and styles | GitHub, then deployed to labs | Katy, through PR review |
| Adding a new component type | One registry line plus one module | Katy |

### Testing

`tests/scripts/super-components.test.ts` builds the markup Super emits (a
marker paragraph with one `<ul>` per bullet, and the callout form) and covers
the loader–component contract in jsdom: marker parsing, item parsing (fields,
Notion links, nested images), block detection and where it stops, replacement
in place, idempotence, the unknown-marker and failed-load paths, and the
`::links` render including the thumbnail and link rules. The live site cannot
be reached from CI, so a browser smoke test is manual: serve `public/`
locally, load a page carrying the block above with a plain `<script src>`,
and check that an `<aside data-bhd="links">` with a shadow root took its
place between the surrounding paragraphs.

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

### Components — 2026-10-21

The `components.js` line is installed in Super's head alongside the lightbox
and redirects lines (PR #546; first installed as `type="module"`, which the
bootstrap now also tolerates — the plain `<script src>` form in the snippet
above is the one to prefer). The first callout is a `::patents` block on the
patents page, now served by the generic `::links` component. Automated
coverage is the jsdom suite in `tests/scripts/super-components.test.ts` and
the CORS rule pinned by `tests/ci/super-cors-headers.test.ts`.

Nothing in the compat check watches the components yet. The hooks it would
need to watch are the two the loader depends on — `.notion-callout` and
`.notion-callout__content` — and both are already in its selector list via
`site.css`, so a Super markup change that breaks the loader shows up there.

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
