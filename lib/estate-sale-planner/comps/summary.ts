/**
 * What the lookup returns, and the gate — shared by the route and the device, so both decide
 * the same way (sold-comps design D4, D7). The server's check is the one that protects spend.
 */
import type { BANDS } from "../flag";
import { bandMeetsLookup, resolveLookupMinBand } from "../profile";
import type { Destination } from "../session";
import type { SoldListing } from "./provider";

export type CompsStatus = "ok" | "too-few" | "gated" | "not-configured" | "error" | "quota";

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
}

/**
 * A lookup runs only for an item headed to Sell whose band is at or above the person's
 * threshold. Whatever threshold arrives is resolved to one of the offered choices first.
 */
export function meetsLookupGate(item: { destination?: Destination; band: string }, minBand: unknown): boolean {
  return item.destination === "sell" && bandMeetsLookup(item.band, resolveLookupMinBand(minBand));
}
