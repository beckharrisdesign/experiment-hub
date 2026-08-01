/**
 * A failed confirmation email must never break fulfillment — but it must never
 * be silent either. Regression for the live orders (0484a635, 8062b1c9) that
 * fulfilled fine while their email was rejected with the reason discarded.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockUpdate, mockFrom, updates } = vi.hoisted(() => {
  const updates: Record<string, unknown>[] = [];
  const mockUpdate = vi.fn((payload: Record<string, unknown>) => {
    updates.push(payload);
    return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
  });
  const mockFrom = vi.fn(() => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({
          data: {
            id: 'order-1', status: 'paid', input_ref: 'in/1',
            customer_email: 'buyer@example.com', email_message_id: null,
            amount_total: 300, currency: 'usd', click_id: null,
          },
        }),
      }),
    }),
    update: mockUpdate,
  }));
  return { mockUpdate, mockFrom, updates };
});

vi.mock('@/lib/etsy-listing-kit/supabase-admin', () => ({
  createAdminSupabaseClient: () => ({ from: mockFrom }),
}));
vi.mock('@/lib/etsy-listing-kit/orders', () => ({
  downloadInput: vi.fn().mockResolvedValue(Buffer.from('design')),
  storeOutput: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/etsy-listing-kit/generator', () => ({
  generatePack: vi.fn().mockResolvedValue([{ id: 'flat', label: 'Hoop on linen', clean: Buffer.from('x'), watermarked: Buffer.from('y') }]),
}));
vi.mock('@/lib/etsy-listing-kit/analytics', () => ({
  trackPurchaseServer: vi.fn().mockResolvedValue(undefined),
}));

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock('@/lib/etsy-listing-kit/email', () => ({ sendResultEmail: mockSend }));

describe('fulfillment records email outcomes', () => {
  beforeEach(() => { updates.length = 0; vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('stores the provider reason (and still fulfils) when the send is rejected', async () => {
    mockSend.mockResolvedValue({ sent: false, id: null, reason: 'provider 403: domain not verified' });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { fulfillOrder } = await import('@/lib/etsy-listing-kit/fulfillment');

    const res = await fulfillOrder('order-1');

    // fulfillment still succeeds — a failed email never costs the buyer
    expect(res.alreadyDone).toBe(false);
    expect(updates.some((u) => u.status === 'fulfilled')).toBe(true);
    // ...and the failure is both logged and persisted
    const failure = updates.find((u) => 'email_error' in u && u.email_error);
    expect(failure?.email_error).toBe('provider 403: domain not verified');
    expect(failure?.email_attempted_at).toBeTruthy();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('domain not verified'));
    // never marked as sent
    expect(updates.some((u) => u.email_message_id)).toBe(false);
  });

  it('clears any prior error and records the id on a successful send', async () => {
    mockSend.mockResolvedValue({ sent: true, id: 're_123' });
    const { fulfillOrder } = await import('@/lib/etsy-listing-kit/fulfillment');

    await fulfillOrder('order-1');

    const ok = updates.find((u) => 'email_message_id' in u);
    expect(ok?.email_message_id).toBe('re_123');
    expect(ok?.email_sent_at).toBeTruthy();
    expect(ok?.email_error).toBeNull();
  });
});
