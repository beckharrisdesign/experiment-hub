// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  COMPACT_CLASS,
  isCompact,
  currentHref,
  applyNav,
  measureHero,
  updateCompact,
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
  const caseStudy = (cover: 'has-cover' | 'no-cover') =>
    page(
      'page__rebuilding-a-design-function parent-page__index',
      `<div class="notion-header page"><div class="notion-header__cover ${cover}"></div>` +
        `<div class="notion-header__content"><h1 class="notion-header__title">Rebuilding a design function</h1></div></div>` +
        `<article class="notion-root"><div class="notion-page__properties-layout"></div>` +
        `<p class="notion-text">Summary.</p><div class="notion-callout"></div><h2>Next</h2></article>`,
    );

  beforeEach(() => vi.restoreAllMocks());

  it('sets --hero-top and --hero-h on <main> when the case study has a cover', () => {
    caseStudy('has-cover');
    const main = document.querySelector('main') as HTMLElement;
    vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({ top: 80, bottom: 2000 } as DOMRect);
    const box = (sel: string, top: number, bottom: number) =>
      vi.spyOn(document.querySelector(sel)!, 'getBoundingClientRect').mockReturnValue({ top, bottom } as DOMRect);
    box('.notion-header__content', 80, 200);
    box('.notion-page__properties-layout', 200, 260);
    box('p.notion-text', 260, 523);
    measureHero(document);
    expect(main.style.getPropertyValue('--hero-top')).toBe('0px');
    expect(main.style.getPropertyValue('--hero-h')).toBe('443px');
    expect(main.dataset.bhdHero).toBe('cover');
  });

  it('leaves <main> alone when there is no cover', () => {
    caseStudy('no-cover');
    measureHero(document);
    const main = document.querySelector('main') as HTMLElement;
    expect(main.style.getPropertyValue('--hero-top')).toBe('');
    expect(main.style.getPropertyValue('--hero-h')).toBe('');
    expect(main.dataset.bhdHero).toBeUndefined();
  });

  it('clears the mark after navigating from a cover to a page without one', () => {
    caseStudy('has-cover');
    measureHero(document);
    const main = document.querySelector('main') as HTMLElement;
    expect(main.dataset.bhdHero).toBe('cover');
    main.querySelector('.notion-header__cover')!.className = 'notion-header__cover no-cover';
    measureHero(document);
    expect(main.dataset.bhdHero).toBeUndefined();
    expect(main.style.getPropertyValue('--hero-h')).toBe('');
  });

  it('ignores the homepage, which places its art in CSS alone', () => {
    page('page__index', `<div class="notion-header page"><div class="notion-header__cover has-cover"></div></div>`);
    measureHero(document);
    expect((document.querySelector('main') as HTMLElement).style.getPropertyValue('--hero-h')).toBe('');
  });
});
