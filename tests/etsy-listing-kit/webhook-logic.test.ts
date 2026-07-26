import { describe, it, expect } from 'vitest';
import { decideWebhookAction } from '@/lib/etsy-listing-kit/webhook-logic';

const base = {
  eventType: 'checkout.session.completed',
  eventId: 'evt_1',
  metadata: { experiment_id: 'etsy-listing-kit', order_id: 'ord_1' },
  paymentStatus: 'paid',
  existingEventId: null,
};

describe('decideWebhookAction', () => {
  it('processes a paid, in-scope, first-time completed checkout', () => {
    expect(decideWebhookAction(base)).toEqual({ action: 'process', orderId: 'ord_1' });
  });

  it('ignores non-completion event types', () => {
    expect(decideWebhookAction({ ...base, eventType: 'payment_intent.created' }).action).toBe('ignore');
  });

  it('ignores wrong experiment scope', () => {
    expect(decideWebhookAction({ ...base, metadata: { experiment_id: 'other', order_id: 'ord_1' } }).action).toBe('ignore');
  });

  it('ignores when order_id is missing', () => {
    expect(decideWebhookAction({ ...base, metadata: { experiment_id: 'etsy-listing-kit' } }).action).toBe('ignore');
  });

  it('ignores unpaid sessions', () => {
    expect(decideWebhookAction({ ...base, paymentStatus: 'unpaid' }).action).toBe('ignore');
  });

  it('flags a duplicate when the event id is already recorded', () => {
    expect(decideWebhookAction({ ...base, existingEventId: 'evt_1' })).toEqual({ action: 'duplicate', orderId: 'ord_1' });
  });

  it('processes a different event id even if a prior one exists (retry with new event)', () => {
    expect(decideWebhookAction({ ...base, existingEventId: 'evt_0' })).toEqual({ action: 'process', orderId: 'ord_1' });
  });
});
