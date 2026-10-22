// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  REGISTRY,
  isRegistered,
  parseMarker,
  parseCallout,
  parseBlock,
  parseItem,
  enhance,
} from '../../public/super/components/loader.js';
import { render as renderLinks, describe as describeLink } from '../../public/super/components/links.js';

/**
 * The loader turns a Notion callout (as Super renders it) into a component.
 * The live site cannot be reached from CI, so these build the same markup
 * Super emits — `.notion-callout > .notion-callout__content` holding a first
 * line of text and a `<ul>` — and check the contract between loader and
 * component: what gets parsed, what gets replaced, and what happens when the
 * component fails to load.
 */

const G = 'https://patents.google.com/patent/';
const PATENTS = [
  `Presenting fraud detection information | ${G}US0000001 | Connects an analytics-generated alert to appropriate interface components.`,
  `Presenting quasi-periodic activity | ${G}US0000002 | Visually connects recurring transactions and distinguishes them from other activity.`,
  `Presenting multivariate information | Represents differences between actual and expected values across several attributes.`,
];

function callout(firstLine: string, items: string[] = PATENTS): HTMLElement {
  const el = document.createElement('div');
  el.className = 'notion-callout bg-gray-light';
  el.innerHTML =
    `<div class="notion-callout__icon"><span class="notion-icon">💡</span></div>` +
    `<div class="notion-callout__content">` +
    `<span class="notion-semantic-string">${firstLine}</span>` +
    `<ul class="notion-list notion-list-disc">` +
    items.map((t) => `<li><span class="notion-semantic-string">${t}</span></li>`).join('') +
    `</ul></div>`;
  return el;
}

/** The custom block as Super renders it: a paragraph, then one <ul> per bullet. */
function block(firstLine: string, items: string[] = PATENTS, { oneList = false } = {}): HTMLElement[] {
  const p = document.createElement('p');
  p.className = 'notion-text';
  p.innerHTML = `<span class="notion-text__content"><span class="notion-semantic-string">${firstLine}</span></span>`;
  const lis = items.map((t) => `<li><span class="notion-semantic-string">${t}</span></li>`);
  const lists = (oneList ? [lis.join('')] : lis).map((html) => {
    const ul = document.createElement('ul');
    ul.className = 'notion-list notion-list-disc';
    ul.innerHTML = html;
    return ul;
  });
  return [p, ...lists];
}

const li = (html: string) => {
  const n = document.createElement('li');
  n.innerHTML = html;
  return n;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('parseMarker', () => {
  it('reads the component name and optional title off the first line', () => {
    expect(parseMarker('::patents  Five patents, one argument')).toEqual({
      name: 'patents',
      title: 'Five patents, one argument',
    });
    expect(parseMarker('::patents')).toEqual({ name: 'patents', title: '' });
    expect(parseMarker('::my-thing title')).toEqual({ name: 'my-thing', title: 'title' });
  });

  it('ignores ordinary callouts and markers that are not on the first line', () => {
    expect(parseMarker('A normal callout')).toBeNull();
    expect(parseMarker('Heads up\n::patents')).toBeNull();
    expect(parseMarker(':: patents')).toBeNull();
  });
});

describe('parseItem', () => {
  it('splits fields on pipes and collects Notion links', () => {
    const item = parseItem(li(`<a href="${G}US1">Presenting fraud detection information</a> | Connects an alert to the right components.`));
    expect(item.fields).toEqual(['Presenting fraud detection information', 'Connects an alert to the right components.']);
    expect(item.links).toEqual([{ href: `${G}US1`, text: 'Presenting fraud detection information' }]);
  });

  it('drops nested lists and ignores non-http links', () => {
    const item = parseItem(li(`Title | <a href="#x">anchor</a> note<ul><li>nested detail</li></ul>`));
    expect(item.raw).toBe('Title | anchor note');
    expect(item.links).toEqual([]);
    expect(item.images).toEqual([]);
  });

  it('collects an image block nested under the bullet without letting it pollute the text', () => {
    const item = parseItem(li(
      `Title | Description` +
      `<div class="notion-image"><figure><img src="https://img.example/thumb.png" alt="x"><figcaption>cap</figcaption></figure></div>`,
    ));
    expect(item.fields).toEqual(['Title', 'Description']);
    expect(item.images).toEqual(['https://img.example/thumb.png']);
  });
});

describe('parseCallout', () => {
  it('returns the marker, title and one item per top-level bullet', () => {
    const spec = parseCallout(callout('::patents  Five patents, one argument'));
    expect(spec).not.toBeNull();
    expect(spec!.name).toBe('patents');
    expect(spec!.title).toBe('Five patents, one argument');
    expect(spec!.items.map((i) => i.fields[0])).toEqual([
      'Presenting fraud detection information',
      'Presenting quasi-periodic activity',
      'Presenting multivariate information',
    ]);
  });

  it('takes an image block right after a bullet inside the callout as its thumbnail', () => {
    const el = callout('::links', PATENTS.slice(0, 1));
    const img = document.createElement('div');
    img.className = 'notion-image normal';
    img.innerHTML = '<img src="https://images.spr.so/thumb-1/w=1920">';
    el.querySelector('.notion-callout__content')!.append(img);
    const spec = parseCallout(el)!;
    expect(spec.items).toHaveLength(1);
    expect(spec.items[0].images).toEqual(['https://images.spr.so/thumb-1/w=1920']);
  });

  it('returns null for a callout without a marker', () => {
    expect(parseCallout(callout('Just a note'))).toBeNull();
  });

  it('skips nested bullets so a sub-list does not become a row', () => {
    const el = callout('::patents', ['Only row | note']);
    el.querySelector('li')!.insertAdjacentHTML('beforeend', '<ul><li>nested detail</li></ul>');
    const spec = parseCallout(el)!;
    expect(spec.items).toHaveLength(1);
    expect(spec.items[0].fields).toEqual(['Only row', 'note']);
  });
});

describe('parseBlock — images nested under a bullet, as Super renders them', () => {
  it('takes each image block that follows a bullet inside the same <ul> as that bullet\'s image', () => {
    // Live markup from the FIS Memento page: the nested image is the <li>'s
    // next sibling, not its child. One <ul> holds every bullet and image.
    const p = document.createElement('p');
    p.className = 'notion-text';
    p.textContent = '::links  Patents';
    const ul = document.createElement('ul');
    ul.className = 'notion-bulleted-list';
    const img = (n: number) =>
      `<div class="notion-image align-start page-width"><span><img alt="image" loading="lazy" src="https://images.spr.so/thumb-${n}/w=1920"></span></div>`;
    ul.innerHTML =
      `<li class="notion-list-item">${PATENTS[0]}</li>${img(1)}` +
      `<li class="notion-list-item">${PATENTS[1]}</li>` +
      `<li class="notion-list-item">${PATENTS[2]}</li>${img(3)}`;
    document.body.append(p, ul);

    const items = parseBlock(p)!.spec.items;
    expect(items.map((i) => i.images)).toEqual([
      ['https://images.spr.so/thumb-1/w=1920'],
      [],
      ['https://images.spr.so/thumb-3/w=1920'],
    ]);
    expect(describeLink(items[0]).thumb).toBe('https://images.spr.so/thumb-1/w=1920');
  });
});

describe('parseBlock — an image block after a bullet, not indented', () => {
  const imgBlock = (n: number) => {
    const d = document.createElement('div');
    d.className = 'notion-image normal';
    d.innerHTML = `<img alt="image" src="https://images.spr.so/thumb-${n}/w=1920">`;
    return d;
  };
  const para = (text = '') => {
    const p = document.createElement('div');
    p.className = 'notion-text';
    p.textContent = text;
    return p;
  };

  it('gives each image to the bullet above it and stops at a blank line', () => {
    // Live markup: <ul><li/></ul> then <div.notion-image> at page level, one per bullet.
    const [marker, ...lists] = block('::links  Patents');
    const after = para('');
    const later = imgBlock(9); // an unrelated image after the blank line
    document.body.append(marker, lists[0], imgBlock(1), lists[1], lists[2], imgBlock(3), after, later);

    const b = parseBlock(marker)!;
    expect(b.spec.items.map((i) => i.images)).toEqual([
      ['https://images.spr.so/thumb-1/w=1920'],
      [],
      ['https://images.spr.so/thumb-3/w=1920'],
    ]);
    expect(b.parts).toHaveLength(6); // marker, 3 lists, 2 images
    expect(b.parts).not.toContain(after);
    expect(b.parts).not.toContain(later);
  });

  it('leaves an image before the first bullet out of the block', () => {
    const [marker, ...lists] = block('::links', PATENTS.slice(0, 1));
    const first = imgBlock(0);
    document.body.append(marker, first, ...lists);
    const b = parseBlock(marker)!;
    expect(b.parts).toEqual([marker]);
    expect(b.spec.items).toEqual([]);
  });

  it('removes the images with the block when it renders', async () => {
    const [marker, ...lists] = block('::links', PATENTS.slice(0, 1));
    document.body.append(marker, lists[0], imgBlock(1), para('after'));
    await enhance(document.body, {
      load: async () => ({ mod: { render: () => document.createElement('aside') }, css: '' }),
    });
    expect(document.querySelectorAll('.notion-image, ul').length).toBe(0);
    expect(document.body.textContent).toContain('after');
  });
});

describe('parseBlock — the custom block (marker paragraph + list)', () => {
  it('reads a marker paragraph and every list directly under it, one <ul> per bullet', () => {
    const parts = block('::links  Patents');
    document.body.append(...parts);
    const b = parseBlock(parts[0])!;
    expect(b.kind).toBe('block');
    expect(b.spec.title).toBe('Patents');
    expect(b.spec.items).toHaveLength(3);
    expect(b.parts).toHaveLength(4);
  });

  it('also accepts a single <ul> holding all the bullets', () => {
    const parts = block('::links', PATENTS, { oneList: true });
    document.body.append(...parts);
    const b = parseBlock(parts[0])!;
    expect(b.spec.items).toHaveLength(3);
    expect(b.parts).toHaveLength(2);
  });

  it('stops at the first sibling that is not a list', () => {
    const parts = block('::links  Patents', [PATENTS[0]]);
    const after = document.createElement('p');
    after.className = 'notion-text';
    after.textContent = 'Prose after the block';
    const stray = document.createElement('ul');
    stray.innerHTML = '<li>unrelated list later on</li>';
    document.body.append(...parts, after, stray);
    const b = parseBlock(parts[0])!;
    expect(b.spec.items).toHaveLength(1);
    expect(b.parts).not.toContain(after);
    expect(b.parts).not.toContain(stray);
  });

  it('ignores ordinary paragraphs, a callout\'s own text, and text inside bullets', () => {
    const plain = document.createElement('p');
    plain.textContent = 'Just prose';
    expect(parseBlock(plain)).toBeNull();

    const c = callout('::links  In a callout');
    document.body.append(c);
    // The span carrying the marker inside the callout is not a block of its own…
    const inner = c.querySelector('.notion-callout__content > span') as HTMLElement;
    expect(parseBlock(inner)).toBeNull();
    // …the callout is.
    expect(parseBlock(c)!.kind).toBe('callout');
  });

  it('still treats a callout carrying the marker as the block', () => {
    const c = callout('::patents  Alias');
    expect(parseBlock(c)!.spec.name).toBe('patents');
  });
});

describe('enhance', () => {
  const okLoad = async () => ({ mod: { render: renderLinks }, css: '' });

  it('replaces a marked callout with the component and marks it processed', async () => {
    const el = callout('::patents  Five patents, one argument');
    document.body.append(el);
    const load = async (name: string) => {
      expect(name).toBe('patents');
      return okLoad();
    };

    await enhance(document, { load });

    expect(document.body.contains(el)).toBe(false);
    const host = document.querySelector('[data-bhd="patents"]');
    expect(host).not.toBeNull();
    expect(host!.tagName).toBe('ASIDE');
  });

  it('leaves unmarked callouts alone and never processes one twice', async () => {
    const plain = callout('No marker here');
    const marked = callout('::patents  Title');
    document.body.append(plain, marked);
    let calls = 0;
    const load = async () => {
      calls += 1;
      return okLoad();
    };

    await enhance(document, { load });
    await enhance(document, { load });

    expect(document.body.contains(plain)).toBe(true);
    expect(calls).toBe(1);
  });

  it('ignores markers that are not in the registry', async () => {
    const el = callout('::unknown  Title');
    document.body.append(el);
    let calls = 0;
    await enhance(document, { load: async () => { calls += 1; return okLoad(); } });
    expect(calls).toBe(0);
    expect(document.body.contains(el)).toBe(true);
    expect(el.hasAttribute('data-bhd-pending')).toBe(false);
  });

  it('does not treat inherited Object.prototype names as components', async () => {
    expect(isRegistered('constructor')).toBe(false);
    expect(isRegistered('__proto__')).toBe(false);
    expect(isRegistered('toString')).toBe(false);
    expect(isRegistered('patents')).toBe(true);

    const el = callout('::constructor  Title');
    document.body.append(el);
    let calls = 0;
    await enhance(document, { load: async () => { calls += 1; return okLoad(); } });
    expect(calls).toBe(0);
    expect(document.body.contains(el)).toBe(true);
    expect(el.hasAttribute('data-bhd')).toBe(false);
  });

  it('on a failed load, reveals the original callout with the marker stripped', async () => {
    const el = callout('::patents  Five patents, one argument');
    document.body.append(el);

    await enhance(document, { load: async () => { throw new Error('offline'); } });

    expect(document.body.contains(el)).toBe(true);
    expect(el.hasAttribute('data-bhd-pending')).toBe(false);
    expect(el.dataset.bhdState).toBe('failed');
    const first = el.querySelector('.notion-callout__content > *')!;
    expect(first.textContent).toBe('Five patents, one argument');
    expect(el.querySelectorAll('li')).toHaveLength(3);
  });

  it('renders the custom block in place of the marker paragraph and removes its lists', async () => {
    const before = document.createElement('p');
    before.textContent = 'Prose before';
    const parts = block('::links  Patents');
    const after = document.createElement('p');
    after.textContent = 'Prose after';
    document.body.append(before, ...parts, after);

    await enhance(document, { load: okLoad });

    const host = document.querySelector('aside[data-bhd="links"]')!;
    expect(host).not.toBeNull();
    expect(host.previousElementSibling).toBe(before);
    expect(host.nextElementSibling).toBe(after);
    expect(document.querySelectorAll('ul')).toHaveLength(0);
    expect(document.querySelectorAll('[data-bhd-pending]')).toHaveLength(0);
    expect(host.shadowRoot!.querySelectorAll('.bhd-links__row')).toHaveLength(3);
  });

  it('on a failed load, reveals the marker paragraph as its title and keeps the lists', async () => {
    const parts = block('::links  Patents');
    document.body.append(...parts);

    await enhance(document, { load: async () => { throw new Error('offline'); } });

    expect(parts[0].textContent).toBe('Patents');
    expect(parts[0].dataset.bhdState).toBe('failed');
    expect(document.querySelectorAll('ul')).toHaveLength(3);
    expect(document.querySelectorAll('[data-bhd-pending]')).toHaveLength(0);
  });

  it('leaves ordinary paragraphs alone and does not list them in the report', async () => {
    const p = document.createElement('p');
    p.className = 'notion-text';
    p.textContent = 'Ordinary paragraph';
    document.body.append(p);
    let calls = 0;
    await enhance(document, { load: async () => { calls += 1; return okLoad(); } });
    expect(calls).toBe(0);
    expect(p.hasAttribute('data-bhd')).toBe(false);
  });

  it('exposes the registry so a new component is one line, with ::patents as an alias', () => {
    expect(REGISTRY.links).toBe('links.js');
    expect(REGISTRY.patents).toBe('links.js');
    expect(isRegistered('links')).toBe(true);
  });
});

describe('links component', () => {
  it('reads title, link and description from a URL field', () => {
    expect(describeLink(parseItem(li(PATENTS[0])))).toEqual({
      title: 'Presenting fraud detection information',
      href: `${G}US0000001`,
      description: 'Connects an analytics-generated alert to appropriate interface components.',
      thumb: null,
    });
  });

  it('takes a thumbnail from an image URL field or a nested image, whichever is present', () => {
    const byUrl = describeLink(parseItem(li(`Title | https://site.example/page | https://img.example/t.jpg?w=200 | Desc`)));
    expect(byUrl).toEqual({ title: 'Title', href: 'https://site.example/page', description: 'Desc', thumb: 'https://img.example/t.jpg?w=200' });

    const byBlock = describeLink(parseItem(li(`<a href="https://site.example/page">Title</a> | Desc<div class="notion-image"><img src="https://img.example/t.png"></div>`)));
    expect(byBlock).toEqual({ title: 'Title', href: 'https://site.example/page', description: 'Desc', thumb: 'https://img.example/t.png' });

    // Field order does not matter.
    const reordered = describeLink(parseItem(li(`Title | Desc | https://site.example/page`)));
    expect(reordered.href).toBe('https://site.example/page');
    expect(reordered.description).toBe('Desc');
  });

  it('prefers a Notion link on the title over a URL field, and copes with neither', () => {
    const linked = parseItem(li(`<a href="${G}US9">Presenting suspect activity within a timeline</a> | Places suspect activity alongside account-balance information.`));
    expect(describeLink(linked)).toEqual({
      title: 'Presenting suspect activity within a timeline',
      href: `${G}US9`,
      description: 'Places suspect activity alongside account-balance information.',
      thumb: null,
    });
    expect(describeLink(parseItem(li(PATENTS[2])))).toEqual({
      title: 'Presenting multivariate information',
      href: null,
      description: 'Represents differences between actual and expected values across several attributes.',
      thumb: null,
    });
  });

  it('marks thumbnails for the site lightbox, captioned with the row text', () => {
    const host = renderLinks(document.createElement('div'), {
      title: 'Patent',
      css: '',
      items: [parseItem(li(`<a href="https://site.example/p">Title</a> | Desc<div class="notion-image"><img src="https://img.example/t.png"></div>`))],
    });
    const img = host.shadowRoot!.querySelector('img')!;
    expect(img.hasAttribute('data-bhd-lightbox')).toBe(true);
    expect(img.getAttribute('data-bhd-caption')).toBe('Title — Desc');
    expect(img.alt).toBe('Title');
    expect(img.closest('a')).toBeNull(); // a linked image would keep its link, not open the lightbox
  });

  it('renders one row per item inside a shadow root, linking titles that have a link', () => {
    const el = callout('::patents  Five patents, one argument');
    const spec = parseCallout(el)!;
    const aside = renderLinks(el, { ...spec, css: '.x{}' });
    const root = aside.shadowRoot!;
    expect(root.querySelector('style')!.textContent).toBe('.x{}');
    expect(root.querySelector('.bhd-links__title')!.textContent).toBe('Five patents, one argument');
    expect(aside.getAttribute('aria-label')).toBe('Five patents, one argument');
    expect(root.querySelectorAll('.bhd-links__row')).toHaveLength(3);

    const links = root.querySelectorAll('a.bhd-links__name');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe(`${G}US0000001`);
    expect(links[0].getAttribute('rel')).toContain('noopener');
    expect(root.querySelectorAll('span.bhd-links__name')).toHaveLength(1);
    expect(root.querySelectorAll('.bhd-links__desc')).toHaveLength(3);
    expect(root.querySelectorAll('img')).toHaveLength(0);
  });

  it('renders a thumbnail when an item has one', () => {
    const el = callout('::links', [`Title | https://site.example/p | https://img.example/t.png | Desc`]);
    const aside = renderLinks(el, { ...parseCallout(el)!, css: '' });
    const img = aside.shadowRoot!.querySelector('img.bhd-links__thumb')!;
    expect(img.getAttribute('src')).toBe('https://img.example/t.png');
    // Not decorative: it opens the lightbox, so it is named after its row.
    expect(img.getAttribute('alt')).toBe('Title');
    expect(aside.shadowRoot!.querySelector('.bhd-links__row')!.classList.contains('has-thumb')).toBe(true);
  });

  it('omits the heading when the marker carries no title', () => {
    const el = callout('::links');
    const aside = renderLinks(el, { ...parseCallout(el)!, css: '' });
    expect(aside.shadowRoot!.querySelector('.bhd-links__title')).toBeNull();
    expect(aside.getAttribute('aria-label')).toBe('Links');
  });
});
