import { describe, it, expect } from 'vitest';
import { buildBrief, isTraceable, type BriefInput } from '@/lib/etsy-listing-kit/brief';
import keychain from '@/lib/etsy-listing-kit/fixtures/keychain-4522917501.json';
import floral from '@/lib/etsy-listing-kit/fixtures/floral-4465357735.json';

describe('buildBrief', () => {
  it('flags the wording-thin keychain and restates only API facts', () => {
    const brief = buildBrief(keychain as unknown as BriefInput);
    expect(brief.wordingThin).toBe(true); // "TBD" description, zero tags, no alt
    expect(brief.phrases).toHaveLength(0);
    expect(brief.what).toEqual({ text: 'Custom engraved pet keychain', source: 'title' });
    const factTexts = brief.facts.map((f) => f.text);
    expect(factTexts).toContain('$25.00');
    expect(factTexts).toContain('made to order');
    expect(factTexts).toContain('ships in 6+ days');
    expect(factTexts).toContain('5 available');
    expect(brief.photoCount).toBe(2);
  });

  it('extracts the floral listing’s wording verbatim, every phrase sourced', () => {
    const brief = buildBrief(floral as unknown as BriefInput);
    expect(brief.wordingThin).toBe(false);
    // tags arrive verbatim with a tag source
    const tags = brief.phrases.filter((p) => p.source === 'tag');
    expect(tags.map((t) => t.text)).toContain('floral hoop art');
    expect(tags).toHaveLength((floral.tags as string[]).length);
    // the description lead is the first sentence, verbatim
    const description = brief.phrases.find((p) => p.source === 'description');
    expect(description?.text).toMatch(/^This digital pattern for easy floral botanical design/);
    // real alt text carries through
    expect(brief.phrases.some((p) => p.source === 'alt_text')).toBe(true);
    // no phrase exists without a source
    for (const phrase of [brief.what, ...brief.facts, ...brief.phrases]) {
      expect(phrase.source).toBeTruthy();
      expect(phrase.text.trim()).toBe(phrase.text);
      expect(phrase.text.length).toBeGreaterThan(0);
    }
  });

  it('treats placeholder descriptions as no wording', () => {
    const brief = buildBrief({ listing_id: 1, title: 'Thing', description: 'TBD' } as BriefInput);
    expect(brief.phrases).toHaveLength(0);
    expect(brief.wordingThin).toBe(true);
  });
});

describe('isTraceable (QA 4.6 provenance assertion)', () => {
  const brief = buildBrief(keychain as unknown as BriefInput);

  it('accepts card copy that quotes the listing', () => {
    expect(isTraceable(brief, 'Custom engraved pet keychain')).toBe(true);
    expect(isTraceable(brief, 'MADE TO ORDER')).toBe(true); // display casing passes
    expect(isTraceable(brief, 'ships in 6+ days')).toBe(true);
  });

  it('rejects invented copy — the 02.26 collage bug caught by machine', () => {
    // This exact phrase shipped on a draft card before the wording rule; the
    // listing never says it, so the assertion must fail it.
    expect(isTraceable(brief, 'Engraved from your pet’s photo')).toBe(false);
    expect(isTraceable(brief, 'every one unique')).toBe(false);
    expect(isTraceable(brief, '')).toBe(false);
  });
});
