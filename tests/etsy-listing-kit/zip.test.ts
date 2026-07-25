import { describe, it, expect } from 'vitest';
import { makeZip } from '@/lib/etsy-listing-kit/zip';

describe('makeZip', () => {
  it('produces a valid zip with local headers, central directory, and EOCD', () => {
    const zip = makeZip([
      { name: 'flat.jpg', data: Buffer.from('one') },
      { name: 'framed.jpg', data: Buffer.from('two-two') },
    ]);
    // local file header signature
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    // end-of-central-directory record exists with the right entry count
    const eocd = zip.length - 22;
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocd + 10)).toBe(2); // total entries
  });

  it('handles an empty archive', () => {
    const zip = makeZip([]);
    expect(zip.readUInt32LE(0)).toBe(0x06054b50); // EOCD only
    expect(zip.readUInt16LE(10)).toBe(0);
  });

  it('stores data uncompressed (compressed size == uncompressed size)', () => {
    const data = Buffer.from('hello world contents');
    const zip = makeZip([{ name: 'a.jpg', data }]);
    expect(zip.readUInt32LE(18)).toBe(data.length); // compressed
    expect(zip.readUInt32LE(22)).toBe(data.length); // uncompressed
  });
});
