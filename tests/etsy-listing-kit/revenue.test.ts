import { describe, it, expect } from 'vitest';
import { qualifyCharges, REVENUE_CLI_MIRROR, type ChargeLike } from '@/lib/etsy-listing-kit/revenue';

const LAUNCH = 1_800_000_000; // fixed unix seconds
const WINDOW = 14;
const inWindow = LAUNCH + 3 * 86400;

function charge(over: Partial<ChargeLike>): ChargeLike {
  return {
    id: 'ch_1', paid: true, status: 'succeeded', livemode: true, amount: 300, amount_refunded: 0,
    created: inWindow, metadata: { experiment_id: 'etsy-listing-kit' }, ...over,
  };
}
const opts = { launchTs: LAUNCH, windowDays: WINDOW };

describe('qualifyCharges', () => {
  it('counts a live, in-scope, in-window paid charge', () => {
    const r = qualifyCharges([charge({})], opts);
    expect(r).toEqual({ netCents: 300, count: 1, ids: ['ch_1'] });
  });

  it('ignores test-mode charges', () => {
    expect(qualifyCharges([charge({ livemode: false })], opts).count).toBe(0);
  });

  it('ignores charges for other experiments', () => {
    expect(qualifyCharges([charge({ metadata: { experiment_id: 'other' } })], opts).count).toBe(0);
  });

  it('ignores charges missing experiment metadata', () => {
    expect(qualifyCharges([charge({ metadata: {} })], opts).count).toBe(0);
  });

  it('ignores unpaid and non-succeeded charges', () => {
    expect(qualifyCharges([charge({ paid: false })], opts).count).toBe(0);
    expect(qualifyCharges([charge({ status: 'failed' })], opts).count).toBe(0);
  });

  it('ignores charges before launch and after the window', () => {
    expect(qualifyCharges([charge({ created: LAUNCH - 1 })], opts).count).toBe(0);
    expect(qualifyCharges([charge({ created: LAUNCH + WINDOW * 86400 + 1 })], opts).count).toBe(0);
  });

  it('subtracts refunds (partial and full)', () => {
    expect(qualifyCharges([charge({ amount: 300, amount_refunded: 100 })], opts).netCents).toBe(200);
    expect(qualifyCharges([charge({ amount: 300, amount_refunded: 300 })], opts).netCents).toBe(0);
  });

  it('de-duplicates repeated charge ids', () => {
    const r = qualifyCharges([charge({ id: 'ch_x' }), charge({ id: 'ch_x' })], opts);
    expect(r.count).toBe(1);
    expect(r.netCents).toBe(300);
  });

  it('sums multiple distinct qualifying charges', () => {
    const r = qualifyCharges([charge({ id: 'a' }), charge({ id: 'b', amount: 500 })], opts);
    expect(r).toMatchObject({ netCents: 800, count: 2 });
  });

  it('can require livemode=false to count test charges (for local checks)', () => {
    expect(qualifyCharges([charge({ livemode: false })], { ...opts, requireLivemode: false }).count).toBe(1);
  });
});

describe('CLI parity', () => {
  it('exposes the same target the revenue:test CLI hardcodes', () => {
    expect(REVENUE_CLI_MIRROR).toEqual({
      EXPERIMENT_ID: 'etsy-listing-kit',
      TARGET_CENTS: 10000,
      WINDOW_DAYS: 14,
    });
  });
});
