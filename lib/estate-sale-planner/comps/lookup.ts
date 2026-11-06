/**
 * The sold-price lookup, end to end (sold-comps design D4–D8): gate → query → store or
 * provider → comps pass → band math, with a cost row for every step. Every way it can't run
 * ends in a summary the device can show; nothing here throws to the route.
 *
 * The same item gets the same answer (D22): the search and the kept sales are remembered under
 * the item's subject. A repeat reuses both — no model call, no provider call. When the saved
 * sales are fetched again the search is kept and only the new sales are read.
 *
 * A search that finds too little is broadened (D24), up to `COMPS.maxSearches` calls, and the one
 * that found the most is used. A search that found nothing is never remembered.
 *
 * A click of the check button (D23) passes `fresh`, so the listings are pulled again even when
 * saved ones are in date. The search stays reused, so the same item keeps asking the same thing.
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
import { cleanQuery, normalizeQuery, writeQuery as defaultWriteQuery, type QueryInput } from "./query";
import { readComps as defaultReadComps } from "./read";
import { getFreshComps, getRead, sameInstant, saveComps, saveRead } from "./store";
import { meetsLookupGate, type CompsSummary, type LookupDetail } from "./summary";

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
  /** Pull the sold listings again even if saved ones are still in date. */
  fresh?: boolean;
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

  // Written only when needed: a remembered search that still finds enough costs no model call.
  let queryModel: string | undefined;
  const write = async (): Promise<string[]> => {
    const written = await writeQuery(item);
    queryModel = written.call?.model;
    if (written.call) {
      record({ kind: "query", provider: written.call.provider, model: written.call.model, ...written.call.usage });
    }
    // One word ("desk") finds plenty and none of it is the object: not worth paying to read.
    const broader = (written.broader ?? []).map(cleanQuery).filter((q) => q.includes(" "));
    const searches = [cleanQuery(written.query), ...broader].filter(Boolean);
    return searches.length ? searches : [cleanQuery(item.name) || item.name];
  };

  const remembered = memo ? cleanQuery(memo.query) : "";
  let wrote = false;
  let pending: string[] = remembered ? [remembered] : [];
  const tried: Array<{ query: string; found: number }> = [];
  const triedNorms = new Set<string>();
  let best: { query: string; listings: SoldListing[]; fetchedAt: string; cached: boolean } | null = null;

  while (tried.length < COMPS.maxSearches) {
    if (pending.length === 0) {
      if (wrote) break;
      wrote = true;
      try {
        pending = await write();
      } catch (error: unknown) {
        record({ kind: "query", ok: false, error: `error: ${messageOf(error)}` });
        if (best) break;
        return { status: "error", reason: "The search couldn't be written." };
      }
    }
    const candidate = pending.shift()!;
    const norm = normalizeQuery(candidate);
    if (triedNorms.has(norm)) continue;
    triedNorms.add(norm);

    let result: { listings: SoldListing[]; fetchedAt: string; cached: boolean };
    const saved = input.fresh ? null : await getFreshComps(deps.db, provider.name, norm, now());
    if (saved) {
      result = { listings: saved.results, fetchedAt: saved.fetchedAt, cached: true };
      record({ kind: "lookup", provider: provider.name, cents: 0, cacheHit: true });
    } else {
      try {
        const listings = await provider.search(candidate, AbortSignal.timeout(COMPS.timeoutMs));
        result = { listings, fetchedAt: now().toISOString(), cached: false };
      } catch (error: unknown) {
        const kind = error instanceof ProviderError ? error.kind : "error";
        // Failed requests aren't billed (CompsAPI docs), so the row carries no cost.
        record({ kind: "lookup", provider: provider.name, cents: 0, ok: false, error: kind === "quota" ? "quota" : `error: ${messageOf(error)}` });
        if (best) break;
        return { status: kind, query: candidate };
      }
      record({ kind: "lookup", provider: provider.name, cents: provider.pricePerRequestCents });
      await saveComps(deps.db, { provider: provider.name, query: candidate, queryNorm: norm, results: result.listings, fetchedAt: result.fetchedAt });
    }
    tried.push({ query: candidate, found: result.listings.length });
    if (!best || result.listings.length > best.listings.length) best = { query: candidate, ...result };
    if (result.listings.length >= COMPS.enoughListings) break;
  }

  // The loop always tries at least one search or returns: `pending` is never empty after `write`.
  const { query, listings, fetchedAt, cached } = best!;
  const queryNorm = normalizeQuery(query);
  const queryReused = normalizeQuery(remembered) === queryNorm;

  const found = listings.length;
  const remember = (matches: number[], reason: string, model?: string) =>
    saveRead(deps.db, { provider: provider.name, subject, model, read: { query, queryNorm, compsFetchedAt: fetchedAt, matches, reason } });
  const detailOf = (sentListings: SoldListing[], matched: number[], extra: Partial<LookupDetail>): LookupDetail => ({
    query,
    tried,
    ...(queryModel && !queryReused ? { queryModel } : {}),
    queryReused,
    provider: provider.name,
    listingsAt: fetchedAt,
    found,
    checked: sentListings.length,
    matched: matched.length,
    matches: newestFirst(matched.map((i) => sentListings[i])),
    leftOut: sentListings.filter((_, i) => !matched.includes(i)),
    ...extra,
  });
  if (found === 0) {
    // Not remembered: the next check should write a new search, not repeat one that found nothing.
    const reason = "No sold listings came back.";
    return { status: "too-few", query, found, matched: 0, fetchedAt, cached, detail: detailOf([], [], { reason }) };
  }

  const readLimit = COMPS.maxListings * COMPS.maxReads;
  let sent = listings.slice(0, COMPS.maxListings);
  let matches: number[];
  let reason: string;
  let readModel: string | undefined;
  if (memo && memo.queryNorm === queryNorm && sameInstant(memo.compsFetchedAt, fetchedAt)) {
    // Same subject, same saved sales: the answer it got last time.
    sent = listings.slice(0, readLimit);
    matches = memo.matches.filter((i) => i < sent.length);
    reason = memo.reason;
  } else {
    try {
      const read = await readComps(item, sent);
      matches = read.matches;
      reason = read.reason;
      readModel = read.call?.model;
      if (read.call) record({ kind: "comps", provider: read.call.provider, model: read.call.model, ...read.call.usage });
    } catch (error: unknown) {
      record({ kind: "comps", ok: false, error: `error: ${messageOf(error)}` });
      return { status: "error", query, found, fetchedAt, cached, reason: "The sold listings couldn't be checked." };
    }
    // Listings come newest first, so small look-alikes can crowd the real ones out of the first
    // batch (D24). Only pay for a second read when the first didn't find enough.
    const next = listings.slice(sent.length, readLimit);
    if (matches.length < COMPS.minMatches && next.length > 0) {
      try {
        const more = await readComps(item, next);
        if (more.call) record({ kind: "comps", provider: more.call.provider, model: more.call.model, ...more.call.usage });
        matches = [...matches, ...more.matches.map((i) => i + sent.length)];
        if (more.matches.length > 0) reason = more.reason;
        sent = [...sent, ...next];
      } catch (error: unknown) {
        // The first batch's answer still stands.
        record({ kind: "comps", ok: false, error: `error: ${messageOf(error)}` });
      }
    }
    await remember(matches, reason, readModel);
  }

  const kept = matches.map((i) => sent[i]);
  const band = bandFromPrices(kept.map((l) => l.priceCents), COMPS.minMatches);
  const detail = (extra: Partial<LookupDetail> = {}) => detailOf(sent, matches, { reason, ...(readModel ? { readModel } : {}), ...extra });
  if (!band) return { status: "too-few", query, found, matched: kept.length, reason, fetchedAt, cached, detail: detail() };

  const cite = newestFirst(kept).slice(0, COMPS.citeListings);
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
    detail: detail({ rangeCents: band.rangeCents, band: band.band }),
  };
}

function newestFirst(listings: SoldListing[]): SoldListing[] {
  return [...listings].sort((a, b) => (b.soldAt || "").localeCompare(a.soldAt || ""));
}
