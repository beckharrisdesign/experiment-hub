/**
 * Pure revenue-qualification logic — the single source of truth for what counts
 * toward the acceptance target. `scripts/revenue-test.mjs` mirrors these rules
 * (it is a zero-dep CLI); the parity test in revenue.test.ts asserts they agree.
 */
import { EXPERIMENT_ID, REVENUE_TARGET } from './config';

export interface ChargeLike {
  id: string;
  paid: boolean;
  status: string;              // 'succeeded' | ...
  livemode: boolean;
  amount: number;              // minor units, excludes tax
  amount_refunded?: number;    // minor units
  created: number;             // unix seconds
  metadata?: { experiment_id?: string };
}

export interface QualifyOpts {
  launchTs: number;            // unix seconds; charges before this never count
  windowDays: number;
  experimentId?: string;
  requireLivemode?: boolean;
}

export interface QualifyResult { netCents: number; count: number; ids: string[]; }

/** Sum net qualifying revenue from a list of charges, applying every rule. */
export function qualifyCharges(charges: ChargeLike[], opts: QualifyOpts): QualifyResult {
  const experimentId = opts.experimentId ?? EXPERIMENT_ID;
  const requireLive = opts.requireLivemode ?? true;
  const windowEnd = opts.launchTs + opts.windowDays * 86400;
  const seen = new Set<string>();
  let netCents = 0;
  const ids: string[] = [];
  for (const c of charges) {
    if (!c.paid || c.status !== 'succeeded') continue;
    if (requireLive && !c.livemode) continue;
    if (c.metadata?.experiment_id !== experimentId) continue;
    if (c.created < opts.launchTs || c.created > windowEnd) continue;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    netCents += c.amount - (c.amount_refunded ?? 0);
    ids.push(c.id);
  }
  return { netCents, count: ids.length, ids };
}

/** Config the CLI mirrors — exported so tests can assert parity. */
export const REVENUE_CLI_MIRROR = {
  EXPERIMENT_ID,
  TARGET_CENTS: REVENUE_TARGET.targetCents,
  WINDOW_DAYS: REVENUE_TARGET.windowDays,
};
