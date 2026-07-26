import { describe, it, expect } from 'vitest';
import { validateUpload, uploadMaxMb } from '@/lib/etsy-listing-kit/upload';

const MB = 1024 * 1024;

describe('validateUpload', () => {
  it('accepts PNG, JPG, SVG within the size limit', () => {
    expect(validateUpload({ type: 'image/png', size: 1 * MB })).toBeNull();
    expect(validateUpload({ type: 'image/jpeg', size: 5 * MB })).toBeNull();
    expect(validateUpload({ type: 'image/svg+xml', size: 100 })).toBeNull();
  });

  it('rejects unsupported types with a friendly message', () => {
    const err = validateUpload({ type: 'application/pdf', size: 100 });
    expect(err).toMatch(/PNG, JPG, or SVG/);
  });

  it('rejects oversized files with the limit in the message', () => {
    const err = validateUpload({ type: 'image/png', size: (uploadMaxMb + 1) * MB });
    expect(err).toMatch(new RegExp(`${uploadMaxMb} MB`));
  });

  it('accepts a file exactly at the limit', () => {
    expect(validateUpload({ type: 'image/png', size: uploadMaxMb * MB })).toBeNull();
  });
});
