import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
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

  const rl = rateLimit(`stripe-portal:${user.id}`, { windowMs: 60_000, max: 20 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', message: 'Please wait a moment before trying again.' },
      { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : {} }
    );
  }

  try {
    const { customerId } = (await request.json()) as { customerId?: string };
    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Verify the customer belongs to the authenticated user
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.email) {
      return NextResponse.json({ error: 'Invalid customer' }, { status: 403 });
    }
    if (customer.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Customer does not belong to your account' }, { status: 403 });
    }

    const origin = request.headers.get('origin') || request.nextUrl.origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
