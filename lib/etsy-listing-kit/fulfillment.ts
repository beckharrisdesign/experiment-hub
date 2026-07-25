/**
 * Fulfillment for Etsy Listing Kit: from a paid order's stored input, generate
 * the 6 CLEAN (un-watermarked) images, store them privately, and mark the order
 * fulfilled. Idempotent — safe to call more than once for the same order.
 */
import { createAdminSupabaseClient } from './supabase-admin';
import { downloadInput, storeOutput } from './orders';
import { generatePack } from './generator';

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
    return { alreadyDone: false, outputRef };
  } catch (err) {
    await db.from('elk_orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', orderId);
    throw err;
  }
}
