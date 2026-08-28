/**
 * Source-image storage.
 *
 * Private Supabase buckets in the deployed hub, following the shape
 * lib/etsy-listing-kit/orders.ts already uses (private input, server-side
 * download, signed URLs for output).
 *
 * Falls back to a local temp directory when Supabase env is absent, so
 * `npm run dev` works with no credentials — the same courtesy image-lab's Vite
 * middleware provided. The fallback is NOT production parity and never syncs.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const BUCKET = 'sandbox-sources';
const LOCAL_DIR = join(tmpdir(), 'generative-sandbox-sources');

let client: SupabaseClient | null | undefined;

function admin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export function usingSupabase(): boolean {
  return admin() !== null;
}

export async function putSource(bytes: Buffer, contentType: string): Promise<string> {
  const ref = randomUUID();
  const db = admin();

  if (!db) {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(join(LOCAL_DIR, ref), bytes);
    return ref;
  }

  const { error } = await db.storage
    .from(BUCKET)
    .upload(`${ref}/source`, bytes, { contentType, upsert: true });
  if (error) throw new Error(`source upload failed: ${error.message}`);
  return ref;
}

export async function getSource(ref: string): Promise<Buffer> {
  // Refs are generated server-side as UUIDs; reject anything else rather than
  // letting a crafted value walk the filesystem or the bucket.
  if (!/^[0-9a-f-]{36}$/i.test(ref)) throw new Error('invalid source reference');

  const db = admin();
  if (!db) return readFile(join(LOCAL_DIR, ref));

  const { data, error } = await db.storage.from(BUCKET).download(`${ref}/source`);
  if (error || !data) throw new Error(`source download failed: ${error?.message ?? 'not found'}`);
  return Buffer.from(await data.arrayBuffer());
}
