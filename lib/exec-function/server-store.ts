/**
 * Server-side session log, backed by Supabase.
 *
 * Server-side rather than localStorage because of how the tool is used: the
 * daily email link gets opened on whichever device is nearest, and a per-device
 * store would quietly split one history into several. The client keeps a local
 * copy as a fallback (see client-store.ts) but this is the record of truth.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StoredSession } from "./sessions";
import type { ModuleId } from "./schedule";

export const SESSIONS_TABLE = "exec_function_sessions";

/** Null when Supabase is not configured — callers fall back to local-only. */
export function getStoreClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  // Service role: RLS is on and denies everything, so the anon key reads zero
  // rows. The EFA_ACCESS_KEY check in the route is what gates this.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isStoreConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

interface SessionRow {
  id: string;
  module: ModuleId;
  variant: string | null;
  recorded_at: string;
  day_key: string;
  duration_ms: number;
  headline: number | string;
  detail: StoredSession["detail"];
}

function toSession(row: SessionRow): StoredSession {
  return {
    id: row.id,
    module: row.module,
    variant: row.variant,
    timestamp: row.recorded_at,
    dayKey: row.day_key,
    durationMs: row.duration_ms,
    // Postgres numeric arrives as a string through PostgREST.
    headline: Number(row.headline),
    detail: row.detail,
  };
}

/** Whole history, oldest first. One user, a few hundred rows — no pagination. */
export async function listSessions(client: SupabaseClient): Promise<StoredSession[]> {
  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .select("id, module, variant, recorded_at, day_key, duration_ms, headline, detail")
    .order("recorded_at", { ascending: true });

  if (error) throw new Error(`failed to read session log: ${error.message}`);
  return (data ?? []).map((row) => toSession(row as SessionRow));
}

export async function insertSession(
  client: SupabaseClient,
  session: Omit<StoredSession, "id"> & { id?: string },
): Promise<StoredSession> {
  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .insert({
      module: session.module,
      variant: session.variant,
      recorded_at: session.timestamp,
      day_key: session.dayKey,
      duration_ms: session.durationMs,
      headline: session.headline,
      detail: session.detail,
    })
    .select("id, module, variant, recorded_at, day_key, duration_ms, headline, detail")
    .single();

  if (error) throw new Error(`failed to write session: ${error.message}`);
  return toSession(data as SessionRow);
}
