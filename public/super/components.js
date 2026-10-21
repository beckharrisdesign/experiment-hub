/*
 * Notion-callout components for beckharrisdesign.com (Notion → Super).
 *
 * The pattern: write in Notion, enhance here.
 *
 *   You write ordinary Notion blocks — a callout with a bulleted list inside.
 *   The callout's FIRST LINE carries a marker, `::patents`, optionally
 *   followed by a title. This loader finds those callouts, reads their
 *   content, and replaces each with the matching component. If this script
 *   never loads, readers still see a readable Notion callout. Nothing breaks.
 *
 *   ::patents  One attack, five lenses
 *   • Probe — Check serial-number pattern | US 7,123,456 | Out-of-sequence…
 *   • Test — Dollar-variance rings | US 7,234,567 | Widening variance…
 *
 *   First line : `::name` plus an optional title
 *   Each bullet: one item — a label, then fields split by `—` and `|`
 *
 * Why not code blocks or JSON: collaborators edit plain Notion text, content
 * stays with the page it belongs to, and structure + styling live in this
 * repo so every page stays consistent.
 *
 * Install: Super's head code carries one line (see
 * experiments/super-css-control/README.md):
 *
 *   <script type="module" src="https://labs.beckharrisdesign.com/super/components.js"></script>
 *
 * Adding a component: one line in REGISTRY below, one module in components/
 * (plus its .css). A module exports `render(sourceEl, opts)` and returns the
 * finished element; `opts` is the parsed spec (name, title, items) plus the
 * component's CSS text for its shadow root.
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
 * this module runs, and site.css §11 hides it under that attribute — then
 * reveals it after ~2s regardless, as a CSS-only fallback if the component
 * never arrives. On a failed load the marker is stripped and the callout
 * revealed at once.
 *
 * Caching: Vercel serves public/ with `max-age=0, must-revalidate`, so this
 * file is fresh on every page load. The component modules it imports carry
 * `?v=VERSION` as a second guard; bump VERSION when a component changes.
 *
 * Cross-origin: this module, its dynamic imports and the CSS fetch all run
 * from beckharrisdesign.com against labs.beckharrisdesign.com, and unlike a
 * classic <script> every one of them is a CORS request. next.config.js sets
 * `Access-Control-Allow-Origin: *` on /super/* for that reason; without it
 * the browser blocks the module before boot() runs.
 */

/* Resolved against this file's own URL, so the same code serves production
   (labs.beckharrisdesign.com), a Vercel preview, and a local dev server. */
const BASE = new URL('components/', import.meta.url).href;
const VERSION = '1';

/** Marker name → module file in components/. Add new components here. */
export const REGISTRY = {
  patents: 'patents.js',
};

/** Own entries only: `::constructor` or `::__proto__` must not resolve. */
export const isRegistered = (name) => Object.hasOwn(REGISTRY, name);

/** `::name  optional title` — must be the very first line of the callout. */
export const MARK = /^::([\w-]+)(?:[ \t]+(.*))?$/;

const CONTENT_SELECTOR = '.notion-callout__content';

/**
 * @typedef {{ label: string, fields: string[], raw: string }} Item
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
 * `Label — field | field | field`. The label separator is an em dash, an en
 * dash, or a hyphen with space on both sides (so a hyphen inside a word is
 * never one). Missing label → ''.
 * @param {string} text
 * @returns {Item}
 */
export function splitItem(text) {
  const raw = normalize(text);
  const m = raw.match(/^(.*?)\s+[—–-]\s+(.*)$/) ?? raw.match(/^(.*?)[—–](.*)$/);
  const label = m ? m[1].trim() : '';
  const rest = m ? m[2] : raw;
  const fields = rest.split('|').map((f) => f.trim()).filter(Boolean);
  return { label, fields, raw };
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
 * Top-level bullets only: a nested list is detail, not a row.
 * @param {Element} content
 * @returns {Item[]}
 */
function listItems(content) {
  return [...content.querySelectorAll('li')]
    .filter((li) => !li.parentElement?.closest('li'))
    .map((li) => {
      const own = li.cloneNode(true);
      own.querySelectorAll('ul, ol').forEach((n) => n.remove());
      return splitItem(own.textContent);
    })
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
    const url = `${BASE}${file}?v=${VERSION}`;
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
    if (!spec || !isRegistered(spec.name)) continue;
    el.dataset.bhd = spec.name;
    el.dataset.bhdPending = '';
    jobs.push(
      load(spec.name)
        .then(({ mod, css }) => {
          const out = mod.render(el, { ...spec, css });
          out.dataset.bhd = spec.name;
          el.replaceWith(out);
        })
        .catch((err) => {
          console.warn(`[bhd] component "${spec.name}" failed to load`, err);
          revealFallback(el, spec);
        }),
    );
  }
  await Promise.all(jobs);
}

/** Observe the document; coalesce bursts of mutations into one pass. */
export function boot() {
  if (typeof document === 'undefined' || !document.body) return;
  if (window.__bhdComponents) return; // loaded twice — keep the first
  window.__bhdComponents = true;
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
  enhance();
}

// Boot on the live site only. Under test the module is imported for its
// functions, and a boot there would try to import components over the network.
const UNDER_TEST =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITEST) ||
  '__vitest_worker__' in globalThis;
if (typeof window !== 'undefined' && !UNDER_TEST) boot();
