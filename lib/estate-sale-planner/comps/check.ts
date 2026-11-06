/**
 * A sold-price check (sold-comps design D23): one click of the item screen's button, and
 * everything that went into its answer. Saved in `esp_comps_checks` so reopening the item
 * shows it with no provider or model call, and so the server can hold each item to one check
 * per 24 hours. Only a completed check is saved; one that couldn't run doesn't use up the day.
 *
 * Type-only on Supabase, so the device can import the types and `nextCheckAt`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPS } from "../config";
import { messageOf } from "../errors";
import type { LookupDetail } from "./summary";

export interface CheckGiven {
  name: string;
  markReading?: string | null;
  note?: string;
  lotCount?: number;
  /** The price showing when the button was clicked. */
  priceBefore: string;
}

export interface CompsCheck extends LookupDetail {
  /** When the check ran. */
  at: string;
  status: "ok" | "too-few";
  given: CheckGiven;
}

export function nextCheckAt(check: Pick<CompsCheck, "at">): string {
  return new Date(Date.parse(check.at) + COMPS.checkEveryHours * 60 * 60 * 1000).toISOString();
}

export function checkAllowed(check: Pick<CompsCheck, "at"> | null, now: number): boolean {
  return !check || now >= Date.parse(nextCheckAt(check));
}

interface CheckKey {
  deviceHash: string;
  saleId: string;
  itemId: string;
}

/**
 * The newest check for this item on this device, or null. A read error throws rather than
 * reading as "no check": the route must not spend money when it can't see today's check.
 */
export async function getLatestCheck(db: SupabaseClient, key: CheckKey): Promise<CompsCheck | null> {
  const { data, error } = await db
    .from("esp_comps_checks")
    .select("detail")
    .eq("device_hash", key.deviceHash)
    .eq("sale_id", key.saleId)
    .eq("item_id", key.itemId)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.detail as CompsCheck | undefined) ?? null;
}

/** Save a completed check. Never throws: the answer was paid for, so the item still gets it. */
export async function saveCheck(db: SupabaseClient, key: CheckKey, check: CompsCheck): Promise<void> {
  try {
    const { error } = await db.from("esp_comps_checks").insert({
      device_hash: key.deviceHash,
      sale_id: key.saleId,
      item_id: key.itemId,
      checked_at: check.at,
      status: check.status,
      detail: check,
    });
    if (error) throw error;
  } catch (error: unknown) {
    console.error("[esp comps] check save failed:", messageOf(error));
  }
}
