/*
 * ::patents — a patent-lens table.
 *
 * Notion source (a callout):
 *
 *   ::patents  One attack, five lenses
 *   • Probe — Check serial-number pattern | US 7,123,456 | Out-of-sequence serials flag access testing
 *   • Test  — Dollar-variance rings       | US 7,234,567 | Widening variance tests owner attention
 *
 *   label  : the lens (Probe, Test, Exploit…)
 *   field 1: the claim, in plain words
 *   field 2: the patent number — linked to Google Patents when it is a real
 *            number; placeholders like `US X,XXX,XXX` stay as text
 *   field 3: the one-line note
 *
 * Rendered into a Shadow DOM so Super's theme cannot reach in. Styles come
 * from patents.css next to this file, handed over by the loader as text.
 */

/**
 * `US 7,123,456` / `US 9,876,543 B2` → Google Patents URL. Anything that is
 * not a real number (placeholders, prose) → null.
 * @param {string} text
 * @returns {string | null}
 */
export function patentUrl(text) {
  const m = String(text ?? '')
    .trim()
    .match(/^(US|EP|WO|JP|CN|KR|DE|GB)\s*([\d,]{5,})\s*([A-Z]\d?)?$/i);
  if (!m) return null;
  const digits = m[2].replace(/,/g, '');
  if (!/^\d+$/.test(digits)) return null;
  return `https://patents.google.com/patent/${m[1].toUpperCase()}${digits}${(m[3] ?? '').toUpperCase()}`;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/**
 * @param {Element} _source   the original `.notion-callout` (unused: the loader
 *                            already parsed it into `opts`)
 * @param {{ title: string, items: { label: string, fields: string[], raw: string }[], css: string }} opts
 * @returns {HTMLElement}
 */
export function render(_source, opts) {
  const host = el('aside', 'bhd-component bhd-patents');
  host.setAttribute('aria-label', opts.title || 'Patents');
  const root = host.attachShadow({ mode: 'open' });

  if (opts.css) root.append(el('style', null, opts.css));

  const wrap = el('div', 'bhd-patents__wrap');
  const head = el('header', 'bhd-patents__head');
  head.append(el('p', 'bhd-patents__eyebrow', 'Patents'));
  if (opts.title) head.append(el('p', 'bhd-patents__title', opts.title));
  wrap.append(head);

  const list = el('ol', 'bhd-patents__rows');
  for (const item of opts.items) {
    const [claim = '', number = '', note = ''] = item.fields;
    const row = el('li', 'bhd-patents__row');
    row.append(el('span', 'bhd-patents__lens', item.label || '·'));

    const body = el('div', 'bhd-patents__body');
    body.append(el('span', 'bhd-patents__claim', claim || item.raw));
    if (number) {
      const href = patentUrl(number);
      if (href) {
        const a = el('a', 'bhd-patents__number', number);
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        body.append(a);
      } else {
        body.append(el('span', 'bhd-patents__number', number));
      }
    }
    if (note) body.append(el('span', 'bhd-patents__note', note));
    row.append(body);
    list.append(row);
  }
  wrap.append(list);
  root.append(wrap);
  return host;
}
