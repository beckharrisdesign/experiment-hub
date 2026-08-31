import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getOrder, downloadOutput } = vi.hoisted(() => ({ getOrder: vi.fn(), downloadOutput: vi.fn() }));
vi.mock('@/lib/etsy-listing-kit/orders', () => ({ getOrder, downloadOutput }));

import { GET } from '@/app/etsy-listing-kit/api/download/route';

function req(order?: string) {
  const sp = new URLSearchParams(order ? { order } : {});
  return { nextUrl: { searchParams: sp } } as never;
}

beforeEach(() => {
  getOrder.mockReset();
  downloadOutput.mockReset().mockImplementation(async (p: string) => Buffer.from(`img:${p}`));
});

describe('GET /etsy-listing-kit/api/download', () => {
  it('400s without an order id', async () => {
    expect((await GET(req())).status).toBe(400);
  });

  it('404s for an unknown order', async () => {
    getOrder.mockResolvedValue(null);
    expect((await GET(req('nope'))).status).toBe(404);
  });

  it('409s when the order is not yet fulfilled', async () => {
    getOrder.mockResolvedValue({ status: 'processing' });
    expect((await GET(req('ord_1'))).status).toBe(409);
  });

  it('streams a zip of all 6 images for an upload-era order (no manifest)', async () => {
    getOrder.mockResolvedValue({ status: 'fulfilled', output_ref: 'ord_1/' });
    downloadOutput.mockImplementation(async (p: string) => {
      if (p.endsWith('manifest.json')) throw new Error('not found'); // legacy order
      return Buffer.from(`img:${p}`);
    });
    const res = await GET(req('ord_1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(res.headers.get('content-disposition')).toContain('.zip');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.readUInt32LE(0)).toBe(0x04034b50); // local file header — valid zip
    const imageCalls = downloadOutput.mock.calls.filter(([p]: [string]) => !p.endsWith('manifest.json'));
    expect(imageCalls).toHaveLength(6);
  });

  it('zips the manifest set + text file for a listing-kit order', async () => {
    getOrder.mockResolvedValue({ status: 'fulfilled', output_ref: 'ord_2/', listing_id: 4522917501 });
    const manifest = {
      version: 1,
      images: Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, label: `Scene ${i}`, file: `s${i}.jpg` })),
      template: { id: 'template', label: 'Template', file: 'template.jpg' },
      kitText: {
        suggestedTitle: 'A title',
        tags: ['one', 'two'],
        altTexts: [{ rank: 1, alt: 'Photo one' }],
      },
    };
    downloadOutput.mockImplementation(async (p: string) =>
      p.endsWith('manifest.json') ? Buffer.from(JSON.stringify(manifest)) : Buffer.from(`img:${p}`));
    const res = await GET(req('ord_2'));
    expect(res.status).toBe(200);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.readUInt32LE(0)).toBe(0x04034b50);
    // 10 images + template fetched; the text file is built, not downloaded
    const imageCalls = downloadOutput.mock.calls.filter(([p]: [string]) => !p.endsWith('manifest.json'));
    expect(imageCalls).toHaveLength(11);
    expect(buf.toString('latin1')).toContain('title-tags-alt-text.txt');
    expect(buf.toString('latin1')).toContain('SUGGESTED TITLE');
  });
});
