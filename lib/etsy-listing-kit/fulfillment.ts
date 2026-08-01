/**
 * Fulfillment for Etsy Listing Kit: from a paid order's stored input, generate
 * the 6 CLEAN (un-watermarked) images, store them privately, and mark the order
 * fulfilled. Idempotent — safe to call more than once for the same order.
 */
import { createAdminSupabaseClient } from './supabase-admin';
import { downloadInput, storeOutput } from './orders';
import { generatePack } from './generator';
import { sendResultEmail } from './email';
import { trackPurchaseServer } from './analytics';

function siteUrl(): string {
  const base = process.env.ELK_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  return base.replace(/\/$/, '');
}

export async function fulfillOrder(orderId: string): Promise<{ alreadyDone: boolean; outputRef?: string }> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Supabase not configured');

  const { data: order } = await db.from('elk_orders').select('*').eq('id', orderId).single();
  if (!order) throw new Error(`order ${orderId} not found`);
  if (order.status === 'fulfilled' && order.output_ref) {
    return { alreadyDone: true, outputRef: order.output_ref }; // idempotent no-op
  }
  if (!order.input_ref) throw new Error(`order ${orderId} has no input to fulfill`);

  await db.from('elk_orders').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', orderId);

  try {
    const design = await downloadInput(order.input_ref);
    const pack = await generatePack(design);
    for (const img of pack) {
      await storeOutput(orderId, `${img.id}.jpg`, img.clean, 'image/jpeg');
    }
    const outputRef = `${orderId}/`; // folder of 6 clean JPGs
    await db.from('elk_orders')
      .update({ status: 'fulfilled', output_ref: outputRef, fulfilled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', orderId);

    // Verified purchase → GA4 (server-side, fires once on first fulfillment).
    await trackPurchaseServer({ id: orderId, amount_total: order.amount_total, currency: order.currency, click_id: order.click_id });

    // Confirmation email — idempotent: only if we have a recipient and haven't sent.
    // A failed send must never break fulfillment, but it must never be silent
    // either: the reason is logged and stored so a missing email is diagnosable.
    if (order.customer_email && !order.email_message_id) {
      const url = `${siteUrl()}/etsy-listing-kit/result?order=${orderId}`;
      const email = await sendResultEmail(order.customer_email, url);
      const now = new Date().toISOString();
      if (email.sent) {
        await db.from('elk_orders')
          .update({ email_message_id: email.id, email_sent_at: now, email_attempted_at: now, email_error: null })
          .eq('id', orderId);
      } else {
        console.error(`[elk email] send FAILED for order ${orderId}: ${email.reason ?? 'unknown'}`);
        await db.from('elk_orders')
          .update({ email_attempted_at: now, email_error: email.reason ?? 'unknown' })
          .eq('id', orderId);
      }
    }
    return { alreadyDone: false, outputRef };
  } catch (err) {
    await db.from('elk_orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', orderId);
    throw err;
  }
}
