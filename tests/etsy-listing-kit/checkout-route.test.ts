import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external deps so the route logic is exercised without Stripe/Supabase.
const { create, createOrder, attachCheckoutSession } = vi.hoisted(() => ({
  create: vi.fn(),
  createOrder: vi.fn(),
  attachCheckoutSession: vi.fn(),
}));

vi.mock('@/lib/etsy-listing-kit/stripe', () => ({
  stripe: { checkout: { sessions: { create } } },
  isLiveMode: () => false,
}));
vi.mock('@/lib/etsy-listing-kit/orders', () => ({ createOrder, attachCheckoutSession }));

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
