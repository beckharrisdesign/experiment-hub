import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`checkout:${ip}`, { windowMs: 60_000, max: 10 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', message: 'Please wait a moment before trying again.' },
      { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : {} }
    );
  }

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { priceId, customerEmail } = body as { priceId?: string; customerEmail?: string };

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json(
        { error: 'priceId is required' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/#pricing`,
      ...(customerEmail && { customer_email: customerEmail }),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
