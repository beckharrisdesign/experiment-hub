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
 *   3. Case-study hero measurements. On a case study, `--hero-top` and
 *      `--hero-h` on <main> (the text card's top and height), so site.css §4
 *      can lay the art, or the placeholder colour, behind the card: the
 *      cover lives in .notion-header and the text in .notion-root, two
 *      different parents, so no CSS box spans the hero. It marks
 *      <main data-bhd-hero="cover"> or "plain" (no cover), which is what
 *      site.css keys the art layer on. Which pages are case studies is
 *      site.css's call, not this file's: §4 sets `--bhd-hero: card` on
 *      their <main>, so the slug list lives in one place. No script: the
 *      card still draws, and the cover stays where Super puts it.
 *
 *   4. Sharp homepage art. Notion's art column is about 6% of the page, so
 *      Super's <img sizes> says "6vw" and the browser downloads a 96px file,
 *      which site.css then shows at about 1,500px. `fitArtSizes()` rewrites
 *      `sizes` to the width the art is actually drawn at, so the browser
 *      picks a sharp file from the srcset Super already provides.
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

/** What a case-study hero is made of: the details, paragraphs and buttons. */
const HERO_KIND = '.notion-page__properties-layout, .notion-text__content, .notion-button';
/** Heading anchors sit before headings; they neither join nor end the hero. */
const PASS = '.notion-heading__anchor';

/**
 * The case-study hero's blocks: the header's title block, then the run of
 * HERO_KIND .notion-root children up to the first block of any other kind
 * (a callout, heading, image, column list, divider, empty spacer…). The same
 * rule as site.css §4, so a page with no callout or heading doesn't put its
 * whole body in the hero (design.md 14).
 * @param {Element} main
 */
export function heroBlocks(main) {
  const blocks = [];
  const title = main.querySelector('.notion-header__content');
  if (title) blocks.push(title);
  const root = main.querySelector('.notion-root');
  for (const child of root ? root.children : []) {
    if (child.matches(PASS)) continue;
    if (!child.matches(HERO_KIND)) break;
    blocks.push(child);
  }
  return blocks;
}

/** True when site.css marks <main> as a case study with a card hero. */
function isCardHero(doc, main) {
  const view = doc.defaultView;
  return !!view && view.getComputedStyle(main).getPropertyValue('--bhd-hero').trim() === 'card';
}

/**
 * On a case study (site.css sets `--bhd-hero: card` on its <main>), write
 * the text card's top and height, relative to <main>, as custom properties,
 * and mark whether it has a cover. Removes all three otherwise, so a
 * client-side navigation to another kind of page never leaves stale values.
 * @param {Document} doc
 */
export function measureHero(doc) {
  const main = /** @type {HTMLElement | null} */ (doc.querySelector('main.super-content'));
  if (!main) return;
  const blocks = isCardHero(doc, main) ? heroBlocks(main) : [];
  if (!blocks.length) {
    main.style.removeProperty('--hero-top');
    main.style.removeProperty('--hero-h');
    delete main.dataset.bhdHero;
    tileCover(main);
    return;
  }
  // site.css §4 draws the art layer only under this attribute, so without
  // the script the cover stays where Super puts it and no placeholder colour
  // is drawn. Set it before measuring: it lifts the cover out of the flow,
  // and reading the boxes afterwards measures the card where it ends up.
  const state = main.querySelector('.notion-header__cover.has-cover') ? 'cover' : 'plain';
  if (main.dataset.bhdHero !== state) main.dataset.bhdHero = state;
  const origin = main.getBoundingClientRect().top;
  const top = blocks[0].getBoundingClientRect().top;
  const bottom = Math.max(...blocks.map((b) => b.getBoundingClientRect().bottom));
  main.style.setProperty('--hero-top', `${Math.round(top - origin)}px`);
  main.style.setProperty('--hero-h', `${Math.round(bottom - top)}px`);
  tileCover(main);
}

/**
 * Hand the cover's image to CSS, so site.css §4 can tile it past 1920px.
 * CSS can't read an <img>'s address, so the address goes on <main> as
 * `--hero-cover-url`, and `data-bhd-cover-tile` tells site.css it may hide
 * the <img> and paint the tiles instead. Without either (no script, or no
 * cover), the cover stays one centred 1920px image. Re-runs when the image
 * loads, because the browser picks its srcset file only then.
 * @param {HTMLElement} main
 */
export function tileCover(main) {
  const img = main.dataset.bhdHero === 'cover'
    ? /** @type {HTMLImageElement | null} */ (main.querySelector('.notion-header__cover.has-cover img'))
    : null;
  const src = img ? img.currentSrc || img.getAttribute('src') || '' : '';
  if (!src) {
    main.style.removeProperty('--hero-cover-url');
    delete main.dataset.bhdCoverTile;
    return;
  }
  const value = `url("${src.replace(/["\\]/g, '\\$&')}")`;
  if (main.style.getPropertyValue('--hero-cover-url') !== value) main.style.setProperty('--hero-cover-url', value);
  if (main.dataset.bhdCoverTile !== '') main.dataset.bhdCoverTile = '';
  if (img && !img.dataset.bhdTileWatch) {
    img.dataset.bhdTileWatch = '';
    img.addEventListener('load', () => tileCover(main));
  }
}

/** The homepage art images: column 2 of the hero column list. */
const HOME_ART = '.page__index .notion-root > .notion-column-list:first-child > .notion-column:nth-child(2) img[srcset]';

/**
 * Tell the browser how wide the homepage art is really drawn, so it picks a
 * file from the srcset that matches (decision 11). Only touches images that
 * are laid out, and only when the value changes.
 * @param {Document} doc
 */
export function fitArtSizes(doc) {
  for (const img of doc.querySelectorAll(HOME_ART)) {
    const w = Math.ceil(img.getBoundingClientRect().width);
    if (w < 1) continue;
    const sizes = `${w}px`;
    if (img.getAttribute('sizes') !== sizes) img.setAttribute('sizes', sizes);
  }
}

/** Everything that depends on the page's DOM; safe to run on every pass. */
export function chromePass(doc = document) {
  applyNav(doc);
  measureHero(doc);
  fitArtSizes(doc);
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
    const ro = new win.ResizeObserver(() => {
      measureHero(doc);
      fitArtSizes(doc);
    });
    ro.observe(doc.documentElement);
  }
  chromePass(doc);
}
