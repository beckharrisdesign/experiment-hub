import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPriceToTierMap } from '@/lib/plans';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export interface SubscriptionInfo {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

const FREE_INFO: SubscriptionInfo = {
  tier: 'Seed Stash Starter',
  status: 'free',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  stripeCustomerId: null,
};

/**
 * Get subscription tier for a user.
 * DB-first: reads subscriptions table. Falls back to Stripe API if no row exists.
 */
export async function getTierForUser(
  userId: string,
  supabase: SupabaseClient,
  email?: string
): Promise<string> {
  const info = await getSubscriptionInfo(userId, supabase, email);
  return info.tier;
}

/**
 * Get full subscription info for a user.
 * DB-first: reads subscriptions table. Falls back to Stripe API if no row exists.
 *
 * @param userId  Supabase auth user UUID
 * @param supabase  Supabase client (user session or admin)
 * @param email   User email — only used for the Stripe API fallback path
 */
export async function getSubscriptionInfo(
  userId: string,
  supabase: SupabaseClient,
  email?: string
): Promise<SubscriptionInfo> {
  // Fast path: read from subscriptions table (written by webhook)
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end, cancel_at_period_end, stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data) {
    const isActive = data.status === 'active' || data.status === 'trialing';
    return {
      tier: isActive ? data.tier : 'Seed Stash Starter',
      status: data.status,
      currentPeriodEnd: data.current_period_end ?? null,
      cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
      stripeCustomerId: data.stripe_customer_id ?? null,
    };
  }

  // Slow path: query Stripe directly (for users who subscribed before webhook was deployed)
  if (!email || !stripe) return FREE_INFO;
  return getSubscriptionInfoFromStripe(email);
}

/**
 * Query Stripe directly for subscription info by customer email.
 * Only used as fallback when no DB row exists.
 */
async function getSubscriptionInfoFromStripe(email: string): Promise<SubscriptionInfo> {
  if (!stripe) return FREE_INFO;
  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return FREE_INFO;

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 1,
      expand: ['data.items.data.price'],
    });
    const sub = subs.data[0];
    if (!sub) return { ...FREE_INFO, stripeCustomerId: customer.id };

    const firstItem = sub.items.data[0];
    const priceId = firstItem?.price?.id;
    const priceToTier = buildPriceToTierMap();
    const tier = priceToTier[priceId || ''] || 'Seed Stash Starter';
    const periodEnd = firstItem?.current_period_end;

    return {
      tier,
      status: sub.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      stripeCustomerId: customer.id,
    };
  } catch {
    return FREE_INFO;
  }
}

/** First day of next calendar month (for free tier AI reset display). */
export function getFirstOfNextMonth(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString();
}
