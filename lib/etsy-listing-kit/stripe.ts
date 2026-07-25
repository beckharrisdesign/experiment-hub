/**
 * Stripe client for Etsy Listing Kit (server-only). Store BOTH test and live
 * secrets once (…_TEST / …_LIVE) and flip STRIPE_MODE to switch — no editing
 * secret values. Null when unconfigured so routes return a clean 500.
 */
import Stripe from 'stripe';

/** 'test' (default) or 'live', from STRIPE_MODE. */
export function stripeMode(): 'test' | 'live' {
  return (process.env.STRIPE_MODE || '').toLowerCase() === 'live' ? 'live' : 'test';
}

/** Resolve the secret key for the current mode (with unsuffixed back-compat). */
export function secretKey(): string | undefined {
  const byMode = stripeMode() === 'live' ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST;
  return byMode || process.env.STRIPE_SECRET_KEY;
}

/** Resolve the webhook signing secret for the current mode. */
export function webhookSecret(): string | undefined {
  const byMode = stripeMode() === 'live' ? process.env.STRIPE_WEBHOOK_SECRET_LIVE : process.env.STRIPE_WEBHOOK_SECRET_TEST;
  return byMode || process.env.STRIPE_WEBHOOK_SECRET;
}

const key = secretKey();
export const stripe = key ? new Stripe(key) : null;

/** True when the resolved key is a live (or restricted-live) key — ground truth. */
export function isLiveMode(): boolean {
  const k = secretKey() || '';
  return k.startsWith('sk_live_') || k.startsWith('rk_live_');
}
