import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external deps so the route logic is exercised without Stripe/Supabase.
const { create, createOrder, createListingOrder, attachCheckoutSession, fetchListingRaw } = vi.hoisted(() => ({
  create: vi.fn(),
  createOrder: vi.fn(),
  createListingOrder: vi.fn(),
  attachCheckoutSession: vi.fn(),
  fetchListingRaw: vi.fn(),
}));

vi.mock('@/lib/etsy-listing-kit/stripe', () => ({
  stripe: { checkout: { sessions: { create } } },
  isLiveMode: () => false,
}));
vi.mock('@/lib/etsy-listing-kit/orders', () => ({ createOrder, createListingOrder, attachCheckoutSession }));
vi.mock('@/lib/etsy-listing-kit/listing-fetch', () => ({ fetchListingRaw }));

import { POST } from '@/app/etsy-listing-kit/api/checkout/route';

// Pass FormData directly (same realm) so File instanceof holds — a real
// multipart round-trip would return undici File objects from another realm.
function req(fd: FormData) {
  return {
    formData: async () => fd,
    headers: new Headers({ origin: 'http://localhost' }),
    nextUrl: { origin: 'http://localhost' },
  } as never;
}
function pngFile() {
  return new File([new Uint8Array([1, 2, 3])], 'design.png', { type: 'image/png' });
}

beforeEach(() => {
  create.mockReset().mockResolvedValue({ id: 'cs_123', url: 'https://stripe.test/cs_123' });
  createOrder.mockReset().mockResolvedValue('ord_1');
  attachCheckoutSession.mockReset().mockResolvedValue(undefined);
});

describe('POST /etsy-listing-kit/api/checkout', () => {
  it('creates an order + Stripe session and returns the url', async () => {
    const fd = new FormData();
    fd.append('design', pngFile());
    fd.append('utm_source', 'meta');
    const res = await POST(req(fd));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://stripe.test/cs_123' });

    expect(createOrder).toHaveBeenCalledOnce();
    // one-time payment session, scoped metadata
    const args = create.mock.calls[0][0];
    expect(args.mode).toBe('payment');
    expect(args.metadata.experiment_id).toBe('etsy-listing-kit');
    expect(args.metadata.order_id).toBe('ord_1');
    expect(attachCheckoutSession).toHaveBeenCalledWith('ord_1', 'cs_123');
  });

  it('rejects an unsupported file type (415) without creating an order', async () => {
    const fd = new FormData();
    fd.append('design', new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    const res = await POST(req(fd));
    expect(res.status).toBe(415);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('rejects a missing file (400)', async () => {
    const res = await POST(req(new FormData()));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});

// 3.4b — the evaluation-seeded path: JSON body, no upload anywhere.
function jsonReq(body: unknown) {
  return {
    json: async () => body,
    headers: new Headers({ origin: 'http://localhost', 'content-type': 'application/json' }),
    nextUrl: { origin: 'http://localhost' },
  } as never;
}

describe('POST /etsy-listing-kit/api/checkout (listing path)', () => {
  beforeEach(() => {
    createListingOrder.mockReset().mockResolvedValue('ord_L1');
    fetchListingRaw.mockReset().mockResolvedValue({
      listing_id: 4522917501,
      title: 'Custom engraved pet keychain',
      images: [{ rank: 1, url_570xN: 'https://cdn/x.jpg' }],
    });
  });

  it('validates the listing, creates a listing order, returns the Stripe url', async () => {
    const res = await POST(jsonReq({ listing_id: 4522917501, click_id: 'gclid1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://stripe.test/cs_123');
    expect(fetchListingRaw).toHaveBeenCalledWith(4522917501);
    expect(createListingOrder).toHaveBeenCalledWith(
      4522917501,
      'Custom engraved pet keychain',
      expect.objectContaining({ attribution: expect.objectContaining({ click_id: 'gclid1' }) }),
    );
    expect(createOrder).not.toHaveBeenCalled(); // no upload order on this path
    const args = create.mock.calls[0][0];
    expect(args.line_items[0].price_data.product_data.description).toBe('Custom engraved pet keychain');
    expect(attachCheckoutSession).toHaveBeenCalledWith('ord_L1', 'cs_123');
  });

  it('404s when the listing is unreadable, creating nothing', async () => {
    fetchListingRaw.mockResolvedValue(null);
    const res = await POST(jsonReq({ listing_id: 1 }));
    expect(res.status).toBe(404);
    expect(createListingOrder).not.toHaveBeenCalled();
  });

  it('422s a photoless listing — there is nothing to build a kit from', async () => {
    fetchListingRaw.mockResolvedValue({ listing_id: 1, title: 'x', images: [] });
    const res = await POST(jsonReq({ listing_id: 1 }));
    expect(res.status).toBe(422);
    expect(createListingOrder).not.toHaveBeenCalled();
  });

  it('400s a missing/invalid listing_id', async () => {
    expect((await POST(jsonReq({}))).status).toBe(400);
    expect((await POST(jsonReq({ listing_id: 'nope' }))).status).toBe(400);
    expect(fetchListingRaw).not.toHaveBeenCalled();
  });
});
