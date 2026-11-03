/**
 * The sold-price lookup, end to end (sold-comps design D4–D8): gate → query → store or
 * provider → comps pass → band math, with a cost row for every step. Every way it can't run
 * ends in a summary the device can show; nothing here throws to the route.
 *
 * The same item gets the same answer (D22): the search and the kept sales are remembered under
 * the item's subject. A repeat reuses both — no model call, no provider call. When the saved
 * sales are fetched again the search is kept and only the new sales are read.
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
import { subjectKey } from "./normalize";
import { normalizeQuery, writeQuery as defaultWriteQuery, type QueryInput } from "./query";
import { readComps as defaultReadComps } from "./read";
import { getFreshComps, getRead, sameInstant, saveComps, saveRead } from "./store";
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

  const subject = subjectKey(item);
  const memo = await getRead(deps.db, provider.name, subject);

  let query: string;
  if (memo) {
    query = memo.query;
  } else {
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
  const remember = (matches: number[], reason: string, model?: string) =>
    saveRead(deps.db, { provider: provider.name, subject, model, read: { query, queryNorm, compsFetchedAt: fetchedAt, matches, reason } });
  if (found === 0) {
    await remember([], "No sold listings came back.");
    return { status: "too-few", query, found, matched: 0, fetchedAt, cached };
  }

  const sent = listings.slice(0, COMPS.maxListings);
  let matches: number[];
  let reason: string;
  if (memo && memo.queryNorm === queryNorm && sameInstant(memo.compsFetchedAt, fetchedAt)) {
    // Same subject, same saved sales: the answer it got last time.
    matches = memo.matches.filter((i) => i < sent.length);
    reason = memo.reason;
  } else {
    try {
      const read = await readComps(item, sent);
      matches = read.matches;
      reason = read.reason;
      if (read.call) record({ kind: "comps", provider: read.call.provider, model: read.call.model, ...read.call.usage });
      await remember(matches, reason, read.call?.model);
    } catch (error: unknown) {
      record({ kind: "comps", ok: false, error: `error: ${messageOf(error)}` });
      return { status: "error", query, found, fetchedAt, cached, reason: "The sold listings couldn't be checked." };
    }
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
