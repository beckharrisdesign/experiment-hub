import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getOrder, signedOutputUrl } = vi.hoisted(() => ({ getOrder: vi.fn(), signedOutputUrl: vi.fn() }));
vi.mock('@/lib/etsy-listing-kit/orders', () => ({ getOrder, signedOutputUrl }));

import { GET } from '@/app/etsy-listing-kit/api/order/route';

function req(order?: string) {
  const sp = new URLSearchParams(order ? { order } : {});
  return { nextUrl: { searchParams: sp } } as never;
}

beforeEach(() => {
  getOrder.mockReset();
  signedOutputUrl.mockReset().mockImplementation(async (p: string) => `https://signed/${p}`);
});

describe('GET /etsy-listing-kit/api/order', () => {
  it('400s without an order id', async () => {
    expect((await GET(req())).status).toBe(400);
  });

  it('404s for an unknown order', async () => {
    getOrder.mockResolvedValue(null);
    expect((await GET(req('nope'))).status).toBe(404);
  });

  it('returns only the status while not fulfilled (no signed URLs)', async () => {
    getOrder.mockResolvedValue({ status: 'processing' });
    const json = await (await GET(req('ord_1'))).json();
    expect(json).toEqual({ status: 'processing' });
    expect(signedOutputUrl).not.toHaveBeenCalled();
  });

  it('returns 6 signed image URLs once fulfilled', async () => {
    getOrder.mockResolvedValue({ status: 'fulfilled', output_ref: 'ord_1/' });
    const json = await (await GET(req('ord_1'))).json();
    expect(json.status).toBe('fulfilled');
    expect(json.images).toHaveLength(6);
    expect(json.images[0].url).toMatch(/^https:\/\/signed\/ord_1\//);
  });
});
