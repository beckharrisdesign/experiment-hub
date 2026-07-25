import { describe, it, expect, vi, beforeEach } from 'vitest';

const { constructEvent, createAdminSupabaseClient, fulfillOrder, refundFailedOrder, headersGet } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  fulfillOrder: vi.fn(),
  refundFailedOrder: vi.fn(),
  headersGet: vi.fn(() => 'sig_123'),
}));

vi.mock('@/lib/etsy-listing-kit/stripe', () => ({ stripe: { webhooks: { constructEvent } }, isLiveMode: () => true }));
vi.mock('@/lib/etsy-listing-kit/supabase-admin', () => ({ createAdminSupabaseClient }));
vi.mock('@/lib/etsy-listing-kit/fulfillment', () => ({ fulfillOrder }));
vi.mock('@/lib/etsy-listing-kit/refund', () => ({ refundFailedOrder }));
vi.mock('next/headers', () => ({ headers: async () => ({ get: headersGet }) }));

import { POST } from '@/app/etsy-listing-kit/api/webhook/route';

const req = { text: async () => 'raw-body' } as never;

/** Fake Supabase admin client supporting select().eq().single() + update().eq(). */
function fakeDb(existingEventId: string | null) {
  const single = vi.fn().mockResolvedValue({ data: { stripe_event_id: existingEventId } });
  const updateEq = vi.fn().mockResolvedValue({});
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })),
      update: vi.fn(() => ({ eq: updateEq })),
    })),
    _updateEq: updateEq,
  };
}

function event(over: Record<string, unknown> = {}) {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    livemode: true,
    data: { object: { metadata: { experiment_id: 'etsy-listing-kit', order_id: 'ord_1' }, payment_status: 'paid', payment_intent: 'pi_1' } },
    ...over,
  };
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  constructEvent.mockReset();
  fulfillOrder.mockReset().mockResolvedValue({ alreadyDone: false });
  refundFailedOrder.mockReset().mockResolvedValue({ refunded: true });
  createAdminSupabaseClient.mockReset().mockReturnValue(fakeDb(null));
});

describe('POST /etsy-listing-kit/api/webhook', () => {
  it('rejects an invalid signature (400)', async () => {
    constructEvent.mockImplementation(() => { throw new Error('bad sig'); });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fulfillOrder).not.toHaveBeenCalled();
  });

  it('acks unrelated event types without fulfilling (200)', async () => {
    constructEvent.mockReturnValue(event({ type: 'payment_intent.created' }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fulfillOrder).not.toHaveBeenCalled();
  });

  it('ignores a wrong-experiment scope (200, no fulfilment)', async () => {
    constructEvent.mockReturnValue(event({ data: { object: { metadata: { experiment_id: 'other', order_id: 'x' }, payment_status: 'paid' } } }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fulfillOrder).not.toHaveBeenCalled();
  });

  it('does not double-fulfil a duplicate event', async () => {
    createAdminSupabaseClient.mockReturnValue(fakeDb('evt_1')); // already processed this event id
    constructEvent.mockReturnValue(event());
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ duplicate: true });
    expect(fulfillOrder).not.toHaveBeenCalled();
  });

  it('marks paid and fulfils a first-time paid checkout', async () => {
    constructEvent.mockReturnValue(event());
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fulfillOrder).toHaveBeenCalledWith('ord_1');
    expect(refundFailedOrder).not.toHaveBeenCalled();
  });

  it('auto-refunds when fulfilment fails', async () => {
    constructEvent.mockReturnValue(event());
    fulfillOrder.mockRejectedValue(new Error('render failed'));
    const res = await POST(req);
    expect(res.status).toBe(200); // never 500s the webhook
    expect(refundFailedOrder).toHaveBeenCalledWith('ord_1');
  });
});
