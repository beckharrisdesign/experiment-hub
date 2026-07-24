#!/usr/bin/env node
/**
 * revenue:test — truthful business acceptance test for etsy-listing-kit.
 *
 * Counts ONLY: live-mode, post-launch-timestamp, `experiment_id=etsy-listing-kit`
 * Stripe charges, minus refunds, excluding tax, de-duplicated. Exits non-zero
 * until the real $100 target is met. Can NEVER pass on test-mode/seed/mock data.
 *
 * Requires STRIPE_SECRET_KEY (read access). Without it, the test is INACTIVE and
 * reports so — it does not claim success. Target config: lib/etsy-listing-kit/config.ts.
 */
import Stripe from 'stripe';

const EXPERIMENT_ID = 'etsy-listing-kit';
const TARGET_CENTS = 100_00;
const WINDOW_DAYS = 14;
// Launch timestamp is injected at go-live (env overrides config default of null).
const LAUNCHED_AT = process.env.ELK_LAUNCHED_AT || null;

function fail(msg) { console.error(msg); process.exit(2); }

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.log('revenue:test — INACTIVE: STRIPE_SECRET_KEY not set. Cannot read live revenue.');
  console.log('Set a read-capable live key to activate. (Test is not passing — it is not running.)');
  process.exit(3); // distinct code: inactive, not pass/fail
}
const stripe = new Stripe(key);
const isLiveKey = key.startsWith('sk_live_');

if (!LAUNCHED_AT) {
  console.log('revenue:test — RED: not launched yet (ELK_LAUNCHED_AT unset). Qualifying revenue = $0 / $100.');
  process.exit(2);
}
const launchTs = Math.floor(new Date(LAUNCHED_AT).getTime() / 1000);
const windowEnd = launchTs + WINDOW_DAYS * 86400;

// Pull paid charges after launch, filter by experiment metadata + livemode.
let net = 0, count = 0;
const seen = new Set();
for await (const charge of stripe.charges.list({ created: { gte: launchTs, lte: windowEnd }, limit: 100 })) {
  if (!charge.paid || charge.status !== 'succeeded') continue;
  if (!charge.livemode) continue;                       // test-mode never counts
  const meta = charge.metadata || {};
  if (meta.experiment_id !== EXPERIMENT_ID) continue;   // other products never count
  if (seen.has(charge.id)) continue;                    // de-dup
  seen.add(charge.id);
  net += (charge.amount - (charge.amount_refunded || 0)); // minus refunds; amount excludes tax by construction
  count += 1;
}

const now = Math.floor(Date.now() / 1000);
const elapsedDays = Math.max(0, Math.floor((now - launchTs) / 86400));
const remainingDays = Math.max(0, WINDOW_DAYS - elapsedDays);
const gap = Math.max(0, TARGET_CENTS - net);
const aov = count ? net / count : 0;
const usd = (c) => `$${(c / 100).toFixed(2)}`;

console.log(`revenue:test — ${EXPERIMENT_ID} (${isLiveKey ? 'LIVE' : 'TEST'} key)`);
console.log(`  Target:            ${usd(TARGET_CENTS)} in ${WINDOW_DAYS} days`);
console.log(`  Qualifying net:    ${usd(net)}`);
console.log(`  Gap remaining:     ${usd(gap)}`);
console.log(`  Purchases:         ${count}`);
console.log(`  Avg order value:   ${usd(aov)}`);
console.log(`  Days elapsed:      ${elapsedDays} / ${WINDOW_DAYS} (${remainingDays} left)`);
console.log(`  Req. daily rate:   ${remainingDays ? usd(gap / remainingDays) : '—'}/day`);

if (!isLiveKey) {
  console.log('  STATUS: INACTIVE — test-mode key. Real target requires a live key.');
  process.exit(3);
}
if (net >= TARGET_CENTS) {
  console.log('  STATUS: PASS ✓ — real target met.');
  process.exit(0);
}
console.log('  STATUS: RED — target not yet met.');
process.exit(2);
