/**
 * What the lookup returns, and the gate — shared by the route and the device, so both decide
 * the same way (sold-comps design D4, D7). The server's check is the one that protects spend.
 */
import type { BANDS } from "../flag";
import { bandMeetsLookup, resolveLookupMinBand } from "../profile";
import type { Destination } from "../session";
import type { SoldListing } from "./provider";

/** "limited": this item was already checked in the last 24 hours (D23); nothing ran. */
export type CompsStatus = "ok" | "too-few" | "gated" | "limited" | "not-configured" | "error" | "quota";

/** Everything that went into a completed lookup, for the item screen (D23). The route saves it. */
export interface LookupDetail {
  query: string;
  /** Every search this check sent, in order, and how many each found. Absent on older saved checks. */
  tried?: Array<{ query: string; found: number }>;
  /** The model that wrote the search; absent when it was reused or no model is configured. */
  queryModel?: string;
  queryReused: boolean;
  provider: string;
  /** When the sold listings were pulled. */
  listingsAt: string;
  found: number;
  /** Listings sent to the comps pass. */
  checked: number;
  /** The model that checked them; absent when no model is configured. */
  readModel?: string;
  matched: number;
  reason?: string;
  rangeCents?: [number, number];
  band?: (typeof BANDS)[number];
  /** Every kept listing, most recent first. */
  matches: SoldListing[];
  /** The listings checked and not kept. */
  leftOut: SoldListing[];
}

export interface CompsSummary {
  status: CompsStatus;
  query?: string;
  /** Listings the comps pass kept. */
  matched?: number;
  /** Listings the provider (or the store) returned. */
  found?: number;
  /** Whole-dollar 25th–75th percentile of the matched prices, in cents. */
  rangeCents?: [number, number];
  band?: (typeof BANDS)[number];
  reason?: string;
  /** Up to `COMPS.citeListings` kept listings, most recent first. */
  listings?: SoldListing[];
  fetchedAt?: string;
  /** Answered from the comps store with no provider call. */
  cached?: boolean;
  /** On a completed lookup: the full record. The route moves it to `check` and saves it. */
  detail?: LookupDetail;
}

/**
 * A lookup runs only for an item headed to Sell whose band is at or above the person's
 * threshold. Whatever threshold arrives is resolved to one of the offered choices first.
 */
export function meetsLookupGate(item: { destination?: Destination; band: string }, minBand: unknown): boolean {
  return item.destination === "sell" && bandMeetsLookup(item.band, resolveLookupMinBand(minBand));
}
