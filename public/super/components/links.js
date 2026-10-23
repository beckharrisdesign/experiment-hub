/*
 * ::links — a curated list of external links, managed in Notion.
 * Each item: title, link, description, optional thumbnail.
 *
 * Notion source (a callout):
 *
 *   ::links  Patents
 *   • Presenting fraud detection information | https://patents.google.com/patent/US… | Connects an alert to the right interface components.
 *   • Presenting quasi-periodic activity | https://… | https://…/thumb.png | Visually connects recurring transactions…
 *
 * Per bullet, in any order:
 *   link        : a Notion link anywhere in the bullet (select the title,
 *                 Cmd/Ctrl+K, paste the URL) — or a field that is a URL
 *   thumbnail   : a field that is an image URL (.png .jpg .jpeg .webp .gif
 *                 .svg .avif), or an image block nested under the bullet
 *   title       : the first field that is not a URL
 *   description : every remaining non-URL field, in order
 *
 * These all render the same:
 *   • [Title](https://…) | Description
 *   • Title | https://… | Description
 *   • Title | Description | https://…
 *
 * The marker's title ("Patents" above) is the heading. `::patents` is an
 * alias for this component, so an existing callout keeps working.
 *
 * Rendered into a Shadow DOM so Super's theme cannot reach in. Styles come
 * from links.css next to this file, handed over by the loader as text.
 */

const isUrl = (s) => /^https?:\/\/\S+$/i.test(s);
const isImageUrl = (s) => isUrl(s) && /\.(png|jpe?g|webp|gif|svg|avif)(\?\S*)?$/i.test(s);

/**
 * @param {{ raw: string, fields: string[], links: { href: string, text: string }[], images: string[] }} item
 * @returns {{ title: string, href: string | null, description: string, thumb: string | null }}
 */
export function describe(item) {
  const urls = item.fields.filter(isUrl);
  const thumb = urls.find(isImageUrl) ?? item.images?.[0] ?? null;
  const linkField = urls.find((u) => !isImageUrl(u)) ?? null;
  const href = item.links.find((l) => !isImageUrl(l.href))?.href ?? linkField;
  const text = item.fields.filter((f) => !isUrl(f));
  const title = text[0] ?? item.raw;
  const description = text.slice(1).join(' · ');
  return { title, href, description, thumb };
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/**
 * @param {Element} _source   the original `.notion-callout` (already parsed into `opts`)
 * @param {{ title: string, items: Parameters<typeof describe>[0][], css: string }} opts
 * @returns {HTMLElement}
 */
export function render(_source, opts) {
  const host = el('aside', 'bhd-component bhd-links');
  host.setAttribute('aria-label', opts.title || 'Links');
  const root = host.attachShadow({ mode: 'open' });

  if (opts.css) root.append(el('style', null, opts.css));

  const wrap = el('div', 'bhd-links__wrap');
  if (opts.title) wrap.append(el('p', 'bhd-links__title', opts.title));

  const list = el('ul', 'bhd-links__rows');
  for (const item of opts.items) {
    const { title, href, description, thumb } = describe(item);
    const row = el('li', 'bhd-links__row');
    if (thumb) {
      const img = el('img', 'bhd-links__thumb');
      img.src = thumb;
      img.alt = title;
      // Opens in the site lightbox (public/super/lightbox.js), captioned with
      // the row's own text.
      img.dataset.bhdLightbox = '';
      img.dataset.bhdCaption = description ? `${title} — ${description}` : title;
      img.loading = 'lazy';
      img.decoding = 'async';
      row.append(img);
      row.classList.add('has-thumb');
    }
    const body = el('div', 'bhd-links__body');
    if (href) {
      const a = el('a', 'bhd-links__name', title);
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      body.append(a);
    } else {
      body.append(el('span', 'bhd-links__name', title));
    }
    if (description) body.append(el('p', 'bhd-links__desc', description));
    row.append(body);
    list.append(row);
  }
  wrap.append(list);
  root.append(wrap);
  return host;
}
