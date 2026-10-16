/**
 * Supabase access for Estate Sale Planner (service-role, server-only).
 *
 * Two tables (supabase/migrations/016_esp_sell_sheets.sql): esp_events for the
 * counted taps the validation plan reads, esp_sheets for the paid Sell Sheet.
 * Buyer emails go to the hub's shared experiment_submissions table, the same
 * place every other experiment's demand signal lands.
 *
 * Events never fail a request: when Supabase is not configured they fall back
 * to the structured log line v1 shipped with. Sheet writes do fail loudly —
 * taking money without a row to attach it to is the one thing not to do.
 */
import { EXPERIMENT_ID } from "./config";
import type { SheetInput, SheetRow } from "./sheet";
import { createAdminSupabaseClient } from "./supabase-admin";

export interface EventInput {
  event: "esp_exit_tap" | "esp_sheet_checkout";
  session: string;
  count?: number;
  fallback?: boolean;
  via?: "tel" | "web";
  referral?: string;
  metadata?: Record<string, unknown>;
  at?: string;
}

export function dbConfigured(): boolean {
  return createAdminSupabaseClient() !== null;
}

/** Record a counted event. Never throws; logs the record either way. */
export async function recordEvent(input: EventInput): Promise<"db" | "log"> {
  const record = { experiment: EXPERIMENT_ID, ...input, at: input.at ?? new Date().toISOString() };
  console.log(JSON.stringify(record));
  const db = createAdminSupabaseClient();
  if (!db) return "log";
  try {
    const { error } = await db.from("esp_events").insert({
      experiment_id: EXPERIMENT_ID,
      session_id: input.session,
      event: input.event,
      count: input.count ?? null,
      fallback: input.fallback ?? null,
      via: input.via ?? null,
      referral: input.referral ?? null,
      metadata: input.metadata ?? null,
      created_at: record.at,
    });
    if (error) throw error;
    return "db";
  } catch (err) {
    console.error("[esp db] event insert failed, log line stands:", err);
    return "log";
  }
}

const SHEET_COLUMNS =
  "id, session_id, status, items, item_count, walkthrough_at, stripe_session_id, stripe_event_id, customer_email, paid_at, created_at";

export async function getSheet(id: string): Promise<SheetRow | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;
  const { data, error } = await db.from("esp_sheets").select(SHEET_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as unknown as SheetRow;
}

export async function getSheetBySession(sessionId: string): Promise<SheetRow | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;
  const { data, error } = await db.from("esp_sheets").select(SHEET_COLUMNS).eq("session_id", sessionId).maybeSingle();
  if (error || !data) return null;
  return data as unknown as SheetRow;
}

/**
 * Create or refresh the unpaid sheet for a session (one sheet per session).
 * Returns the sheet id — the shareable link. Throws when Supabase is missing.
 */
export async function upsertSheet(input: SheetInput): Promise<string> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error("Supabase not configured");
  const { data, error } = await db
    .from("esp_sheets")
    .upsert(
      {
        experiment_id: EXPERIMENT_ID,
        session_id: input.sessionId,
        status: "created",
        items: input.items,
        item_count: input.items.length,
        walkthrough_at: input.walkthroughAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`upsertSheet failed: ${error?.message}`);
  return data.id as string;
}

export async function attachCheckout(id: string, stripeSessionId: string): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error("Supabase not configured");
  const { error } = await db
    .from("esp_sheets")
    .update({ status: "checkout_started", stripe_session_id: stripeSessionId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`attachCheckout failed: ${error.message}`);
}

export interface PaidFields {
  stripeEventId: string;
  stripePaymentIntent?: string;
  amountTotal?: number;
  currency?: string;
  livemode: boolean;
  customerEmail?: string;
}

export async function markPaid(id: string, fields: PaidFields): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const { error } = await db
    .from("esp_sheets")
    .update({
      status: "paid",
      stripe_event_id: fields.stripeEventId,
      stripe_payment_intent: fields.stripePaymentIntent ?? null,
      amount_total: fields.amountTotal ?? null,
      currency: fields.currency ?? null,
      livemode: fields.livemode,
      customer_email: fields.customerEmail ?? null,
      paid_at: now,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(`markPaid failed: ${error.message}`);
}

/**
 * A buyer's email is the hub's demand signal; it lands in experiment_submissions
 * like every other experiment's. Written with the service-role client because
 * the webhook environment carries that key, not the publishable one.
 */
export async function recordBuyerEmail(email: string, sheetId: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) return;
  const { error } = await db.from("experiment_submissions").insert({
    id: crypto.randomUUID(),
    experiment: EXPERIMENT_ID,
    email,
    source: "sell-sheet",
    metadata: { sheet_id: sheetId, ...metadata },
  });
  if (error) console.error("[esp db] buyer email insert failed:", error);
}
