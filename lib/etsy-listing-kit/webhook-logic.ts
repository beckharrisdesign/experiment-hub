/**
 * Pure decision logic for the Stripe webhook — extracted so idempotency and
 * scope rules are unit-testable without mocking Stripe/Supabase/next.
 */
import { EXPERIMENT_ID } from './config';

export interface WebhookInput {
  eventType: string;
  eventId: string;
  metadata?: { experiment_id?: string; order_id?: string };
  paymentStatus?: string;       // 'paid' | 'unpaid' | ...
  /** stripe_event_id already stored on the order, if any. */
  existingEventId?: string | null;
  expectedExperimentId?: string;
}

export type WebhookAction =
  | { action: 'ignore'; reason: string }
  | { action: 'duplicate'; orderId: string }
  | { action: 'process'; orderId: string };

/**
 * Decide what a webhook delivery should do. Only a paid, in-scope,
 * completed checkout for a known order, not already processed, is 'process'.
 */
export function decideWebhookAction(input: WebhookInput): WebhookAction {
  const expected = input.expectedExperimentId ?? EXPERIMENT_ID;
  if (input.eventType !== 'checkout.session.completed') {
    return { action: 'ignore', reason: `unhandled event type: ${input.eventType}` };
  }
  const orderId = input.metadata?.order_id;
  if (input.metadata?.experiment_id !== expected || !orderId) {
    return { action: 'ignore', reason: 'wrong scope or missing order_id' };
  }
  if (input.paymentStatus !== 'paid') {
    return { action: 'ignore', reason: `session not paid (${input.paymentStatus})` };
  }
  if (input.existingEventId && input.existingEventId === input.eventId) {
    return { action: 'duplicate', orderId };
  }
  return { action: 'process', orderId };
}
