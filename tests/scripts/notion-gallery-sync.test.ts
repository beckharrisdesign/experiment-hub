import { describe, it, expect } from 'vitest';
import {
  parseArgs, orderGallery, resumePlan, buildImagesPatch, shouldSkipRow, roleOf,
} from '../../scripts/notion-gallery-sync-lib.mjs';

describe('parseArgs', () => {
  it('parses apply and sku', () => {
    expect(parseArgs(['--apply', '--sku', 'WH-UN-S-0DF4'])).toEqual({ apply: true, sku: 'WH-UN-S-0DF4' });
    expect(parseArgs([])).toEqual({ apply: false, sku: null });
  });
  it('rejects --sku without an operand so a targeted run cannot widen', () => {
    expect(() => parseArgs(['--apply', '--sku'])).toThrow(/requires a SKU/);
    expect(() => parseArgs(['--sku', '--apply'])).toThrow(/requires a SKU/);
  });
});

describe('orderGallery', () => {
  it('orders roles hero-first and accepts png and jpg', () => {
    const files = [
      'Listing-WH-UN-B-X-detail-1.jpg', 'Listing-WH-UN-B-X-hero.jpg',
      'Listing-WH-UN-B-X-content-center.jpg', 'notes.txt',
    ];
    const out = orderGallery(files, 'WH-UN-B-X');
    expect(out.map((e: { role: string }) => e.role)).toEqual(['hero', 'content-center', 'detail-1']);
  });
  it('derives roles for the composer bundle naming', () => {
    expect(roleOf('Listing-WH-UN-B-STAGING-hero.jpg', 'WH-UN-B-STAGING')).toBe('hero');
  });
});

describe('resumePlan', () => {
  it('skips files already attached, matching by stem across extensions', () => {
    const existing = [{ name: 'Listing-X-hero.jpg', type: 'file', file: { url: 'u' } }];
    const entries = [
      { role: 'hero', name: 'Listing-X-hero.png' },
      { role: 'scale', name: 'Listing-X-scale.png' },
    ];
    const plan = resumePlan(existing, entries);
    expect(plan.toUpload.map((e: { role: string }) => e.role)).toEqual(['scale']);
    expect(plan.keep).toHaveLength(1);
  });
});

describe('buildImagesPatch', () => {
  it('passes existing attachments through and references new uploads', () => {
    const keep = [{ name: 'a.jpg', type: 'file', file: { url: 'u' } }];
    const patch = buildImagesPatch(keep, [{ id: 'fu1', name: 'b.png' }]);
    expect(patch.properties.Images.files).toEqual([
      { name: 'a.jpg', type: 'file', file: { url: 'u' } },
      { type: 'file_upload', file_upload: { id: 'fu1' }, name: 'b.png' },
    ]);
  });
});

describe('shouldSkipRow', () => {
  it('skips complete rows only', () => {
    expect(shouldSkipRow(12, 12)).toBe(true);
    expect(shouldSkipRow(1, 12)).toBe(false);
    expect(shouldSkipRow(0, 0)).toBe(false);
  });
});
