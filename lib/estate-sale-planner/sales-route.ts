/**
 * What every sales and photos route shares (esp-server-sales D4): the device hash from the
 * cookie, the service-role client, and the one "not found" every refusal looks like. Not a
 * route file, so it may export helpers.
 */
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deviceHashOf } from "./device";
import { createAdminSupabaseClient } from "./supabase-admin";

/** A sale id as the device makes it (`esp_…`), or anything else the same shape. */
export const SALE_ID = /^[\w-]{1,80}$/;
/** Under Vercel's 4.5 MB request cap, with room for the envelope. */
export const MAX_SALE_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

/** No cookie, another device's sale, a sale that never existed: all the same answer. */
export const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });
export const tooMany = () => NextResponse.json({ error: "Too many saves at once — it'll retry." }, { status: 429 });
export const noStore = { "cache-control": "no-store" };

export type Context = { deviceHash: string; db: SupabaseClient } | { response: NextResponse };

/** The device and the database, or the response to send instead. */
export async function contextOf(request: NextRequest, throttled: (caller: string) => boolean): Promise<Context> {
  const deviceHash = await deviceHashOf(request);
  if (!deviceHash) return { response: notFound() };
  if (throttled(deviceHash)) return { response: tooMany() };
  const db = createAdminSupabaseClient();
  if (!db) return { response: NextResponse.json({ error: "Saving isn't configured here." }, { status: 503 }) };
  return { deviceHash, db };
}

export function failed(what: string, error: unknown) {
  console.error(`[esp sales] ${what} failed:`, error);
  return NextResponse.json({ error: `Couldn't ${what} — it'll retry.` }, { status: 502 });
}
