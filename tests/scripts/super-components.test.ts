// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  REGISTRY,
  isRegistered,
  parseMarker,
  parseCallout,
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
    expect(img.getAttribute('alt')).toBe('');
    expect(aside.shadowRoot!.querySelector('.bhd-links__row')!.classList.contains('has-thumb')).toBe(true);
  });

  it('omits the heading when the marker carries no title', () => {
    const el = callout('::links');
    const aside = renderLinks(el, { ...parseCallout(el)!, css: '' });
    expect(aside.shadowRoot!.querySelector('.bhd-links__title')).toBeNull();
    expect(aside.getAttribute('aria-label')).toBe('Links');
  });
});
