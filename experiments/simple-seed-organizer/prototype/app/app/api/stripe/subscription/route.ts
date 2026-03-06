import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSubscriptionInfo } from '@/lib/tier';
import { rateLimit } from '@/lib/rate-limit';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`stripe-subscription:${user.id}`, { windowMs: 60_000, max: 30 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', message: 'Please wait a moment before trying again.' },
      { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : {} }
    );
  }

  try {
    // Tier and billing state come from the DB (fast) or Stripe fallback (slow, first time only)
    const { tier, status, currentPeriodEnd, cancelAtPeriodEnd, stripeCustomerId } =
      await getSubscriptionInfo(user.id, supabase, user.email);

    if (!stripeCustomerId) {
      return NextResponse.json({
        tier,
        status,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        customerId: null,
        invoices: [],
      });
    }

    // Invoice history still needs a direct Stripe call
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 10,
      status: 'paid',
    });

    const invoiceList = invoices.data.map((inv: Stripe.Invoice) => ({
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
      customerId: stripeCustomerId,
      invoices: invoiceList,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
