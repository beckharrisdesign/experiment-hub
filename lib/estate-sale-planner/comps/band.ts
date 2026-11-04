/**
 * Band math from matching sales (sold-comps design D7, review queue #65). The model only says
 * which listings are the same object; code sets the range — the 25th to 75th percentile of the
 * matched prices — and the band that holds the median. Asking a model for a band from prices
 * brings back the optimism #55 fixed; percentiles are deterministic and honest about spread.
 */
import { BANDS } from "../flag";
import { bandLow } from "../tally";

type Band = (typeof BANDS)[number];

/** Linear-interpolated percentile of sorted values, p in 0–1. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

/** The band whose range holds a price in whole dollars (low end inclusive). */
export function bandForDollars(dollars: number): Band {
  for (let i = BANDS.length - 1; i >= 0; i--) {
    if (dollars >= bandLow(BANDS[i])!) return BANDS[i];
  }
  return BANDS[0];
}

export interface CompsBand {
  /** Whole-dollar range, in cents: [25th, 75th] percentile. */
  rangeCents: [number, number];
  band: Band;
  medianCents: number;
}

/** Null below `minMatches`: too few sales to replace the model's band. */
export function bandFromPrices(priceCents: number[], minMatches: number): CompsBand | null {
  if (priceCents.length < minMatches) return null;
  const sorted = [...priceCents].sort((a, b) => a - b);
  const toDollarCents = (c: number) => Math.round(c / 100) * 100;
  const median = percentile(sorted, 0.5);
  return {
    rangeCents: [toDollarCents(percentile(sorted, 0.25)), toDollarCents(percentile(sorted, 0.75))],
    band: bandForDollars(median / 100),
    medianCents: Math.round(median),
  };
}
