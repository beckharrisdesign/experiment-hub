/**
 * Order + storage helpers for Etsy Listing Kit. Service-role only (server).
 * The Stripe webhook is the payment source of truth; fulfillment is idempotent.
 */
import { createAdminSupabaseClient } from './supabase-admin';
import { EXPERIMENT_ID } from './config';

const INPUT_BUCKET = 'elk-inputs';
const OUTPUT_BUCKET = 'elk-outputs';

export interface NewOrder {
  amountTotal: number;
  currency: string;
  attribution?: Record<string, string | undefined>;
}

/** Create an order row + store the uploaded design privately. Returns order id. */
export async function createOrder(design: Buffer, mime: string, o: NewOrder): Promise<string> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Supabase not configured');
  const a = o.attribution ?? {};
  const { data, error } = await db
    .from('elk_orders')
    .insert({
      experiment_id: EXPERIMENT_ID,
      status: 'created',
      amount_total: o.amountTotal,
      currency: o.currency,
      utm_source: a.utm_source, utm_medium: a.utm_medium, utm_campaign: a.utm_campaign,
      utm_content: a.utm_content, utm_term: a.utm_term, click_id: a.click_id, landing_path: a.landing_path,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createOrder failed: ${error?.message}`);
  const id = data.id as string;

  const ext = mime === 'image/png' ? 'png' : mime === 'image/svg+xml' ? 'svg' : 'jpg';
  const path = `${id}/design.${ext}`;
  const up = await db.storage.from(INPUT_BUCKET).upload(path, design, { contentType: mime, upsert: true });
  if (up.error) throw new Error(`input upload failed: ${up.error.message}`);
  await db.from('elk_orders').update({ input_ref: path }).eq('id', id);
  return id;
}

export async function attachCheckoutSession(orderId: string, sessionId: string) {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Supabase not configured');
  await db.from('elk_orders')
    .update({ status: 'checkout_started', stripe_session_id: sessionId, updated_at: new Date().toISOString() })
    .eq('id', orderId);
}

export async function getOrder(orderId: string) {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Supabase not configured');
  const { data } = await db.from('elk_orders').select('*').eq('id', orderId).single();
  return data;
}

export async function downloadInput(inputRef: string): Promise<Buffer> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Supabase not configured');
  const { data, error } = await db.storage.from(INPUT_BUCKET).download(inputRef);
  if (error || !data) throw new Error(`input download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function storeOutput(orderId: string, name: string, buf: Buffer, contentType: string): Promise<string> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Supabase not configured');
  const path = `${orderId}/${name}`;
  const up = await db.storage.from(OUTPUT_BUCKET).upload(path, buf, { contentType, upsert: true });
  if (up.error) throw new Error(`output upload failed: ${up.error.message}`);
  return path;
}

export async function downloadOutput(path: string): Promise<Buffer> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Supabase not configured');
  const { data, error } = await db.storage.from(OUTPUT_BUCKET).download(path);
  if (error || !data) throw new Error(`output download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Signed URL for a stored output (paid download). */
export async function signedOutputUrl(path: string, ttlSeconds: number): Promise<string> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Supabase not configured');
  const { data, error } = await db.storage.from(OUTPUT_BUCKET).createSignedUrl(path, ttlSeconds);
  if (error || !data) throw new Error(`sign url failed: ${error?.message}`);
  return data.signedUrl;
}
