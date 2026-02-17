import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const PRICE_TO_TIER: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_MONTHLY || '']: 'Home Garden',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY || '']: 'Home Garden',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_MONTHLY || '']: 'Serious Hobby',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_YEARLY || '']: 'Serious Hobby',
};

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      );
    }

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return NextResponse.json({
        tier: 'Seed Stash Starter',
        status: 'free',
        customerId: null,
        invoices: [],
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 1,
      expand: ['data.items.data.price'],
    });
    const subscription = subscriptions.data[0];

    let tier = 'Seed Stash Starter';
    let status: 'free' | 'active' | 'canceled' | 'past_due' = 'free';
    let currentPeriodEnd: string | null = null;
    let cancelAtPeriodEnd = false;

    if (subscription) {
      const firstItem = subscription.items.data[0];
      const priceId = firstItem?.price?.id;
      tier = PRICE_TO_TIER[priceId || ''] || 'Paid';
      status = subscription.status as 'active' | 'canceled' | 'past_due';
      // current_period_end moved from Subscription to SubscriptionItem in Stripe SDK v20+
      const periodEnd = firstItem?.current_period_end;
      currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
      cancelAtPeriodEnd = subscription.cancel_at_period_end;
    }

    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 10,
      status: 'paid',
    });

    const invoiceList = invoices.data.map((inv) => ({
      id: inv.id,
      amountPaid: inv.amount_paid ? inv.amount_paid / 100 : 0,
      currency: inv.currency,
      date: inv.status_transitions?.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
        : null,
      hostedUrl: inv.hosted_invoice_url,
    }));

    return NextResponse.json({
      tier,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      customerId: customer.id,
      invoices: invoiceList,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
