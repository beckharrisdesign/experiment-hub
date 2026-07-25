import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { stripe, webhookSecret } from '../../../../lib/etsy-listing-kit/stripe';
import { createAdminSupabaseClient } from '../../../../lib/etsy-listing-kit/supabase-admin';
import { fulfillOrder } from '../../../../lib/etsy-listing-kit/fulfillment';
import { refundFailedOrder } from '../../../../lib/etsy-listing-kit/refund';
import { decideWebhookAction } from '../../../../lib/etsy-listing-kit/webhook-logic';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /etsy-listing-kit/api/webhook — Stripe payment source of truth.
 * Verifies signature, is idempotent on the Stripe event id, and only fulfils
 * paid checkout sessions scoped to this experiment. Never fulfils from a success
 * URL alone.
 */
export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: 'Webhook secret not set' }, { status: 500 });

  let event: Stripe.Event;
  try {
    const sig = (await headers()).get('stripe-signature');
    if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid';
    return NextResponse.json({ error: `Signature verification failed: ${msg}` }, { status: 400 });
  }

  // Only handle completed one-time checkouts; ack everything else.
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;

  // Look up any already-processed event id for idempotency.
  let existingEventId: string | null = null;
  if (orderId) {
    const { data } = await db.from('elk_orders').select('stripe_event_id').eq('id', orderId).single();
    existingEventId = data?.stripe_event_id ?? null;
  }
  const decision = decideWebhookAction({
    eventType: event.type,
    eventId: event.id,
    metadata: session.metadata ?? undefined,
    paymentStatus: session.payment_status ?? undefined,
    existingEventId,
  });
  if (decision.action === 'ignore') return NextResponse.json({ received: true, ignored: decision.reason }, { status: 200 });
  if (decision.action === 'duplicate') return NextResponse.json({ received: true, duplicate: true }, { status: 200 });

  // Mark paid (record event id first so a retry is idempotent).
  await db.from('elk_orders').update({
    status: 'paid',
    stripe_event_id: event.id,
    stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
    amount_total: session.amount_total ?? undefined,
    currency: session.currency ?? undefined,
    livemode: event.livemode,
    customer_email: session.customer_details?.email ?? undefined,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', decision.orderId);

  // Fulfil (idempotent). If it fails, the customer paid but we can't deliver →
  // auto-refund in full + apology email. Never 500 the webhook.
  try {
    await fulfillOrder(decision.orderId);
  } catch (err) {
    console.error(`[elk webhook] fulfillment failed for ${decision.orderId}, auto-refunding:`, err);
    try {
      await refundFailedOrder(decision.orderId);
    } catch (refundErr) {
      console.error(`[elk webhook] auto-refund also failed for ${decision.orderId}:`, refundErr);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
