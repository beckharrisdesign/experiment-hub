/**
 * Stripe client for Etsy Listing Kit (server-only). Null when unconfigured so
 * routes can return a clean 500 instead of throwing. Adapted from SSO pattern.
 */
import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export function isLiveMode(): boolean {
  const k = process.env.STRIPE_SECRET_KEY || '';
  return k.startsWith('sk_live_') || k.startsWith('rk_live_');
}
