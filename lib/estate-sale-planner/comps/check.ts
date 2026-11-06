/**
 * A sold-price check (sold-comps design D23): one click of the item screen's button, and
 * everything that went into its answer. Saved in `esp_comps_checks` so reopening the item
 * shows it with no provider or model call, and so the server can hold each item to one check
 * per 24 hours. A row is reserved before any money is spent, filled in when the check completes,
 * and removed if it couldn't run, so a failure doesn't use up the day.
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

export function nextCheckAt(at: string): string {
  return new Date(Date.parse(at) + COMPS.checkEveryHours * 60 * 60 * 1000).toISOString();
}

export function checkAllowed(lastAt: string | null, now: number): boolean {
  return !lastAt || now >= Date.parse(nextCheckAt(lastAt));
}

interface CheckKey {
  deviceHash: string;
  saleId: string;
  itemId: string;
}

const TABLE = "esp_comps_checks";
/** Enough to get past rows that never completed to the last one that did. */
const RECENT_ROWS = 10;

export interface CheckState {
  /** The newest completed check, for the screen. */
  check: CompsCheck | null;
  /** The newest row of any kind: a reservation holds the limit too. */
  lastAt: string | null;
}

/**
 * Where this item stands on this device. A read error throws rather than reading as "no
 * check": the route must not spend money when it can't see today's check.
 */
export async function getCheckState(db: SupabaseClient, key: CheckKey): Promise<CheckState> {
  const { data, error } = await db
    .from(TABLE)
    .select("checked_at, detail")
    .eq("device_hash", key.deviceHash)
    .eq("sale_id", key.saleId)
    .eq("item_id", key.itemId)
    .order("checked_at", { ascending: false })
    .limit(RECENT_ROWS);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ checked_at: string; detail: CompsCheck | null }>;
  return { check: rows.find((r) => r.detail)?.detail ?? null, lastAt: rows[0]?.checked_at ?? null };
}

/** How many checks this device has used across every item in the last 24 hours. Throws on a read error. */
export async function countRecentChecks(db: SupabaseClient, deviceHash: string, now: number): Promise<number> {
  const since = new Date(now - COMPS.checkEveryHours * 60 * 60 * 1000).toISOString();
  const { count, error } = await db.from(TABLE).select("id", { count: "exact", head: true }).eq("device_hash", deviceHash).gte("checked_at", since);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Whether a saved sale belongs to some other device. A sale not on the server yet doesn't: it
 * can be checked before its first save lands, bounded by `countRecentChecks`. Throws on a read error.
 */
export async function saleOfAnotherDevice(db: SupabaseClient, saleId: string, deviceHash: string): Promise<boolean> {
  const { data, error } = await db.from("esp_sales").select("device_hash").eq("id", saleId).maybeSingle();
  if (error) throw error;
  return Boolean(data && data.device_hash !== deviceHash);
}

/**
 * Hold today's check before any money is spent, so a limit exists whatever happens next. Returns
 * the row's id. Throws when it can't: with no reservation, nothing may run.
 */
export async function reserveCheck(db: SupabaseClient, key: CheckKey, at: string): Promise<string> {
  const { data, error } = await db
    .from(TABLE)
    .insert({ device_hash: key.deviceHash, sale_id: key.saleId, item_id: key.itemId, checked_at: at, status: "running", detail: null })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/**
 * Fill the reservation in. Says whether it saved rather than throwing: the answer was paid for,
 * so the item still gets it. If it didn't save, the reservation stays and keeps the limit.
 */
export async function completeCheck(db: SupabaseClient, id: string, check: CompsCheck): Promise<boolean> {
  try {
    const { error } = await db.from(TABLE).update({ status: check.status, detail: check }).eq("id", id);
    if (error) throw error;
    return true;
  } catch (error: unknown) {
    console.error("[esp comps] check save failed; the reservation keeps the limit:", messageOf(error));
    return false;
  }
}

/** Nothing completed, so the day isn't used up. Never throws: a row left behind only holds the limit. */
export async function releaseCheck(db: SupabaseClient, id: string): Promise<void> {
  try {
    const { error } = await db.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  } catch (error: unknown) {
    console.error("[esp comps] check release failed; this item waits out the limit:", messageOf(error));
  }
}
