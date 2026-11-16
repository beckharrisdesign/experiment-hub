/*
 * Navbar and hero behaviour for beckharrisdesign.com (Notion → Super).
 * OpenSpec change portfolio-header-hero, design.md decisions 1–4 and 15.
 *
 * Super gives the site three things it does not supply on its own, so this
 * module adds them. All three degrade to today's site when it never loads:
 *
 *   1. A scroll class. `bhd-nav-compact` on <html> once the reader is past
 *      80px; site.css §3 shrinks the navbar under it. No script, no shrink.
 *   2. The current nav link. `aria-current="page"` on the link for the
 *      section the reader is in; site.css §3 styles that attribute. The nav
 *      sits OUTSIDE <main>, so CSS alone cannot see the page classes.
 *   3. Case-study hero measurements. On a case study with a Notion cover,
 *      `--hero-top` and `--hero-h` on <main>, so site.css §4 can place the
 *      cover as hero art: the cover lives in .notion-header and the text in
 *      .notion-root, two different parents, so no CSS box spans the hero.
 *      It also marks <main data-bhd-hero="cover">, which is what site.css
 *      keys the placement on. No script: the cover stays where Super puts
 *      it, above the title.
 *
 * The loader (loader.js) calls `chromePass()` on every DOM pass, because
 * Super is a Next.js app and swaps <main> on navigation without a reload.
 */

/** Past this many pixels of scroll the navbar goes compact (design.md 1). */
export const COMPACT_AT = 80;
export const COMPACT_CLASS = 'bhd-nav-compact';

/** @param {number} scrollY */
export const isCompact = (scrollY) => scrollY > COMPACT_AT;

/**
 * @param {Element} root  <html>
 * @param {number} scrollY
 */
export function updateCompact(root, scrollY) {
  root.classList.toggle(COMPACT_CLASS, isCompact(scrollY));
}

/** A nav href as a bare path: no origin, no trailing slash ("/" stays "/"). */
function pathOf(href) {
  try {
    const p = new URL(href, 'https://beckharrisdesign.com').pathname;
    return p.length > 1 ? p.replace(/\/+$/, '') : '/';
  } catch {
    return null;
  }
}

/**
 * Which nav link is current, read only from <main>'s classes and the nav's
 * own hrefs, so a new nav item joins with no code change (design.md 4):
 *   1. page__<slug>         with a link to /<slug>  → that link
 *   2. parent-page__<slug>  with a link to /<slug>  → that link (Labs sub-pages)
 *   3. page__index, page__all-projects, parent-page__index → Projects ("/")
 *   4. anything else → none (grandchildren keep their breadcrumb)
 * @param {Iterable<string>} classes  <main>'s class list
 * @param {string[]} hrefs  the nav links' paths
 * @returns {string | null}
 */
export function currentHref(classes, hrefs) {
  const list = [...classes];
  const paths = new Set(hrefs.map(pathOf).filter(Boolean));
  const page = list.find((c) => c.startsWith('page__'))?.slice('page__'.length);
  const parent = list.find((c) => c.startsWith('parent-page__'))?.slice('parent-page__'.length);
  if (page && paths.has(`/${page}`)) return `/${page}`;
  if (parent && paths.has(`/${parent}`)) return `/${parent}`;
  if ((page === 'index' || page === 'all-projects' || parent === 'index') && paths.has('/')) return '/';
  return null;
}

/** @param {Document} doc */
export function applyNav(doc) {
  const main = doc.querySelector('main.super-content');
  const links = [...doc.querySelectorAll('.super-navbar .super-navbar__item[href]')];
  if (!main || !links.length) return;
  const target = currentHref(main.classList, links.map((a) => a.getAttribute('href') ?? ''));
  for (const a of links) {
    if (target && pathOf(a.getAttribute('href') ?? '') === target) {
      if (a.getAttribute('aria-current') !== 'page') a.setAttribute('aria-current', 'page');
    } else if (a.hasAttribute('aria-current')) {
      a.removeAttribute('aria-current');
    }
  }
}

/** Blocks that end a case-study hero: the first callout, heading or divider. */
const HERO_END = '.notion-callout, h2, .notion-divider';

/**
 * The case-study hero's blocks: the header's title block, then every
 * .notion-root child up to the first HERO_END (design.md 14).
 * @param {Element} main
 */
function heroBlocks(main) {
  const blocks = [];
  const title = main.querySelector('.notion-header__content');
  if (title) blocks.push(title);
  const root = main.querySelector('.notion-root');
  for (const child of root ? root.children : []) {
    if (child.matches(HERO_END)) break;
    blocks.push(child);
  }
  return blocks;
}

/**
 * On a case study with a cover (any page that is not the homepage and has
 * `.notion-header__cover.has-cover`), write the hero's top and height,
 * relative to <main>, as custom properties. Removes them otherwise, so a
 * client-side navigation away from a cover never leaves stale values.
 * @param {Document} doc
 */
export function measureHero(doc) {
  const main = /** @type {HTMLElement | null} */ (doc.querySelector('main.super-content'));
  if (!main) return;
  const hasCover = !main.classList.contains('page__index') && !!main.querySelector('.notion-header__cover.has-cover');
  const blocks = hasCover ? heroBlocks(main) : [];
  if (!blocks.length) {
    main.style.removeProperty('--hero-top');
    main.style.removeProperty('--hero-h');
    delete main.dataset.bhdHero;
    return;
  }
  const origin = main.getBoundingClientRect().top;
  const top = blocks[0].getBoundingClientRect().top;
  const bottom = Math.max(...blocks.map((b) => b.getBoundingClientRect().bottom));
  main.style.setProperty('--hero-top', `${Math.round(top - origin)}px`);
  main.style.setProperty('--hero-h', `${Math.round(bottom - top)}px`);
  // site.css §4 places the cover only under this attribute, so without the
  // script (or before the first measure) the cover stays where Super puts it.
  main.dataset.bhdHero = 'cover';
}

/** Everything that depends on the page's DOM; safe to run on every pass. */
export function chromePass(doc = document) {
  applyNav(doc);
  measureHero(doc);
}

/**
 * Wire the scroll class and keep the hero measured as the layout changes.
 * Call once; `pass` re-runs on the loader's MutationObserver schedule.
 * @param {Window} win
 */
export function startChrome(win = window) {
  const doc = win.document;
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    win.requestAnimationFrame(() => {
      ticking = false;
      updateCompact(doc.documentElement, win.scrollY);
    });
  };
  win.addEventListener('scroll', onScroll, { passive: true });
  updateCompact(doc.documentElement, win.scrollY);
  if ('ResizeObserver' in win) {
    const ro = new win.ResizeObserver(() => measureHero(doc));
    ro.observe(doc.documentElement);
  }
  chromePass(doc);
}
