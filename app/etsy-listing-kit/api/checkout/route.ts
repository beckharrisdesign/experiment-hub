import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/etsy-listing-kit/stripe';
import { createOrder, attachCheckoutSession } from '../../../../lib/etsy-listing-kit/orders';
import { EXPERIMENT_ID, PRICE_CENTS, CURRENCY, UPLOAD } from '../../../../lib/etsy-listing-kit/config';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /etsy-listing-kit/api/checkout
 * Creates an internal order (+ stores the design), then a one-time Stripe
 * Checkout session carrying experiment_id + order_id metadata. Returns { url }.
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 500 });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'Expected a file upload.' }, { status: 400 }); }

  const file = form.get('design');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No design file provided.' }, { status: 400 });
  if (!(UPLOAD.acceptedMime as readonly string[]).includes(file.type))
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 415 });
  if (file.size > UPLOAD.maxBytes) return NextResponse.json({ error: 'File too large.' }, { status: 413 });

  const attribution = {
    utm_source: form.get('utm_source')?.toString(),
    utm_medium: form.get('utm_medium')?.toString(),
    utm_campaign: form.get('utm_campaign')?.toString(),
    utm_content: form.get('utm_content')?.toString(),
    utm_term: form.get('utm_term')?.toString(),
    click_id: form.get('click_id')?.toString(),
    landing_path: form.get('landing_path')?.toString(),
  };

  try {
    const design = Buffer.from(await file.arrayBuffer());
    const orderId = await createOrder(design, file.type, { amountTotal: PRICE_CENTS, currency: CURRENCY, attribution });

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: { name: 'Etsy Listing Kit — 6 listing images', description: 'One design → 6 Etsy-ready 2000px images.' },
        },
      }],
      metadata: { experiment_id: EXPERIMENT_ID, order_id: orderId },
      payment_intent_data: { metadata: { experiment_id: EXPERIMENT_ID, order_id: orderId } },
      success_url: `${origin}/etsy-listing-kit/result?order=${orderId}`,
      cancel_url: `${origin}/etsy-listing-kit?canceled=1`,
    });

    await attachCheckoutSession(orderId, session.id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
