import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * "Coming soon" rows on beckharrisdesign.com (site.css §6).
 *
 * A BHD Database page whose Availability property is set shows up on the site
 * muted and unclickable. Super renders every visible property with a class of
 * `property-<hex>`, where <hex> is the Notion property ID's characters as hex
 * (Year, ID `>m_L`, renders as `property-3e6d5f4c`). Availability's ID is
 * `}x;N`. If the property is ever deleted and recreated it gets a new ID, and
 * this test is where that shows up first.
 *
 * Super renders the property's <div> on EVERY row in the view, empty when the
 * page has no value (seen live 2026-10-30). Only a set value has a pill inside
 * it, so the rule must key on the pill: `:has(.property-… )` alone would mute
 * the whole list.
 */

const css = readFileSync(resolve(__dirname, '../../public/super/site.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

const propertyClass = (notionId: string) =>
  'property-' + [...notionId].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

/** Every `selector { body }` rule whose selector list mentions `needle`. */
function rulesMentioning(needle: string) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => sel.includes(needle))
    .map(([, sel, body]) => ({ sel: sel.trim(), body }));
}

const AVAILABILITY = propertyClass('}x;N');
const SET = `${AVAILABILITY} .notion-pill`;

describe('coming-soon rows', () => {
  it('derives Super’s property class the way the live site does', () => {
    expect(propertyClass('>m_L')).toBe('property-3e6d5f4c'); // Year, as seen in the DOM
    expect(AVAILABILITY).toBe('property-7d783b4e');
  });

  it('mutes a list row that carries the Availability property', () => {
    const rules = rulesMentioning(`.notion-collection-list__item:has(.${SET})`);
    expect(rules.some((r) => /opacity\s*:/.test(r.body))).toBe(true);
  });

  it('removes the row’s link overlay, so it cannot be clicked, tabbed to, or announced', () => {
    const rules = rulesMentioning('.notion-collection-list__item-anchor');
    const anchor = rules.find((r) => r.sel.includes(SET));
    expect(anchor?.body).toMatch(/display\s*:\s*none/);
  });

  it('never keys on the bare property class, which Super renders on every row', () => {
    const bare = new RegExp(`:has\\(\\.${AVAILABILITY}\\)`);
    expect(css).not.toMatch(bare);
  });

  it('makes a gallery card with the property unclickable too', () => {
    const rules = rulesMentioning(`.notion-collection-card:has(.${SET})`);
    expect(rules.some((r) => /pointer-events\s*:\s*none/.test(r.body))).toBe(true);
  });
});
