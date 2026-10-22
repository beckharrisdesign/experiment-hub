/*
 * Notion-callout components for beckharrisdesign.com (Notion → Super).
 * This is the loader proper. ../components.js is the one-line bootstrap that
 * imports it, so that Super's head code can carry a plain classic
 * <script src> like the lightbox and redirects lines.
 *
 * The pattern: write in Notion, enhance here.
 *
 *   You write ordinary Notion blocks: a line that starts with a marker,
 *   `::links`, optionally followed by a title, and a bulleted list right
 *   under it. That is the custom block. The loader finds the marker line,
 *   reads the list, and replaces both with the matching component. If the
 *   script never loads, readers see a line of text and a readable list.
 *   Nothing breaks.
 *
 *   ::links  Patents
 *   • Presenting fraud detection information | https://patents.google.com/patent/… | Connects an alert to the right evidence…
 *   • Presenting quasi-periodic activity | https://… | Visually connects recurring transactions…
 *
 *   Marker line: `::name` plus an optional title, as its own paragraph
 *                anywhere on the page — or as the first line of a callout
 *                with the list inside it; both shapes work.
 *   Each bullet: one item. Fields split by `|`; a Notion link anywhere in
 *                the bullet (select text, Cmd/Ctrl+K) is picked up as the
 *                item's link, and an image block nested under the bullet as
 *                its image, so neither needs a bare URL field.
 *
 * Each component decides what its fields mean; see components/<name>.js.
 *
 * Why not code blocks or JSON: collaborators edit plain Notion text, content
 * stays with the page it belongs to, and structure + styling live in this
 * repo so every page stays consistent.
 *
 * Adding a component: one line in REGISTRY below, one module in this
 * directory (plus its .css). A module exports `render(sourceEl, opts)` and
 * returns the finished element; `opts` is the parsed spec (name, title,
 * items) plus the component's CSS text for its shadow root.
 *
 * Super is a Next.js app: pages change without a reload, so a
 * MutationObserver re-runs the pass on DOM changes instead of once on load.
 *
 * Style isolation: Super's theme CSS leans on !important, so components render
 * inside a Shadow DOM. Inherited properties (font-family, color, line-height)
 * and custom properties (--accent, --primary-font) cross the boundary on
 * their own; nothing else does. @font-face is document-level, so fonts work.
 *
 * Flash of raw content: a marked callout gets `data-bhd-pending` the moment
 * the loader runs, and site.css §11 hides it under that attribute — then
 * reveals it after ~2s regardless, as a CSS-only fallback if the component
 * never arrives. On a failed load the marker is stripped and the callout
 * revealed at once.
 *
 * Caching: Vercel serves public/ with `max-age=0, must-revalidate`, so the
 * bootstrap is fresh on every page load. It imports this file, and this file
 * imports components, with `?v=VERSION`; bump VERSION (in both places) when
 * a shipped component changes.
 *
 * Cross-origin: every import() and fetch() here runs from beckharrisdesign.com
 * against labs.beckharrisdesign.com and is a CORS request. next.config.js
 * sets `Access-Control-Allow-Origin: *` on /super/* for that reason.
 *
 * Debugging on the live site: `bhdComponents.report()` in the console lists
 * every callout the loader saw and what it made of it.
 */

export const VERSION = '5';

/** Marker name → module file in this directory. Add new components here. */
export const REGISTRY = {
  links: 'links.js',
  patents: 'links.js', // alias: the first callout shipped under this name
};

/** Own entries only: `::constructor` or `::__proto__` must not resolve. */
export const isRegistered = (name) => Object.hasOwn(REGISTRY, name);

/** `::name  optional title` — must be the very first line of the callout. */
export const MARK = /^::([\w-]+)(?:[ \t]+(.*))?$/;

const CONTENT_SELECTOR = '.notion-callout__content';
/* Where a marker can live: a callout's first line, or a paragraph of its own
   (Super renders a Notion paragraph as `.notion-text`; `p` covers any other
   host). Lists are never candidates themselves — they belong to the marker
   paragraph above them. */
const CANDIDATE_SELECTOR = '.notion-callout, .notion-text, p';

/**
 * @typedef {{ href: string, text: string }} Link
 * @typedef {{ raw: string, fields: string[], links: Link[], images: string[] }} Item
 * @typedef {{ name: string, title: string, items: Item[] }} Spec
 * @typedef {{ render: (el: Element, opts: Spec & { css: string }) => Element }} ComponentModule
 */

/**
 * @param {string} text  the callout's text, first line first
 * @returns {{ name: string, title: string } | null}
 */
export function parseMarker(text) {
  const first = String(text ?? '').trim().split('\n')[0].trim();
  const m = first.match(MARK);
  return m ? { name: m[1], title: (m[2] ?? '').trim() } : null;
}

/**
 * One bullet: its text split on `|`, any links Notion put in it, and any
 * images inside the <li> itself. Super renders an image block indented under
 * the bullet as the <li>'s next sibling instead; listItems() picks those up
 * via trailingImages(). Nested lists are detail, not part of the item.
 * @param {Element} li
 * @returns {Item}
 */
export function parseItem(li) {
  const own = li.cloneNode(true);
  own.querySelectorAll('ul, ol').forEach((n) => n.remove());
  const images = [...own.querySelectorAll('img[src]')]
    .map((img) => img.getAttribute('src') ?? '')
    .filter((src) => /^(https?:)?\/\//i.test(src));
  own.querySelectorAll('img, figure, figcaption, .notion-image').forEach((n) => n.remove());
  const links = [...own.querySelectorAll('a[href]')]
    .map((a) => ({ href: a.getAttribute('href') ?? '', text: normalize(a.textContent) }))
    .filter((l) => /^https?:\/\//i.test(l.href));
  const raw = normalize(own.textContent);
  const fields = raw.split('|').map((f) => f.trim()).filter(Boolean);
  return { raw, fields, links, images };
}

/**
 * The callout's first line of text, as the marker.
 * Reads textContent (not innerText) so it works before layout and in jsdom.
 * @param {Element} content
 */
function firstLine(content) {
  for (const child of content.children) {
    if (child.matches('ul, ol')) break;
    const t = normalize(child.textContent);
    if (t) return t.split('\n')[0];
  }
  return normalize(content.textContent).split('\n')[0];
}

/**
 * Top-level bullets only.
 * @param {Element} content
 * @returns {Item[]}
 */
function listItems(content) {
  return [...content.querySelectorAll('li')]
    .filter((li) => !li.parentElement?.closest('li'))
    .map((li) => {
      const item = parseItem(li);
      item.images.push(...trailingImages(li));
      return item;
    })
    .filter((item) => item.raw);
}

/**
 * Images nested under a bullet, as Super actually renders them: the image
 * block is the <li>'s next sibling inside the same <ul>, not inside the <li>.
 * Collects from every sibling up to the next bullet; nested lists are skipped.
 * @param {Element} li
 * @returns {string[]}
 */
function trailingImages(li) {
  const srcs = [];
  for (let sib = li.nextElementSibling; sib && !sib.matches('li'); sib = sib.nextElementSibling) {
    if (sib.matches('ul, ol')) continue;
    srcs.push(...imageSrcs(sib));
  }
  return srcs;
}

/**
 * @param {Element} el  a `.notion-callout`
 * @returns {Spec | null}  null when the callout carries no marker
 */
export function parseCallout(el) {
  const content = el.querySelector(CONTENT_SELECTOR) ?? el;
  const mark = parseMarker(firstLine(content));
  if (!mark) return null;
  // Same rule as the plain block: an image block right after a bullet, not
  // indented, is that bullet's thumbnail.
  const items = [];
  for (const child of content.children) {
    if (isImageBlock(child)) {
      if (items.length) items[items.length - 1].images.push(...imageSrcs(child));
    } else if (child.matches('ul, ol') || child.querySelector('li')) {
      items.push(...listItems(child));
    }
  }
  return { ...mark, items };
}

/** A list block, as Super renders one: the <ul>/<ol> itself or a wrapper around one. */
function isList(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.matches('ul, ol')) return true;
  if (el.matches('[class*="notion-list"]')) return true;
  return el.children.length === 1 && el.firstElementChild.matches('ul, ol');
}

/** An image block, as Super renders one: `div.notion-image` (or a bare figure/img). */
function isImageBlock(el) {
  if (!el || el.nodeType !== 1) return false;
  return el.matches('.notion-image, figure, img');
}

/** The image URLs in an image block. */
function imageSrcs(el) {
  return (el.matches('img[src]') ? [el] : [...el.querySelectorAll('img[src]')])
    .map((img) => img.getAttribute('src') ?? '')
    .filter((src) => /^(https?:)?\/\//i.test(src));
}

/**
 * @typedef {{ spec: Spec, parts: Element[], kind: 'callout' | 'block' }} Block
 *   `parts[0]` is the element the component replaces; the rest are removed
 *   with it (the lists and images under a marker paragraph).
 */

/**
 * The custom block: a marker paragraph plus every list and image block that
 * follows it directly, or a callout carrying the marker on its first line.
 * An image block right after a bullet, not indented, is that bullet's
 * thumbnail: editing an image inside a Notion bullet is fiddly, so the block
 * accepts it either way. A blank line or any other block ends it; an image
 * before the first bullet is not part of it.
 * @param {Element} el  a candidate (see CANDIDATE_SELECTOR)
 * @returns {Block | null}  null when `el` is not a marked block
 */
export function parseBlock(el) {
  if (el.matches('.notion-callout')) {
    const spec = parseCallout(el);
    return spec && { spec, parts: [el], kind: 'callout' };
  }
  if (el.closest('.notion-callout, li')) return null; // a callout's own text, or a bullet
  const mark = parseMarker(normalize(el.textContent));
  if (!mark) return null;
  const parts = [el];
  const items = [];
  for (let sib = el.nextElementSibling; sib; sib = sib.nextElementSibling) {
    if (isList(sib)) {
      items.push(...listItems(sib));
    } else if (isImageBlock(sib) && items.length) {
      items[items.length - 1].images.push(...imageSrcs(sib));
    } else {
      break;
    }
    parts.push(sib);
  }
  return { spec: { ...mark, items }, parts, kind: 'block' };
}

/** Collapse whitespace runs, keep line breaks meaningful, trim. */
function normalize(s) {
  return String(s ?? '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** Component module + its stylesheet text, fetched in parallel and cached. */
const cache = new Map();
/** @returns {Promise<{ mod: ComponentModule, css: string }>} */
function loadComponent(name) {
  if (!cache.has(name)) {
    if (!isRegistered(name)) return Promise.reject(new Error(`[bhd] unknown component "${name}"`));
    const file = REGISTRY[name];
    const url = new URL(`${file}?v=${VERSION}`, import.meta.url).href;
    const cssUrl = url.replace(/\.js\?/, '.css?');
    const p = Promise.all([
      import(/* @vite-ignore */ url),
      fetch(cssUrl).then((r) => (r.ok ? r.text() : '')).catch(() => ''),
    ]).then(([mod, css]) => ({ mod, css }));
    p.catch(() => cache.delete(name)); // let the next pass retry
    cache.set(name, p);
  }
  return cache.get(name);
}

/**
 * Component failed to arrive: show the Notion content as written, minus the
 * marker, so readers get the list and nobody sees `::links`.
 * @param {Block} block
 */
function revealFallback({ spec, parts, kind }) {
  const [el] = parts;
  if (kind === 'callout') {
    const content = el.querySelector(CONTENT_SELECTOR) ?? el;
    for (const child of content.children) {
      if (child.matches('ul, ol')) break;
      if (normalize(child.textContent).startsWith('::')) {
        child.textContent = spec.title;
        break;
      }
    }
  } else {
    const text = el.querySelector('.notion-text__content') ?? el;
    text.textContent = spec.title;
  }
  for (const part of parts) part.removeAttribute('data-bhd-pending');
  el.dataset.bhdState = 'failed';
}

/** What the passes saw, for `bhdComponents.report()`. Each callout once. */
const seen = [];
const noted = new WeakSet();

/**
 * One pass over `root`: mark, load, replace. Idempotent — a callout is
 * claimed with `data-bhd` on first sight and never looked at again.
 * @param {ParentNode} [root]
 * @param {{ load?: (name: string) => Promise<{ mod: ComponentModule, css: string }> }} [deps]
 */
export async function enhance(root = document, { load = loadComponent } = {}) {
  const jobs = [];
  for (const el of root.querySelectorAll(CANDIDATE_SELECTOR)) {
    if (el.hasAttribute('data-bhd')) continue;
    const block = parseBlock(el);
    if (!block) {
      // Only callouts are worth a line in the report; every paragraph is not.
      if (el.matches('.notion-callout') && !noted.has(el)) {
        noted.add(el);
        seen.push({ first: firstLine(el.querySelector(CONTENT_SELECTOR) ?? el).slice(0, 60), status: 'no marker' });
      }
      continue;
    }
    const { spec, parts, kind } = block;
    if (!isRegistered(spec.name)) {
      if (!noted.has(el)) {
        noted.add(el);
        seen.push({ first: `::${spec.name}`, status: 'unknown component', shape: kind });
      }
      continue;
    }
    el.dataset.bhd = spec.name;
    for (const part of parts) part.dataset.bhdPending = '';
    const entry = { first: `::${spec.name}`, status: 'loading', items: spec.items.length, shape: kind };
    seen.push(entry);
    jobs.push(
      load(spec.name)
        .then(({ mod, css }) => {
          const out = mod.render(el, { ...spec, css });
          out.dataset.bhd = spec.name;
          el.replaceWith(out);
          for (const part of parts.slice(1)) part.remove();
          entry.status = 'rendered';
        })
        .catch((err) => {
          console.warn(`[bhd] component "${spec.name}" failed to load`, err);
          revealFallback(block);
          entry.status = `failed: ${err?.message ?? err}`;
        }),
    );
  }
  await Promise.all(jobs);
}

/** Console helper: what did the loader see on this page? */
export function report() {
  if (!seen.length) console.info('[bhd] no .notion-callout seen yet');
  else console.table(seen);
  return seen;
}

/** Observe the document; coalesce bursts of mutations into one pass. */
export function boot() {
  if (typeof document === 'undefined' || !document.body) return;
  if (window.__bhdLoaderBooted) return; // loaded twice — keep the first
  window.__bhdLoaderBooted = true;
  window.bhdComponents = { enhance, report, VERSION };
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  enhance().then(() => console.debug(`[bhd] components v${VERSION}: ${seen.length} block(s) seen — bhdComponents.report() for detail`));
}
