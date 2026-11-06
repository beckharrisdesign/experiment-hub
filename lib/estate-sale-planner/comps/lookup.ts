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

interface Found {
  query: string;
  listings: SoldListing[];
  fetchedAt: string;
  cached: boolean;
}

/** How far into one search's listings a check reads before moving on to the next search. */
const MAX_BATCHES_PER_SEARCH = 2;

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

  /** The next search with enough listings, or the fullest of those left. A failure with nothing found comes back as `failure`. */
  const nextSearch = async (): Promise<{ found: Found | null; failure?: CompsSummary }> => {
    let best: Found | null = null;
    while (tried.length < COMPS.maxSearches) {
      if (pending.length === 0) {
        if (wrote) break;
        wrote = true;
        try {
          pending = await write();
        } catch (error: unknown) {
          record({ kind: "query", ok: false, error: `error: ${messageOf(error)}` });
          if (best) break;
          return { found: null, failure: { status: "error", reason: "The search couldn't be written." } };
        }
      }
      const candidate = pending.shift()!;
      const norm = normalizeQuery(candidate);
      if (triedNorms.has(norm)) continue;
      triedNorms.add(norm);

      let result: Omit<Found, "query">;
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
          return { found: null, failure: { status: kind, query: candidate } };
        }
        record({ kind: "lookup", provider: provider.name, cents: provider.pricePerRequestCents });
        await saveComps(deps.db, { provider: provider.name, query: candidate, queryNorm: norm, results: result.listings, fetchedAt: result.fetchedAt });
      }
      tried.push({ query: candidate, found: result.listings.length });
      if (!best || result.listings.length > best.listings.length) best = { query: candidate, ...result };
      if (result.listings.length >= COMPS.enoughListings) break;
    }
    return { found: best };
  };

  const first = await nextSearch();
  if (first.failure) return first.failure;
  // `maxSearches` is at least one and `write` always gives a search, so one always ran.
  const primary = first.found!;
  const { query, fetchedAt, cached } = primary;
  const queryNorm = normalizeQuery(query);
  const queryReused = normalizeQuery(remembered) === queryNorm;
  const found = primary.listings.length;

  const detailOf = (checked: SoldListing[], kept: SoldListing[], extra: Partial<LookupDetail>): LookupDetail => {
    const keptUrls = new Set(kept.map((l) => l.url));
    return {
      query,
      tried,
      ...(queryModel && !queryReused ? { queryModel } : {}),
      queryReused,
      provider: provider.name,
      listingsAt: fetchedAt,
      found,
      checked: checked.length,
      matched: kept.length,
      matches: kept,
      leftOut: checked.filter((l) => !keptUrls.has(l.url)),
      ...extra,
    };
  };
  if (found === 0) {
    // Not remembered: the next check should write a new search, not repeat one that found nothing.
    const reason = "No sold listings came back.";
    return { status: "too-few", query, found, matched: 0, fetchedAt, cached, detail: detailOf([], [], { reason }) };
  }

  let kept: SoldListing[] = [];
  let checked: SoldListing[];
  let reason: string | undefined;
  let readModel: string | undefined;
  if (memo && memo.queryNorm === queryNorm && sameInstant(memo.compsFetchedAt, fetchedAt)) {
    // Same subject, same saved sales: the answer it got last time.
    checked = primary.listings.slice(0, COMPS.maxListings * MAX_BATCHES_PER_SEARCH);
    kept = memo.matches.filter((i) => i < checked.length).map((i) => checked[i]);
    reason = memo.reason;
  } else {
    checked = [];
    const seen = new Set<string>();
    let reads = 0;
    let bestKept: { search: Found; matches: number[] } | null = null;
    /** One paid read of listings not yet read; throws on failure. Matches stay in the order the model ranked them. */
    const readBatch = async (search: Found, batch: SoldListing[]) => {
      reads += 1;
      const read = await readComps(item, batch);
      if (read.call) record({ kind: "comps", provider: read.call.provider, model: read.call.model, ...read.call.usage });
      const matched = read.matches.map((i) => batch[i]);
      for (const l of batch) seen.add(l.url);
      checked = [...checked, ...batch];
      kept = [...kept, ...matched];
      if (reason === undefined || matched.length > 0) reason = read.reason;
      readModel = read.call?.model ?? readModel;
      const indexes = matched.map((l) => search.listings.indexOf(l));
      if (bestKept?.search === search) bestKept.matches.push(...indexes);
      else if (!bestKept || indexes.length > bestKept.matches.length) bestKept = { search, matches: indexes };
    };
    const unread = (search: Found) => search.listings.slice(0, COMPS.maxListings * MAX_BATCHES_PER_SEARCH).filter((l) => !seen.has(l.url)).slice(0, COMPS.maxListings);

    try {
      await readBatch(primary, unread(primary));
    } catch (error: unknown) {
      record({ kind: "comps", ok: false, error: `error: ${messageOf(error)}` });
      return { status: "error", query, found, fetchedAt, cached, reason: "The sold listings couldn't be checked." };
    }
    // Plenty of listings can still hold few real matches, so keep going while too few match (D24, D25):
    // the rest of this search first, then broader ones, up to `COMPS.maxReads` paid reads in all.
    try {
      let search: Found | null = primary;
      while (kept.length < COMPS.minMatches && reads < COMPS.maxReads && search) {
        let batch: SoldListing[] = unread(search);
        if (batch.length === 0) {
          search = (await nextSearch()).found;
          batch = search ? unread(search) : [];
          if (batch.length === 0) continue;
        }
        await readBatch(search!, batch);
      }
    } catch (error: unknown) {
      // What's been read so far still stands.
      record({ kind: "comps", ok: false, error: `error: ${messageOf(error)}` });
    }
    const memory = bestKept as { search: Found; matches: number[] } | null;
    const from: Found = memory?.search ?? primary;
    await saveRead(deps.db, {
      provider: provider.name,
      subject,
      model: readModel,
      read: { query: from.query, queryNorm: normalizeQuery(from.query), compsFetchedAt: from.fetchedAt, matches: memory?.matches ?? [], reason: reason ?? "" },
    });
  }

  const band = bandFromPrices(kept.map((l) => l.priceCents), COMPS.minMatches);
  const detail = (extra: Partial<LookupDetail> = {}) => detailOf(checked, kept, { ...(reason ? { reason } : {}), ...(readModel ? { readModel } : {}), ...extra });
  if (!band) return { status: "too-few", query, found, matched: kept.length, reason, fetchedAt, cached, detail: detail() };

  return {
    status: "ok",
    query,
    found,
    matched: kept.length,
    rangeCents: band.rangeCents,
    band: band.band,
    reason,
    listings: newestFirst(kept).slice(0, COMPS.citeListings),
    fetchedAt,
    cached,
    detail: detail({ rangeCents: band.rangeCents, band: band.band }),
  };
}

function newestFirst(listings: SoldListing[]): SoldListing[] {
  return [...listings].sort((a, b) => (b.soldAt || "").localeCompare(a.soldAt || ""));
}
