/**
 * Sales and their photos on the server (esp-server-sales design D2, D4). Service-role,
 * server-only. Every read and write is scoped to the device hash from the `esp-device`
 * cookie (`device.ts`): a sale another device made, or one that doesn't exist, look the
 * same from here — null or false, never "it's someone else's".
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { summarize, type HistoryEntry } from "./sale-summary";
import type { Session } from "./session";

export const PHOTO_BUCKET = "esp-photos";
/** How long a handed-out photo link works. The spec allows an hour; ten minutes is plenty. */
export const PHOTO_URL_SECONDS = 600;
const LIST_LIMIT = 200;

export interface StoredSale {
  session: Session;
  version: number;
}

export interface ListedSale extends HistoryEntry {
  version: number;
}

/**
 * Save a sale. "saved": written. "stale": this device already holds a newer version, nothing
 * to do. "not-found": the id belongs to another device (answered as if it didn't exist).
 */
export async function saveSale(
  db: SupabaseClient,
  input: { id: string; deviceHash: string; version: number; session: Session },
): Promise<"saved" | "stale" | "not-found"> {
  const { data, error } = await db.rpc("esp_save_sale", {
    p_id: input.id,
    p_device_hash: input.deviceHash,
    p_version: input.version,
    p_session: input.session,
  });
  if (error) throw error;
  if (data === true) return "saved";
  const owner = await db.from("esp_sales").select("device_hash").eq("id", input.id).maybeSingle();
  if (owner.error) throw owner.error;
  return owner.data?.device_hash === input.deviceHash ? "stale" : "not-found";
}

/** This device's sales as Home rows, newest first, each with its version for the device to compare. */
export async function listSales(db: SupabaseClient, deviceHash: string): Promise<ListedSale[]> {
  const { data, error } = await db
    .from("esp_sales")
    .select("session, version, updated_at")
    .eq("device_hash", deviceHash)
    .order("updated_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...summarize(row.session as Session, row.updated_at), version: Number(row.version) }));
}

export async function getSale(db: SupabaseClient, deviceHash: string, id: string): Promise<StoredSale | null> {
  const { data, error } = await db
    .from("esp_sales")
    .select("session, version")
    .eq("id", id)
    .eq("device_hash", deviceHash)
    .maybeSingle();
  if (error) throw error;
  return data ? { session: data.session as Session, version: Number(data.version) } : null;
}

async function owns(db: SupabaseClient, deviceHash: string, id: string): Promise<boolean> {
  const { data, error } = await db.from("esp_sales").select("id").eq("id", id).eq("device_hash", deviceHash).maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Delete a sale, its photo rows (cascade) and its photos in the bucket. False when it isn't this device's. */
export async function deleteSale(db: SupabaseClient, deviceHash: string, id: string): Promise<boolean> {
  if (!(await owns(db, deviceHash, id))) return false;
  const photos = await db.from("esp_sale_photos").select("path").eq("sale_id", id);
  if (photos.error) throw photos.error;
  const paths = (photos.data ?? []).map((p) => p.path as string);
  if (paths.length) {
    const removed = await db.storage.from(PHOTO_BUCKET).remove(paths);
    if (removed.error) throw removed.error;
  }
  const { error } = await db.from("esp_sales").delete().eq("id", id).eq("device_hash", deviceHash);
  if (error) throw error;
  return true;
}

/** A photo key is the device photo-store key, and must sit under its own sale (`photos.ts`). */
export function validPhotoKey(saleId: string, key: string): boolean {
  return key.startsWith(`${saleId}/`) && key.length <= 200 && /^[\w/-]+$/.test(key) && !key.includes("//");
}

export function photoPath(key: string, type: string): string {
  return `${key}.${type === "image/png" ? "png" : "jpg"}`;
}

/** Store one original. False when the sale isn't this device's (or hasn't been saved yet). */
export async function savePhoto(
  db: SupabaseClient,
  input: { deviceHash: string; saleId: string; key: string; type: string; data: ArrayBuffer },
): Promise<boolean> {
  if (!(await owns(db, input.deviceHash, input.saleId))) return false;
  const path = photoPath(input.key, input.type);
  const up = await db.storage.from(PHOTO_BUCKET).upload(path, input.data, { contentType: input.type, upsert: true });
  if (up.error) throw up.error;
  const { error } = await db
    .from("esp_sale_photos")
    .upsert({ sale_id: input.saleId, key: input.key, path, bytes: input.data.byteLength }, { onConflict: "sale_id,key" });
  if (error) throw error;
  return true;
}

/** A short-lived link to one original, or null when it isn't this device's or was never stored. */
export async function photoUrl(db: SupabaseClient, deviceHash: string, saleId: string, key: string): Promise<string | null> {
  if (!(await owns(db, deviceHash, saleId))) return null;
  const row = await db.from("esp_sale_photos").select("path").eq("sale_id", saleId).eq("key", key).maybeSingle();
  if (row.error) throw row.error;
  if (!row.data) return null;
  const signed = await db.storage.from(PHOTO_BUCKET).createSignedUrl(row.data.path as string, PHOTO_URL_SECONDS);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}
