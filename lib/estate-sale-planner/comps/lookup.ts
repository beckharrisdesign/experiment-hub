/**
 * The sold-price lookup, end to end (sold-comps design D4–D8): gate → query → store or
 * provider → comps pass → band math, with a cost row for every step. Every way it can't run
 * ends in a summary the device can show; nothing here throws to the route.
 *
 * Dependencies are injected so the whole pass is testable without a network or a database.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPS } from "../config";
import type { CostInput } from "../costs";
import type { Destination } from "../session";
import { messageOf } from "../errors";
import { bandFromPrices } from "./band";
import { ProviderError, type CompsProvider, type SoldListing } from "./provider";
import { normalizeQuery, writeQuery as defaultWriteQuery, type QueryInput } from "./query";
import { readComps as defaultReadComps } from "./read";
import { getFreshComps, saveComps } from "./store";
import { meetsLookupGate, type CompsSummary } from "./summary";

export interface LookupItem extends QueryInput {
  band: string;
  destination?: Destination;
}

export interface LookupInput {
  item: LookupItem;
  /** The person's threshold as the device sent it; resolved to an offered choice. */
  minBand?: unknown;
  sessionId?: string;
  saleId?: string;
}

export interface LookupDeps {
  provider: CompsProvider | null;
  db: SupabaseClient | null;
  record: (input: CostInput) => void;
  writeQuery?: typeof defaultWriteQuery;
  readComps?: typeof defaultReadComps;
  now?: () => Date;
}

export async function lookupComps(input: LookupInput, deps: LookupDeps): Promise<CompsSummary> {
  const { item, sessionId, saleId } = input;
  const writeQuery = deps.writeQuery ?? defaultWriteQuery;
  const readComps = deps.readComps ?? defaultReadComps;
  const now = deps.now ?? (() => new Date());
  const record = (row: CostInput) => deps.record({ sessionId, saleId, ...row });

  if (!meetsLookupGate(item, input.minBand)) return { status: "gated" };

  const provider = deps.provider;
  if (!provider) {
    record({ kind: "lookup", ok: false, error: "not-configured", cents: 0 });
    return { status: "not-configured" };
  }

  let query: string;
  try {
    const written = await writeQuery(item);
    query = written.query;
    if (written.call) {
      record({ kind: "query", provider: written.call.provider, model: written.call.model, ...written.call.usage });
    }
  } catch (error: unknown) {
    record({ kind: "query", ok: false, error: `error: ${messageOf(error)}` });
    return { status: "error", reason: "The search couldn't be written." };
  }

  const queryNorm = normalizeQuery(query);
  let listings: SoldListing[];
  let fetchedAt: string;
  let cached = false;
  const saved = await getFreshComps(deps.db, provider.name, queryNorm, now());
  if (saved) {
    listings = saved.results;
    fetchedAt = saved.fetchedAt;
    cached = true;
    record({ kind: "lookup", provider: provider.name, cents: 0, cacheHit: true });
  } else {
    try {
      listings = await provider.search(query, AbortSignal.timeout(COMPS.timeoutMs));
    } catch (error: unknown) {
      const kind = error instanceof ProviderError ? error.kind : "error";
      // Failed requests aren't billed (CompsAPI docs), so the row carries no cost.
      record({ kind: "lookup", provider: provider.name, cents: 0, ok: false, error: kind === "quota" ? "quota" : `error: ${messageOf(error)}` });
      return { status: kind, query };
    }
    fetchedAt = now().toISOString();
    record({ kind: "lookup", provider: provider.name, cents: provider.pricePerRequestCents });
    await saveComps(deps.db, { provider: provider.name, query, queryNorm, results: listings, fetchedAt });
  }

  const found = listings.length;
  if (found === 0) return { status: "too-few", query, found, matched: 0, fetchedAt, cached };

  const sent = listings.slice(0, COMPS.maxListings);
  let matches: number[];
  let reason: string;
  try {
    const read = await readComps(item, sent);
    matches = read.matches;
    reason = read.reason;
    if (read.call) record({ kind: "comps", provider: read.call.provider, model: read.call.model, ...read.call.usage });
  } catch (error: unknown) {
    record({ kind: "comps", ok: false, error: `error: ${messageOf(error)}` });
    return { status: "error", query, found, fetchedAt, cached, reason: "The sold listings couldn't be checked." };
  }

  const kept = matches.map((i) => sent[i]);
  const band = bandFromPrices(kept.map((l) => l.priceCents), COMPS.minMatches);
  if (!band) return { status: "too-few", query, found, matched: kept.length, reason, fetchedAt, cached };

  const cite = [...kept].sort((a, b) => (b.soldAt || "").localeCompare(a.soldAt || "")).slice(0, COMPS.citeListings);
  return {
    status: "ok",
    query,
    found,
    matched: kept.length,
    rangeCents: band.rangeCents,
    band: band.band,
    reason,
    listings: cite,
    fetchedAt,
    cached,
  };
}
