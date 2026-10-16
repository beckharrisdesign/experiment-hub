import { NextRequest, NextResponse } from "next/server";
import { EXPERIMENT_ID, SELL_SHEET } from "../../../../lib/estate-sale-planner/config";
import { attachCheckout, getSheetBySession, recordEvent, upsertSheet } from "../../../../lib/estate-sale-planner/db";
import { parseSheetInput, sheetPath } from "../../../../lib/estate-sale-planner/sheet";
import { stripe } from "../../../../lib/estate-sale-planner/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /estate-sale-planner/api/checkout
 * Body: { sessionId, walkthroughAt?, items: [...] } — the Sell list with its
 * thumbnails (lib/estate-sale-planner/sheet.ts).
 *
 * Saves the sheet unpaid, then opens a one-time Stripe Checkout carrying
 * experiment_id + order_id (the sheet id) in metadata — the same shape as the
 * ELK checkout, so the webhook decision logic is shared. Returns { url }.
 * A session whose sheet is already paid gets its link back without a charge.
 */
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }
  const input = parseSheetInput(raw);
  if (!input) {
    return NextResponse.json({ error: "That sell list could not be read. Go back to the sort and try again." }, { status: 400 });
  }

  try {
    const existing = await getSheetBySession(input.sessionId);
    if (existing?.status === "paid") {
      return NextResponse.json({ url: sheetPath(existing.id), paid: true });
    }
  } catch (err) {
    console.error("[esp checkout] lookup failed:", err);
  }

  if (!stripe) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 500 });
  }

  try {
    const sheetId = await upsertSheet(input);
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: SELL_SHEET.currency,
            unit_amount: SELL_SHEET.priceCents,
            product_data: { name: SELL_SHEET.productName, description: SELL_SHEET.productDescription },
          },
        },
      ],
      metadata: { experiment_id: EXPERIMENT_ID, order_id: sheetId },
      payment_intent_data: {
        metadata: { experiment_id: EXPERIMENT_ID, order_id: sheetId },
        statement_descriptor_suffix: SELL_SHEET.statementSuffix,
      },
      success_url: `${origin}${sheetPath(sheetId)}?paid=1`,
      cancel_url: `${origin}/estate-sale-planner/summary?canceled=1`,
    });
    await attachCheckout(sheetId, session.id);
    await recordEvent({ event: "esp_sheet_checkout", session: input.sessionId, count: input.items.length, metadata: { sheet_id: sheetId } });
    return NextResponse.json({ url: session.url, sheetId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[esp checkout] failed:", err);
    return NextResponse.json({ error: message.includes("Supabase") ? "Saving sheets is not configured yet." : message }, { status: 500 });
  }
}
