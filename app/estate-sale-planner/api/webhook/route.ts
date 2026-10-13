import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { EXPERIMENT_ID } from "../../../../lib/estate-sale-planner/config";
import { getSheet, markPaid, recordBuyerEmail } from "../../../../lib/estate-sale-planner/db";
import { stripe, webhookSecret } from "../../../../lib/estate-sale-planner/stripe";
import { decideWebhookAction } from "../../../../lib/etsy-listing-kit/webhook-logic";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /estate-sale-planner/api/webhook — Stripe payment source of truth.
 * Verifies the signature, is idempotent on the Stripe event id, and only marks
 * paid a completed checkout scoped to this experiment (ELK's decision logic,
 * parameterised by experiment id). Never marks paid from a success URL alone.
 * Nothing to fulfil: the sheet already exists; paying unlocks the page.
 */
export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: "Webhook secret not set" }, { status: 500 });

  let event: Stripe.Event;
  try {
    const sig = (await headers()).get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid";
    return NextResponse.json({ error: `Signature verification failed: ${msg}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sheetId = session.metadata?.order_id;
  const sheet = sheetId ? await getSheet(sheetId) : null;

  const decision = decideWebhookAction({
    eventType: event.type,
    eventId: event.id,
    metadata: session.metadata ?? undefined,
    paymentStatus: session.payment_status ?? undefined,
    existingEventId: sheet?.stripe_event_id ?? null,
    expectedExperimentId: EXPERIMENT_ID,
  });
  if (decision.action === "ignore") return NextResponse.json({ received: true, ignored: decision.reason }, { status: 200 });
  if (decision.action === "duplicate") return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  if (!sheet) return NextResponse.json({ received: true, ignored: "unknown sheet" }, { status: 200 });

  try {
    const email = session.customer_details?.email ?? undefined;
    await markPaid(decision.orderId, {
      stripeEventId: event.id,
      stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      amountTotal: session.amount_total ?? undefined,
      currency: session.currency ?? undefined,
      livemode: event.livemode,
      customerEmail: email,
    });
    if (email) {
      await recordBuyerEmail(email, decision.orderId, { amount_total: session.amount_total, livemode: event.livemode });
    }
  } catch (err) {
    // Stripe retries on 5xx; a transient DB failure should be retried.
    console.error(`[esp webhook] mark paid failed for ${decision.orderId}:`, err);
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
