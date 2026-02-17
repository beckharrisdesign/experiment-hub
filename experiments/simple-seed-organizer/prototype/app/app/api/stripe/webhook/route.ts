import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Stripe webhook handler.
 * Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 *
 * Set STRIPE_WEBHOOK_SECRET in .env.local (from Stripe Dashboard → Webhooks → Signing secret).
 * For local testing: stripe listen --forward-to localhost:3001/api/stripe/webhook
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not set. Add it to .env.local for webhook verification.' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripeSignature = (await headers()).get('stripe-signature');
    if (!stripeSignature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, stripeSignature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${errorMessage}` },
      { status: 400 }
    );
  }

  const permittedEvents = [
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ];

  if (permittedEvents.includes(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`[Stripe Webhook] checkout.session.completed: ${session.id}, customer: ${session.customer}`);
          // Extend: store subscription in DB, send welcome email, etc.
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          console.log(`[Stripe Webhook] customer.subscription.updated: ${subscription.id}, status: ${subscription.status}`);
          // Extend: sync subscription status to DB if you add a subscriptions table
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          console.log(`[Stripe Webhook] customer.subscription.deleted: ${subscription.id}`);
          // Extend: mark subscription as canceled in DB
          break;
        }
        default:
          console.warn(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error('[Stripe Webhook] Handler error:', err);
      return NextResponse.json(
        { error: 'Webhook handler failed' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
