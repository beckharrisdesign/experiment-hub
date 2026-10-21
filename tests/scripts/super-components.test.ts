// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  REGISTRY,
  isRegistered,
  parseMarker,
  parseCallout,
  splitItem,
  enhance,
} from '../../public/super/components.js';
import { render as renderPatents, patentUrl } from '../../public/super/components/patents.js';

/**
 * The loader turns a Notion callout (as Super renders it) into a component.
 * The live site cannot be reached from CI, so these build the same markup
 * Super emits — `.notion-callout > .notion-callout__content` holding a first
 * line of text and a `<ul>` — and check the contract between loader and
 * component: what gets parsed, what gets replaced, and what happens when the
 * component fails to load.
 */

const PATENT_ROWS = [
  'Probe — Check serial-number pattern | US 7,123,456 | Out-of-sequence serials flag access testing',
  'Test — Dollar-variance rings | US X,XXX,XXX | Widening variance tests owner attention',
  'Exploit — Multi-balance float | US 9,876,543 B2 | Balances diverge as the kite widens',
];

function callout(firstLine: string, items: string[] = PATENT_ROWS): HTMLElement {
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

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('parseMarker', () => {
  it('reads the component name and optional title off the first line', () => {
    expect(parseMarker('::patents  One attack, five lenses')).toEqual({
      name: 'patents',
      title: 'One attack, five lenses',
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

describe('splitItem', () => {
  it('splits label from fields on an em dash, and fields on pipes', () => {
    expect(splitItem(PATENT_ROWS[0])).toEqual({
      label: 'Probe',
      fields: ['Check serial-number pattern', 'US 7,123,456', 'Out-of-sequence serials flag access testing'],
      raw: PATENT_ROWS[0],
    });
  });

  it('tolerates an en dash or a spaced hyphen, since Notion and keyboards vary', () => {
    expect(splitItem('Probe – a | b').label).toBe('Probe');
    expect(splitItem('Probe - a | b').label).toBe('Probe');
    // A hyphen inside a word is not a separator.
    expect(splitItem('Serial-number check | b')).toEqual({
      label: '',
      fields: ['Serial-number check', 'b'],
      raw: 'Serial-number check | b',
    });
  });
});

describe('parseCallout', () => {
  it('returns the marker, title and one item per top-level bullet', () => {
    const spec = parseCallout(callout('::patents  One attack, five lenses'));
    expect(spec).not.toBeNull();
    expect(spec!.name).toBe('patents');
    expect(spec!.title).toBe('One attack, five lenses');
    expect(spec!.items.map((i) => i.label)).toEqual(['Probe', 'Test', 'Exploit']);
  });

  it('returns null for a callout without a marker', () => {
    expect(parseCallout(callout('Just a note'))).toBeNull();
  });

  it('skips nested bullets so a sub-list does not become a row', () => {
    const el = callout('::patents', ['Probe — a | b']);
    el.querySelector('li')!.insertAdjacentHTML('beforeend', '<ul><li>nested detail</li></ul>');
    const spec = parseCallout(el)!;
    expect(spec.items).toHaveLength(1);
    expect(spec.items[0].fields[0]).toBe('a');
  });
});

describe('enhance', () => {
  it('replaces a marked callout with the component and marks it processed', async () => {
    const el = callout('::patents  One attack, five lenses');
    document.body.append(el);
    const load = async (name: string) => {
      expect(name).toBe('patents');
      return { mod: { render: renderPatents }, css: '' };
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
      return { mod: { render: renderPatents }, css: '' };
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
    await enhance(document, { load: async () => { calls += 1; return { mod: { render: renderPatents }, css: '' }; } });
    expect(calls).toBe(0);
    expect(document.body.contains(el)).toBe(true);
    expect(el.hasAttribute('data-bhd-pending')).toBe(false);
  });

  it('on a failed load, reveals the original callout with the marker stripped', async () => {
    const el = callout('::patents  One attack, five lenses');
    document.body.append(el);

    await enhance(document, { load: async () => { throw new Error('offline'); } });

    expect(document.body.contains(el)).toBe(true);
    expect(el.hasAttribute('data-bhd-pending')).toBe(false);
    expect(el.dataset.bhdState).toBe('failed');
    const first = el.querySelector('.notion-callout__content > *')!;
    expect(first.textContent).toBe('One attack, five lenses');
    // Still three readable bullets.
    expect(el.querySelectorAll('li')).toHaveLength(3);
  });

  it('exposes the registry so a new component is one line', () => {
    expect(REGISTRY.patents).toBe('patents.js');
  });

  it('does not treat inherited Object.prototype names as components', async () => {
    // `REGISTRY['constructor']` is truthy on any plain object; a marker that
    // happens to spell one must stay an unknown marker, untouched.
    expect(isRegistered('constructor')).toBe(false);
    expect(isRegistered('__proto__')).toBe(false);
    expect(isRegistered('toString')).toBe(false);
    expect(isRegistered('patents')).toBe(true);

    const el = callout('::constructor  Title');
    document.body.append(el);
    let calls = 0;
    await enhance(document, { load: async () => { calls += 1; return { mod: { render: renderPatents }, css: '' }; } });
    expect(calls).toBe(0);
    expect(document.body.contains(el)).toBe(true);
    expect(el.hasAttribute('data-bhd')).toBe(false);
  });
});

describe('patents component', () => {
  it('renders one row per item, inside a shadow root, with the title', () => {
    const el = callout('::patents  One attack, five lenses');
    const spec = parseCallout(el)!;
    const aside = renderPatents(el, { ...spec, css: '.x{}' });
    const root = aside.shadowRoot!;
    expect(root).not.toBeNull();
    expect(root.querySelector('style')!.textContent).toBe('.x{}');
    expect(root.querySelector('.bhd-patents__title')!.textContent).toBe('One attack, five lenses');
    expect(root.querySelectorAll('.bhd-patents__row')).toHaveLength(3);
    expect(aside.getAttribute('aria-label')).toBe('One attack, five lenses');
  });

  it('links real patent numbers to Google Patents and leaves placeholders as text', () => {
    expect(patentUrl('US 7,123,456')).toBe('https://patents.google.com/patent/US7123456');
    expect(patentUrl('US 9,876,543 B2')).toBe('https://patents.google.com/patent/US9876543B2');
    expect(patentUrl('US X,XXX,XXX')).toBeNull();
    expect(patentUrl('not a patent')).toBeNull();

    const el = callout('::patents');
    const aside = renderPatents(el, { ...parseCallout(el)!, css: '' });
    const links = aside.shadowRoot!.querySelectorAll('a.bhd-patents__number');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('https://patents.google.com/patent/US7123456');
    expect(links[0].getAttribute('rel')).toContain('noopener');
    const plain = aside.shadowRoot!.querySelectorAll('span.bhd-patents__number');
    expect(plain).toHaveLength(1);
    expect(plain[0].textContent).toBe('US X,XXX,XXX');
  });

  it('falls back to a plain title when the marker carries none', () => {
    const el = callout('::patents');
    const aside = renderPatents(el, { ...parseCallout(el)!, css: '' });
    expect(aside.shadowRoot!.querySelector('.bhd-patents__title')).toBeNull();
    expect(aside.getAttribute('aria-label')).toBe('Patents');
  });
});
