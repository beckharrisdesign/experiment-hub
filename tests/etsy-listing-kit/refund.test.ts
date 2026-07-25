import { describe, it, expect } from 'vitest';
import { shouldRefund } from '@/lib/etsy-listing-kit/refund';

const pi = 'pi_123';

describe('shouldRefund', () => {
  it('refunds a paid/processing/failed order with a payment intent, not yet refunded', () => {
    expect(shouldRefund({ status: 'paid', stripe_payment_intent: pi })).toBe(true);
    expect(shouldRefund({ status: 'processing', stripe_payment_intent: pi })).toBe(true);
    expect(shouldRefund({ status: 'failed', stripe_payment_intent: pi })).toBe(true);
  });

  it('does not refund without a payment intent', () => {
    expect(shouldRefund({ status: 'failed', stripe_payment_intent: null })).toBe(false);
  });

  it('does not double-refund an already-refunded order', () => {
    expect(shouldRefund({ status: 'refunded', stripe_payment_intent: pi })).toBe(false);
    expect(shouldRefund({ status: 'failed', stripe_payment_intent: pi, refunded_total: 300 })).toBe(false);
  });

  it('does not refund a fulfilled or not-yet-paid order', () => {
    expect(shouldRefund({ status: 'fulfilled', stripe_payment_intent: pi })).toBe(false);
    expect(shouldRefund({ status: 'created', stripe_payment_intent: pi })).toBe(false);
  });
});
