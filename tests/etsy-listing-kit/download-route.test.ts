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

  it('streams a zip of all 6 images when fulfilled', async () => {
    getOrder.mockResolvedValue({ status: 'fulfilled', output_ref: 'ord_1/' });
    const res = await GET(req('ord_1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(res.headers.get('content-disposition')).toContain('.zip');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.readUInt32LE(0)).toBe(0x04034b50); // local file header — valid zip
    expect(downloadOutput).toHaveBeenCalledTimes(6);
  });
});
