/**
 * Our own comps store (sold-comps design D6): every lookup saved in `esp_comps` by
 * (provider, normalized query), reused for `COMPS.freshDays` from any sale. Server routes only,
 * with the service role (migration 019). With no Supabase there is no store: every lookup is
 * a miss and nothing is saved.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPS } from "../config";
import { messageOf } from "../errors";
import type { SoldListing } from "./provider";

export interface StoredComps {
  query: string;
  fetchedAt: string;
  results: SoldListing[];
}

export function isFresh(fetchedAt: string, now: Date, freshDays: number = COMPS.freshDays): boolean {
  const at = Date.parse(fetchedAt);
  return Number.isFinite(at) && now.getTime() - at < freshDays * 24 * 60 * 60 * 1000;
}

/** A saved result younger than the window, or null. A read error is a miss, logged. */
export async function getFreshComps(
  db: SupabaseClient | null,
  provider: string,
  queryNorm: string,
  now: Date = new Date(),
): Promise<StoredComps | null> {
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("esp_comps")
      .select("query, fetched_at, results")
      .eq("provider", provider)
      .eq("query_norm", queryNorm)
      .maybeSingle();
    if (error) throw error;
    if (!data || !isFresh(data.fetched_at, now)) return null;
    return { query: data.query, fetchedAt: data.fetched_at, results: Array.isArray(data.results) ? data.results : [] };
  } catch (error: unknown) {
    console.error("[esp comps] store read failed; looking it up instead:", messageOf(error));
    return null;
  }
}

/** Save (or replace) a lookup. Never throws: the item still gets its answer. */
export async function saveComps(
  db: SupabaseClient | null,
  row: { provider: string; query: string; queryNorm: string; results: SoldListing[]; fetchedAt: string },
): Promise<void> {
  if (!db) return;
  try {
    const { error } = await db.from("esp_comps").upsert(
      {
        provider: row.provider,
        query: row.query,
        query_norm: row.queryNorm,
        fetched_at: row.fetchedAt,
        results: row.results,
        result_count: row.results.length,
      },
      { onConflict: "provider,query_norm" },
    );
    if (error) throw error;
  } catch (error: unknown) {
    console.error("[esp comps] store write failed:", messageOf(error));
  }
}
