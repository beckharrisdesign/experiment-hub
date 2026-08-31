import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/etsy-listing-kit/stripe';
import { createOrder, createListingOrder, attachCheckoutSession } from '../../../../lib/etsy-listing-kit/orders';
import { fetchListingRaw } from '../../../../lib/etsy-listing-kit/listing-fetch';
import { EXPERIMENT_ID, PRICE_CENTS, CURRENCY, UPLOAD } from '../../../../lib/etsy-listing-kit/config';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /etsy-listing-kit/api/checkout
 * Two order shapes (spec: "Checkout knows the listing"):
 * - JSON { listing_id, ...attribution } — the evaluation-seeded path (3.4b):
 *   the listing is re-fetched to confirm it exists, its title rides on the
 *   order, and fulfillment builds the kit FROM the listing. No upload.
 * - multipart with a design file — the legacy upload path, unchanged until
 *   the de-niche pass retires it.
 * Both create an internal order, then a one-time Stripe Checkout session
 * carrying experiment_id + order_id metadata. Returns { url }.
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 500 });
  }

  if (request.headers.get('content-type')?.includes('application/json')) {
    return listingCheckout(request);
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
      payment_intent_data: {
        metadata: { experiment_id: EXPERIMENT_ID, order_id: orderId },
        // Stripe requires the account descriptor to match the business name, so
        // branding rides on the suffix alone: statements read
        // "<BUSINESS NAME>* ETSY KIT" (prefix derived by Stripe from the account).
        statement_descriptor_suffix: 'ETSY KIT',
      },
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

async function listingCheckout(request: NextRequest) {
  let body: { listing_id?: unknown } & Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 }); }

  const listingId = Number(body.listing_id);
  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: 'Missing or invalid listing_id.' }, { status: 400 });
  }

  const attribution = Object.fromEntries(
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'click_id', 'landing_path']
      .map((k) => [k, typeof body[k] === 'string' ? (body[k] as string) : undefined]),
  );

  try {
    const listing = await fetchListingRaw(listingId);
    if (!listing) return NextResponse.json({ error: 'We couldn’t read that listing.' }, { status: 404 });
    if (!listing.images?.length) {
      return NextResponse.json({ error: 'That listing has no photos to build from yet.' }, { status: 422 });
    }
    const title = (listing.title ?? '').trim() || `Listing ${listingId}`;
    const orderId = await createListingOrder(listingId, title, { amountTotal: PRICE_CENTS, currency: CURRENCY, attribution });

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const session = await stripe!.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: {
            name: 'Etsy Listing Kit — built from your listing',
            description: title.slice(0, 200),
          },
        },
      }],
      metadata: { experiment_id: EXPERIMENT_ID, order_id: orderId },
      payment_intent_data: {
        metadata: { experiment_id: EXPERIMENT_ID, order_id: orderId },
        statement_descriptor_suffix: 'ETSY KIT',
      },
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
