/**
 * Fulfillment for Etsy Listing Kit: from a paid order's stored input, generate
 * the 6 CLEAN (un-watermarked) images, store them privately, and mark the order
 * fulfilled. Idempotent — safe to call more than once for the same order.
 */
import { createAdminSupabaseClient } from './supabase-admin';
import { downloadInput, storeOutput } from './orders';
import { generatePack } from './generator';
import { fetchListingRaw, fetchListingPhotos } from './listing-fetch';
import { generateListingKit, buildManifest } from './kit-fulfillment';
import { composerFromEnv } from './composer';
import { sendResultEmail, type ResultEmailInfo } from './email';
import { trackPurchaseServer, trackServerEvent } from './analytics';

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
  if (!order.listing_id && !order.input_ref) throw new Error(`order ${orderId} has no input to fulfill`);

  await db.from('elk_orders').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', orderId);

  let emailInfo: ResultEmailInfo = { kind: 'upload-pack' };
  try {
    if (order.listing_id) {
      // Evaluation-seeded order (3.5e): the kit is built FROM the listing —
      // ten scene-ladder images + template + grounded text deliverables
      // (or text marked unavailable when no composer is configured).
      const startedAt = Date.now();
      const listing = await fetchListingRaw(Number(order.listing_id));
      if (!listing) throw new Error(`listing ${order.listing_id} unreadable at fulfillment`);
      const photos = await fetchListingPhotos(listing);
      if (photos.length === 0) throw new Error(`listing ${order.listing_id} has no fetchable photos`);
      const kit = await generateListingKit(listing, photos, composerFromEnv());
      emailInfo = { kind: 'listing-kit', textIncluded: kit.kitText !== null };
      for (const img of [...kit.images, kit.template]) {
        await storeOutput(orderId, `${img.id}.jpg`, img.buffer, 'image/jpeg');
      }
      await storeOutput(orderId, 'manifest.json', Buffer.from(JSON.stringify(buildManifest(kit))), 'application/json');
      // E7 (02.27 legend): the "about a minute" promise, measured.
      await trackServerEvent(orderId, 'generation_completed', {
        duration_ms: Date.now() - startedAt,
        scene_count: kit.images.length,
        wording_thin: kit.brief.wordingThin,
        text_available: kit.kitText !== null,
      });
    } else {
      // Upload-era order: the six-scene generator, unchanged.
      const design = await downloadInput(order.input_ref);
      const pack = await generatePack(design);
      for (const img of pack) {
        await storeOutput(orderId, `${img.id}.jpg`, img.clean, 'image/jpeg');
      }
    }
    const outputRef = `${orderId}/`; // folder of clean JPGs (+ manifest for listing kits)
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
      const email = await sendResultEmail(order.customer_email, url, emailInfo);
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
