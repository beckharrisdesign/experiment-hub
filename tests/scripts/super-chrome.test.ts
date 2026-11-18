// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  COMPACT_CLASS,
  isCompact,
  currentHref,
  applyNav,
  measureHero,
  updateCompact,
  fitArtSizes,
  heroBlocks,
  tileCover,
} from '../../public/super/components/chrome.js';

/**
 * The navbar and hero behaviour for beckharrisdesign.com (OpenSpec change
 * portfolio-header-hero, design.md decisions 1–4 and 15). Super gives the
 * site no scroll class and no active nav class, so components/chrome.js
 * supplies both, plus the case-study hero measurements the cover is placed
 * from. These build the markup Super emits: a <nav class="super-navbar">
 * OUTSIDE <main class="super-content page__… parent-page__…">.
 */

const NAV_HREFS = ['/', '/bhd-consultation', '/bhd-labs', '/katy-harris'];
const LABELS = ['Projects', 'Consulting', 'Labs', 'About'];

function page(mainClasses: string, body = ''): Document {
  document.body.innerHTML =
    `<nav class="super-navbar"><a class="super-navbar__logo" href="/">Beck Harris Design</a>` +
    `<div class="super-navbar__item-list">` +
    NAV_HREFS.map((h, i) => `<a class="super-navbar__item" href="${h}">${LABELS[i]}</a>`).join('') +
    `</div></nav>` +
    `<div class="super-content-wrapper"><main class="super-content ${mainClasses}">${body}</main></div>`;
  return document;
}

const current = () =>
  [...document.querySelectorAll('.super-navbar__item[aria-current="page"]')].map((a) => a.textContent);

describe('compact navbar (decisions 1–3)', () => {
  it('is compact only past 80px of scroll', () => {
    expect(isCompact(0)).toBe(false);
    expect(isCompact(80)).toBe(false);
    expect(isCompact(81)).toBe(true);
    expect(isCompact(1200)).toBe(true);
  });

  it('puts the class on <html> past 80px and takes it off at the top', () => {
    const root = document.documentElement;
    updateCompact(root, 400);
    expect(root.classList.contains(COMPACT_CLASS)).toBe(true);
    updateCompact(root, 0);
    expect(root.classList.contains(COMPACT_CLASS)).toBe(false);
  });
});

describe('current nav link (decision 4)', () => {
  const table: [string, string, string | null][] = [
    ['homepage', 'page__index', '/'],
    ['all projects', 'page__all-projects parent-page__index', '/'],
    ['Consulting', 'page__bhd-consultation parent-page__index', '/bhd-consultation'],
    ['Labs', 'page__bhd-labs parent-page__index', '/bhd-labs'],
    ['a Labs sub-page', 'page__bhd-labs-database parent-page__bhd-labs', '/bhd-labs'],
    ['About', 'page__katy-harris parent-page__index', '/katy-harris'],
    ['a case study', 'page__rebuilding-a-design-function parent-page__index', '/'],
    ['a grandchild', 'page__some-deep-page parent-page__some-collection', null],
  ];

  it.each(table)('%s → %s', (_name, classes, expected) => {
    expect(currentHref(classes.split(' '), NAV_HREFS)).toBe(expected);
  });

  it('marks exactly one nav link, never the logo', () => {
    page('page__bhd-consultation parent-page__index');
    applyNav(document);
    expect(current()).toEqual(['Consulting']);
    expect(document.querySelector('.super-navbar__logo')!.hasAttribute('aria-current')).toBe(false);
  });

  it('marks no link on a page the nav has no section for', () => {
    page('page__some-deep-page parent-page__some-collection');
    applyNav(document);
    expect(current()).toEqual([]);
  });

  it('follows a client-side page change', () => {
    page('page__bhd-consultation parent-page__index');
    applyNav(document);
    // Super swaps <main> in place on navigation; the nav stays.
    document.querySelector('main')!.className = 'super-content page__rebuilding-a-design-function parent-page__index';
    applyNav(document);
    expect(current()).toEqual(['Projects']);
  });

  it('matches absolute hrefs and trailing slashes too', () => {
    page('page__katy-harris parent-page__index');
    document.querySelectorAll('.super-navbar__item')[3].setAttribute('href', 'https://beckharrisdesign.com/katy-harris/');
    applyNav(document);
    expect(current()).toEqual(['About']);
  });
});

describe('case-study hero measuring (decision 15)', () => {
  // site.css §4 marks case studies with `--bhd-hero: card` on <main>; the
  // tests set it inline, which is what getComputedStyle reads back.
  const caseStudy = (cover: 'has-cover' | 'no-cover', marked = true) => {
    page(
      'page__rebuilding-a-design-function parent-page__index',
      `<div class="notion-header page"><div class="notion-header__cover ${cover}"></div>` +
        `<div class="notion-header__content"><h1 class="notion-header__title">Rebuilding a design function</h1></div></div>` +
        `<article class="notion-root"><div class="notion-page__properties-layout"></div>` +
        `<p class="notion-text notion-text__content">Summary.</p><div class="notion-callout"></div><h2>Next</h2></article>`,
    );
    if (marked) (document.querySelector('main') as HTMLElement).style.setProperty('--bhd-hero', 'card');
  };
  const main = () => document.querySelector('main') as HTMLElement;

  beforeEach(() => vi.restoreAllMocks());

  it('sets --hero-top and --hero-h to the text card, and marks a cover', () => {
    caseStudy('has-cover');
    vi.spyOn(main(), 'getBoundingClientRect').mockReturnValue({ top: 80, bottom: 2000 } as DOMRect);
    const box = (sel: string, top: number, bottom: number) =>
      vi.spyOn(document.querySelector(sel)!, 'getBoundingClientRect').mockReturnValue({ top, bottom } as DOMRect);
    box('.notion-header__content', 190, 310);
    box('.notion-page__properties-layout', 310, 370);
    box('p.notion-text__content', 370, 449);
    measureHero(document);
    expect(main().style.getPropertyValue('--hero-top')).toBe('110px');
    expect(main().style.getPropertyValue('--hero-h')).toBe('259px');
    expect(main().dataset.bhdHero).toBe('cover');
  });

  it('marks a case study with no cover as plain, so the placeholder colour draws', () => {
    caseStudy('no-cover');
    measureHero(document);
    expect(main().dataset.bhdHero).toBe('plain');
    expect(main().style.getPropertyValue('--hero-h')).not.toBe('');
  });

  it('follows a client-side change from a cover to no cover', () => {
    caseStudy('has-cover');
    measureHero(document);
    expect(main().dataset.bhdHero).toBe('cover');
    main().querySelector('.notion-header__cover')!.className = 'notion-header__cover no-cover';
    measureHero(document);
    expect(main().dataset.bhdHero).toBe('plain');
  });

  it('leaves a page site.css does not mark alone, and clears stale values', () => {
    caseStudy('has-cover');
    measureHero(document);
    main().style.removeProperty('--bhd-hero'); // e.g. Super swapped in Consulting
    measureHero(document);
    expect(main().dataset.bhdHero).toBeUndefined();
    expect(main().style.getPropertyValue('--hero-top')).toBe('');
    expect(main().style.getPropertyValue('--hero-h')).toBe('');
  });

  it('ignores the homepage, which places its art in CSS alone', () => {
    page('page__index', `<div class="notion-header page"><div class="notion-header__cover has-cover"></div></div>`);
    measureHero(document);
    expect(main().style.getPropertyValue('--hero-h')).toBe('');
    expect(main().dataset.bhdHero).toBeUndefined();
  });
});

describe('sharp homepage art (decision 11)', () => {
  // Super writes sizes from the Notion column split: column 2 is ~6% wide.
  const home = (w: number) => {
    page(
      'page__index',
      `<article class="notion-root"><div class="notion-column-list">` +
        `<div class="notion-column"><h1>Title</h1></div>` +
        `<div class="notion-column"><div class="notion-image"><img sizes="(max-width: 546px) 100vw, 6vw" ` +
        `srcset="a.png?width=96 96w, a.png?width=1920 1920w" src="a.png?width=1600"></div></div>` +
        `</div></article>`,
    );
    const img = document.querySelector('img') as HTMLImageElement;
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue({ width: w } as DOMRect);
    return img;
  };

  beforeEach(() => vi.restoreAllMocks());

  it('rewrites sizes to the width the art is drawn at', () => {
    const img = home(1486.4);
    fitArtSizes(document);
    expect(img.getAttribute('sizes')).toBe('1487px');
  });

  it('leaves an image that is not laid out yet alone', () => {
    const img = home(0);
    fitArtSizes(document);
    expect(img.getAttribute('sizes')).toBe('(max-width: 546px) 100vw, 6vw');
  });

  it('touches only the homepage hero art', () => {
    const img = home(1487);
    (document.querySelector('main') as HTMLElement).className = 'super-content page__katy-harris parent-page__index';
    fitArtSizes(document);
    expect(img.getAttribute('sizes')).toBe('(max-width: 546px) 100vw, 6vw');
  });
});

describe('where the case-study hero ends (decision 14)', () => {
  const root = (body: string) => {
    page('page__stalinism parent-page__index',
      `<div class="notion-header page"><div class="notion-header__content"><h1>T</h1></div></div>` +
      `<article class="notion-root">${body}</article>`);
    return [...heroBlocks(document.querySelector('main')!)].map((el) => el.className.split(' ').pop());
  };
  const props = '<div class="notion-page__properties-layout"></div>';
  const para = '<p class="notion-text notion-text__content">Summary.</p>';

  it('stops at the first callout', () => {
    expect(root(props + para + '<div class="notion-callout"></div><p class="notion-text notion-text__content">Body.</p>'))
      .toEqual(['notion-header__content', 'notion-page__properties-layout', 'notion-text__content']);
  });

  it('stops at an image on a page with no callout or heading (a Highlight)', () => {
    expect(root(props + para + '<div class="notion-image"></div><p class="notion-text notion-text__content">Caption.</p>'))
      .toEqual(['notion-header__content', 'notion-page__properties-layout', 'notion-text__content']);
  });

  it('keeps a hero button, and stops at an empty spacer', () => {
    expect(root(props + para + '<div class="notion-button"></div><div class="notion-text"></div><p class="notion-text notion-text__content">Later.</p>'))
      .toEqual(['notion-header__content', 'notion-page__properties-layout', 'notion-text__content', 'notion-button']);
  });

  it('passes over a heading anchor and stops at the heading', () => {
    expect(root(props + para + '<span class="notion-heading__anchor"></span><h2>Next</h2>'))
      .toEqual(['notion-header__content', 'notion-page__properties-layout', 'notion-text__content']);
  });
});

describe('tiling the cover on wide screens (decision 15)', () => {
  const caseStudy = (cover: string) => {
    page('page__rebuilding-a-design-function parent-page__index',
      `<div class="notion-header page"><div class="notion-header__cover ${cover}">` +
      (cover === 'has-cover' ? '<img src="https://assets.super.so/a/cover.png?width=1600">' : '') +
      `</div><div class="notion-header__content"><h1>T</h1></div></div>` +
      `<article class="notion-root"><p class="notion-text notion-text__content">S.</p><div class="notion-callout"></div></article>`);
    const main = document.querySelector('main') as HTMLElement;
    main.style.setProperty('--bhd-hero', 'card');
    return main;
  };

  it('hands the cover image to CSS and marks the page for tiling', () => {
    const main = caseStudy('has-cover');
    measureHero(document);
    expect(main.style.getPropertyValue('--hero-cover-url')).toBe('url("https://assets.super.so/a/cover.png?width=1600")');
    expect(main.dataset.bhdCoverTile).toBe('');
  });

  it('marks nothing on a case study without a cover', () => {
    const main = caseStudy('no-cover');
    measureHero(document);
    expect(main.style.getPropertyValue('--hero-cover-url')).toBe('');
    expect(main.dataset.bhdCoverTile).toBeUndefined();
  });

  it('clears the image when the page stops being a cover case study', () => {
    const main = caseStudy('has-cover');
    measureHero(document);
    main.style.removeProperty('--bhd-hero');
    measureHero(document);
    expect(main.style.getPropertyValue('--hero-cover-url')).toBe('');
    expect(main.dataset.bhdCoverTile).toBeUndefined();
  });

  it('escapes quotes in the address', () => {
    const main = caseStudy('has-cover');
    main.querySelector('img')!.setAttribute('src', 'https://x/a"b.png');
    main.dataset.bhdHero = 'cover';
    tileCover(main);
    expect(main.style.getPropertyValue('--hero-cover-url')).toBe('url("https://x/a\\"b.png")');
  });
});
