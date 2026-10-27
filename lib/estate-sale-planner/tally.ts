/**
 * What each pile might be worth (founder, 2026-10-27: "keep a tally of the
 * possible sales total, the possible donation total, and the value of what is
 * being kept"). Bands are ranges, so a tally is too: the sum of every item's
 * low end to the sum of its high end. One "over $2,000" leaves the top open.
 */
import type { BANDS, LEGACY_BANDS } from "./flag";
import type { Destination, Session, SessionItem } from "./session";

type Band = (typeof BANDS)[number] | (typeof LEGACY_BANDS)[number];

const RANGE: Record<Band, [number, number | null]> = {
  "under $1": [0, 1],
  "$1–$5": [1, 5],
  "$5–$10": [5, 10],
  "$10–$25": [10, 25],
  "$25–$50": [25, 50],
  "$50–$100": [50, 100],
  "$100–$250": [100, 250],
  "$250–$500": [250, 500],
  "$500–$2,000": [500, 2000],
  "over $2,000": [2000, null],
  // Saved before the finer list (2026-10-27).
  "under $25": [0, 25],
  "$25–$100": [25, 100],
  "$100–$500": [100, 500],
};

export interface Tally {
  count: number;
  /** Whole dollars. */
  low: number;
  /** Whole dollars; null when any item is open-ended. */
  high: number | null;
}

export function tally(items: Pick<SessionItem, "band">[]): Tally {
  let low = 0;
  let high: number | null = 0;
  for (const { band } of items) {
    const [lo, hi] = RANGE[band as Band] ?? [0, 0];
    low += lo;
    high = high === null || hi === null ? null : high + hi;
  }
  return { count: items.length, low, high };
}

export type Tallies = Record<Destination, Tally> & { unsorted: number };

export function tallies(s: Session): Tallies {
  const by = (d: Destination) => tally(s.items.filter((i) => i.destination === d));
  return { sell: by("sell"), donate: by("donate"), keep: by("keep"), unsorted: s.items.filter((i) => !i.destination).length };
}

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function formatTally({ count, low, high }: Tally): string {
  if (count === 0) return usd(0);
  if (high === null) return `${usd(low)}+`;
  if (low === 0) return `Up to ${usd(high)}`;
  return `${usd(low)}–${usd(high)}`;
}
