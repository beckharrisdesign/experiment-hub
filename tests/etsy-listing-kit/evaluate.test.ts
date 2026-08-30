import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import {
  parseEtsyUrl,
  evaluateListing,
  composeSampleTitle,
  requiredFieldChecklist,
  type RawApiListing,
} from '@/lib/etsy-listing-kit/evaluate';
import { scoreListing } from '@/lib/etsy-scorecard';
import { CITATIONS, checkedLabel } from '@/lib/etsy-listing-kit/citations';

function fixture(name: string): RawApiListing {
  const p = path.join(process.cwd(), 'lib', 'etsy-listing-kit', 'fixtures', name);
  return JSON.parse(readFileSync(p, 'utf8'));
}

const keychain = fixture('keychain-4522917501.json');
const floral = fixture('floral-4465357735.json');
const full = fixture('synthetic-fully-built.json');

describe('parseEtsyUrl', () => {
  it('extracts the listing id from a clean URL', () => {
    expect(parseEtsyUrl('https://www.etsy.com/listing/4522917501/custom-engraved-pet-keychain')).toEqual({
      kind: 'listing',
      listingId: 4522917501,
    });
  });

  it('tolerates real-world tracking clutter', () => {
    const messy =
      'https://www.etsy.com/listing/4465357735/digital-floral-embroidery-pattern?ref=shop_home_feat_1&sr_prefetch=1&pf_from=shop_home&dd=1&logging_key=36da1b1e6108cc4cd70c7e97d371e46bb63054b4%3A4465357735';
    expect(parseEtsyUrl(messy)).toEqual({ kind: 'listing', listingId: 4465357735 });
  });

  it('recognizes a shop link as a suggestion case, not a failure', () => {
    expect(parseEtsyUrl('https://www.etsy.com/shop/WatermarkandHue')).toEqual({
      kind: 'shop',
      shopSlug: 'WatermarkandHue',
    });
  });

  it('rejects non-Etsy links with a plain-language reason', () => {
    const parsed = parseEtsyUrl('https://www.instagram.com/p/abc123');
    expect(parsed.kind).toBe('invalid');
    if (parsed.kind === 'invalid') expect(parsed.reason).toMatch(/not an Etsy link/i);
  });

  it('rejects junk input', () => {
    expect(parseEtsyUrl('').kind).toBe('invalid');
    expect(parseEtsyUrl('not a url at all !!!').kind).toBe('invalid');
  });
});

describe('evaluateListing — keychain (the gap-heavy real listing)', () => {
  const result = evaluateListing(keychain);

  it('renders identity from the real listing', () => {
    expect(result.identity.title).toBe('Custom engraved pet keychain');
    expect(result.identity.imageUrl).toMatch(/etsystatic/);
  });

  it('reports required fields truthfully — the keychain is a draft, so Active fails', () => {
    const active = result.requiredFields.find((f) => f.key === 'active');
    expect(active?.present).toBe(false);
    expect(result.requiredPass).toBe(false);
  });

  it('produces recommendations in the fixed order with video last', () => {
    const keys = result.recommendations.map((r) => r.key);
    expect(keys[0]).toBe('images_open');
    expect(keys[keys.length - 1]).toBe('video');
    expect(keys).toContain('title');
    expect(keys).toContain('alt_text');
    expect(keys).toContain('tags'); // 0 tags — the case the real data surfaced
    expect(keys).not.toContain('images_improve'); // one image card, never both
  });

  it('frames the open-slots caption around the 20-slot cap', () => {
    const images = result.recommendations.find((r) => r.key === 'images_open');
    expect(images?.caption).toContain('18 more chances');
  });

  it('marks the video card as the kit gap (coming soon)', () => {
    const video = result.recommendations.find((r) => r.key === 'video');
    expect(video?.chip.label).toBe('COMING SOON');
    expect(video?.kit.comingSoon).toBe(true);
  });

  it('cites Etsy documentation with a checked date on every recommendation', () => {
    for (const rec of result.recommendations) {
      expect(rec.citation, rec.key).not.toBeNull();
      expect(rec.citation?.checked).toMatch(/^checked [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
      expect(rec.citation?.sourceUrl).toMatch(/etsy\.com/);
    }
  });

  it('is in the gaps state', () => {
    expect(result.state).toBe('gaps');
  });
});

describe('evaluateListing — floral (partially built)', () => {
  const result = evaluateListing(floral);

  it('passes all required fields', () => {
    expect(result.requiredPass).toBe(true);
  });

  it('skips the tags recommendation when all 13 tags are in use', () => {
    expect(result.recommendations.map((r) => r.key)).not.toContain('tags');
  });

  it('still flags alt text when only some photos carry it', () => {
    const alt = result.recommendations.find((r) => r.key === 'alt_text');
    expect(alt).toBeDefined();
    expect(alt?.evidence.missingAlt).toBe(8);
  });

  it('offers a free sample title composed from the listing itself', () => {
    expect(result.sampleTitle).not.toBeNull();
    expect(result.sampleTitle!.length).toBeLessThanOrEqual(140);
    expect(result.sampleTitle!.length).toBeGreaterThan(floral.title!.length);
  });
});

describe('evaluateListing — fully built listing', () => {
  const result = evaluateListing(full);

  it('does not invent gaps', () => {
    expect(result.state).toBe('full');
    expect(result.recommendations.filter((r) => r.key !== 'video')).toHaveLength(0);
  });
});

describe('rubric parity (spec: one rubric, shared with the scorecard)', () => {
  it('the evaluation embeds exactly what the scorecard computes', () => {
    for (const raw of [keychain, floral, full]) {
      const direct = scoreListing(raw);
      const viaEvaluation = evaluateListing(raw).scored;
      expect(viaEvaluation).toEqual(direct);
      expect(evaluateListing(raw).recommendedInUse).toBe(direct.completeness);
    }
  });
});

describe('composeSampleTitle', () => {
  it('returns null when the listing offers nothing to compose from (keychain has no tags)', () => {
    expect(composeSampleTitle(keychain)).toBeNull();
  });

  it('never exceeds the 140-character cap', () => {
    const sample = composeSampleTitle(floral);
    expect(sample).not.toBeNull();
    expect(sample!.length).toBeLessThanOrEqual(140);
  });
});

describe('requiredFieldChecklist', () => {
  it('exempts digital listings from stock/shipping/processing', () => {
    const checks = requiredFieldChecklist(floral); // digital download
    for (const key of ['quantity', 'shipping', 'processing']) {
      expect(checks.find((c) => c.key === key)?.present, key).toBe(true);
    }
  });
});

describe('citations registry', () => {
  it('carries a source URL and last-checked date for every entry', () => {
    for (const c of CITATIONS) {
      expect(c.sourceUrl).toMatch(/^https:\/\/(www\.|help\.)?etsy\.com/);
      expect(c.lastCheckedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(checkedLabel(c)).toContain(String(new Date(c.lastCheckedAt).getUTCFullYear()));
    }
  });
});
