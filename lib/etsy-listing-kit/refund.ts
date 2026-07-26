/**
 * Auto-refund on failed fulfillment. If a customer paid but we cannot deliver,
 * the honest action is an immediate full refund + an apology email. Idempotent.
 */
import { stripe } from './stripe';
import { createAdminSupabaseClient } from './supabase-admin';
import { sendRefundEmail } from './email';

export interface RefundableOrder {
  status: string;
  stripe_payment_intent?: string | null;
  refunded_total?: number | null;
}

/** Pure guard: should we auto-refund this order? Only paid-ish, not already refunded, with a PI. */
export function shouldRefund(order: RefundableOrder): boolean {
  if (!order.stripe_payment_intent) return false;
  if (order.status === 'refunded') return false;
  if ((order.refunded_total ?? 0) > 0) return false;
  return ['paid', 'processing', 'failed'].includes(order.status);
}

/** Issue a full refund for a failed order + send the apology email. Safe/idempotent. */
export async function refundFailedOrder(orderId: string): Promise<{ refunded: boolean; reason?: string }> {
  const db = createAdminSupabaseClient();
  if (!db || !stripe) return { refunded: false, reason: 'not configured' };

  const { data: order } = await db.from('elk_orders').select('*').eq('id', orderId).single();
  if (!order) return { refunded: false, reason: 'not found' };
  if (!shouldRefund(order)) return { refunded: false, reason: `not refundable (status ${order.status})` };

  try {
    const refund = await stripe.refunds.create({ payment_intent: order.stripe_payment_intent as string });
    await db.from('elk_orders')
      .update({ status: 'refunded', refunded_total: order.amount_total ?? undefined, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (order.customer_email) {
      await sendRefundEmail(order.customer_email);
    }
    return { refunded: refund.status === 'succeeded' || refund.status === 'pending' };
  } catch (err) {
    return { refunded: false, reason: err instanceof Error ? err.message : 'refund failed' };
  }
}
