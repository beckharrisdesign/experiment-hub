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

/** What was decided about one item subject (D22): the search, and which saved sales matched. */
export interface StoredRead {
  query: string;
  queryNorm: string;
  /** The `esp_comps.fetched_at` the matches index into. */
  compsFetchedAt: string;
  matches: number[];
  reason: string;
}

/** The read for a subject, or null. A read error is a miss, logged: the lookup runs in full. */
export async function getRead(db: SupabaseClient | null, provider: string, subject: string): Promise<StoredRead | null> {
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("esp_comps_reads")
      .select("query, query_norm, comps_fetched_at, matches, reason")
      .eq("provider", provider)
      .eq("subject", subject)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      query: data.query,
      queryNorm: data.query_norm,
      compsFetchedAt: data.comps_fetched_at,
      matches: Array.isArray(data.matches) ? data.matches.filter((i: unknown) => Number.isInteger(i)) : [],
      reason: data.reason,
    };
  } catch (error: unknown) {
    console.error("[esp comps] read memo lookup failed; checking afresh:", messageOf(error));
    return null;
  }
}

/** Save (or replace) the read for a subject. Never throws. */
export async function saveRead(
  db: SupabaseClient | null,
  row: { provider: string; subject: string; read: StoredRead; model?: string },
): Promise<void> {
  if (!db) return;
  try {
    const { error } = await db.from("esp_comps_reads").upsert(
      {
        provider: row.provider,
        subject: row.subject,
        query: row.read.query,
        query_norm: row.read.queryNorm,
        comps_fetched_at: row.read.compsFetchedAt,
        matches: row.read.matches,
        reason: row.read.reason,
        model: row.model ?? null,
      },
      { onConflict: "provider,subject" },
    );
    if (error) throw error;
  } catch (error: unknown) {
    console.error("[esp comps] read memo write failed:", messageOf(error));
  }
}

/** Two timestamps for the same instant (the database answers "+00:00", we write "Z"). */
export function sameInstant(a: string, b: string): boolean {
  const x = Date.parse(a);
  return Number.isFinite(x) && x === Date.parse(b);
}
