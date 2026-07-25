import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { stripe } from '../../../../lib/etsy-listing-kit/stripe';
import { createAdminSupabaseClient } from '../../../../lib/etsy-listing-kit/supabase-admin';
import { fulfillOrder } from '../../../../lib/etsy-listing-kit/fulfillment';
import { EXPERIMENT_ID } from '../../../../lib/etsy-listing-kit/config';

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
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
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
  const experimentId = session.metadata?.experiment_id;

  // Scope + payment guards: right product, actually paid.
  if (experimentId !== EXPERIMENT_ID || !orderId) {
    return NextResponse.json({ received: true, ignored: 'wrong scope' }, { status: 200 });
  }
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, ignored: 'unpaid session' }, { status: 200 });
  }

  // Idempotency: if this event id is already recorded, no-op.
  const { data: existing } = await db.from('elk_orders').select('stripe_event_id,status').eq('id', orderId).single();
  if (existing?.stripe_event_id === event.id) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  // Mark paid (record event id first so a retry is idempotent).
  await db.from('elk_orders').update({
    status: 'paid',
    stripe_event_id: event.id,
    amount_total: session.amount_total ?? undefined,
    currency: session.currency ?? undefined,
    livemode: event.livemode,
    customer_email: session.customer_details?.email ?? undefined,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', orderId);

  // Fulfil (idempotent). Failure here shouldn't 500 the webhook — Stripe would
  // retry; the order is already 'paid' and can be retried by the owner.
  try {
    await fulfillOrder(orderId);
  } catch (err) {
    console.error(`[elk webhook] fulfillment failed for ${orderId}:`, err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
