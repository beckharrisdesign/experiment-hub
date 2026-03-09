import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { buildPriceToTierMap } from '@/lib/plans';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Stripe webhook handler.
 * Syncs subscription state to the subscriptions table so tier lookups
 * read from the DB instead of calling the Stripe API on every request.
 *
 * Events handled:
 *   checkout.session.completed      → create subscription row (uses client_reference_id = supabase user UUID)
 *   customer.subscription.updated  → update tier, status, period
 *   customer.subscription.deleted  → mark as canceled, reset tier to free
 *
 * Setup:
 *   1. Run supabase/migrations/005_subscriptions.sql
 *   2. Set STRIPE_WEBHOOK_SECRET in Vercel env vars
 *   3. Register endpoint in Stripe Dashboard → Developers → Webhooks
 *      URL: https://your-domain.com/api/stripe/webhook
 *      Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not set' },
      { status: 500 }
    );
  }

  // Verify Stripe signature
  let event: Stripe.Event;
  try {
    const stripeSignature = (await headers()).get('stripe-signature');
    if (!stripeSignature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, stripeSignature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', msg);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${msg}` },
      { status: 400 }
    );
  }

  const permittedEvents = [
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ];

  if (!permittedEvents.includes(event.type)) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const db = createAdminSupabaseClient();
  if (!db) {
    console.error('[Stripe Webhook] Supabase admin client not configured — SUPABASE_SERVICE_ROLE_KEY missing');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const priceToTier = buildPriceToTierMap();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // client_reference_id is set to the Supabase user UUID in the checkout route
        const userId = session.client_reference_id;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !customerId || !subscriptionId) {
          // Can happen for guest checkouts (no client_reference_id).
          // Log and move on — the Stripe fallback in tier.ts will cover them.
          console.warn('[Stripe Webhook] checkout.session.completed: missing userId/customerId/subscriptionId', {
            userId,
            customerId,
            subscriptionId,
            sessionId: session.id,
          });
          break;
        }

        // Fetch the subscription to get price ID and period details
        const sub = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data.price'],
        });
        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price?.id ?? null;
        const tier = priceToTier[priceId || ''] || 'Seed Stash Starter';
        const periodEnd = firstItem?.current_period_end;
        const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

        const { error } = await db.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            tier,
            status: sub.status,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          console.error('[Stripe Webhook] Failed to upsert subscription:', error);
        } else {
          console.log(
            `[Stripe Webhook] checkout.session.completed: user=${userId}, tier=${tier}, status=${sub.status}`
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price?.id ?? null;
        const tier = priceToTier[priceId || ''] || 'Seed Stash Starter';
        const periodEnd = firstItem?.current_period_end;
        const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

        const { error } = await db
          .from('subscriptions')
          .update({
            stripe_subscription_id: sub.id,
            stripe_price_id: priceId,
            tier,
            status: sub.status,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('[Stripe Webhook] Failed to update subscription:', error);
        } else {
          console.log(
            `[Stripe Webhook] customer.subscription.updated: customer=${customerId}, tier=${tier}, status=${sub.status}`
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

        const { error } = await db
          .from('subscriptions')
          .update({
            tier: 'Seed Stash Starter',
            status: 'canceled',
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('[Stripe Webhook] Failed to cancel subscription:', error);
        } else {
          console.log(
            `[Stripe Webhook] customer.subscription.deleted: customer=${customerId}`
          );
        }
        break;
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
