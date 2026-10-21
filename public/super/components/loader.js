/*
 * Notion-callout components for beckharrisdesign.com (Notion → Super).
 * This is the loader proper. ../components.js is the one-line bootstrap that
 * imports it, so that Super's head code can carry a plain classic
 * <script src> like the lightbox and redirects lines.
 *
 * The pattern: write in Notion, enhance here.
 *
 *   You write ordinary Notion blocks — a callout with a bulleted list inside.
 *   The callout's FIRST LINE carries a marker, `::patents`, optionally
 *   followed by a title. The loader finds those callouts, reads their
 *   content, and replaces each with the matching component. If the script
 *   never loads, readers still see a readable Notion callout. Nothing breaks.
 *
 *   ::links  Patents
 *   • Presenting fraud detection information | https://patents.google.com/patent/… | Connects an alert to the right evidence…
 *   • Presenting quasi-periodic activity | https://… | Visually connects recurring transactions…
 *
 *   First line : `::name` plus an optional title
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

export const VERSION = '2';

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
 * images nested under it (an image block indented under the bullet renders
 * inside the <li>). Nested lists are detail, not part of the item.
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
    .map(parseItem)
    .filter((item) => item.raw);
}

/**
 * @param {Element} el  a `.notion-callout`
 * @returns {Spec | null}  null when the callout carries no marker
 */
export function parseCallout(el) {
  const content = el.querySelector(CONTENT_SELECTOR) ?? el;
  const mark = parseMarker(firstLine(content));
  if (!mark) return null;
  return { ...mark, items: listItems(content) };
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
 * Component failed to arrive: show the Notion callout as written, minus the
 * marker, so readers get the content and nobody sees `::patents`.
 * @param {Element} el
 * @param {Spec} spec
 */
function revealFallback(el, spec) {
  const content = el.querySelector(CONTENT_SELECTOR) ?? el;
  for (const child of content.children) {
    if (child.matches('ul, ol')) break;
    if (normalize(child.textContent).startsWith('::')) {
      child.textContent = spec.title;
      break;
    }
  }
  el.removeAttribute('data-bhd-pending');
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
  for (const el of root.querySelectorAll('.notion-callout:not([data-bhd])')) {
    const spec = parseCallout(el);
    if (!spec) {
      if (!noted.has(el)) {
        noted.add(el);
        seen.push({ first: firstLine(el.querySelector(CONTENT_SELECTOR) ?? el).slice(0, 60), status: 'no marker' });
      }
      continue;
    }
    if (!isRegistered(spec.name)) {
      if (!noted.has(el)) {
        noted.add(el);
        seen.push({ first: `::${spec.name}`, status: 'unknown component' });
      }
      continue;
    }
    el.dataset.bhd = spec.name;
    el.dataset.bhdPending = '';
    const entry = { first: `::${spec.name}`, status: 'loading', items: spec.items.length };
    seen.push(entry);
    jobs.push(
      load(spec.name)
        .then(({ mod, css }) => {
          const out = mod.render(el, { ...spec, css });
          out.dataset.bhd = spec.name;
          el.replaceWith(out);
          entry.status = 'rendered';
        })
        .catch((err) => {
          console.warn(`[bhd] component "${spec.name}" failed to load`, err);
          revealFallback(el, spec);
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
  enhance().then(() => console.debug(`[bhd] components v${VERSION}: ${seen.length} callout(s) seen — bhdComponents.report() for detail`));
}
