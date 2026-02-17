import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const PRICE_TO_TIER: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_MONTHLY || '']: 'Home Garden',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY || '']: 'Home Garden',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_MONTHLY || '']: 'Serious Hobby',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_YEARLY || '']: 'Serious Hobby',
};

/**
 * Get subscription tier for a user by email.
 * Returns 'Seed Stash Starter' if no Stripe customer or subscription.
 */
export async function getTierForUser(email: string | undefined): Promise<string> {
  const result = await getSubscriptionInfo(email);
  return result.tier;
}

/**
 * Get subscription tier and billing period end for a user.
 * Used for "Resets on [date]" indicator.
 */
export async function getSubscriptionInfo(email: string | undefined): Promise<{
  tier: string;
  currentPeriodEnd: string | null;
}> {
  if (!email || !stripe) {
    return { tier: 'Seed Stash Starter', currentPeriodEnd: null };
  }
  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return { tier: 'Seed Stash Starter', currentPeriodEnd: null };
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 1,
      expand: ['data.items.data.price'],
    });
    const sub = subs.data[0];
    if (!sub) return { tier: 'Seed Stash Starter', currentPeriodEnd: null };
    const firstItem = sub.items.data[0];
    const priceId = firstItem?.price?.id;
    const tier = PRICE_TO_TIER[priceId || ''] || 'Seed Stash Starter';
    const periodEnd = firstItem?.current_period_end;
    const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
    return { tier, currentPeriodEnd };
  } catch {
    return { tier: 'Seed Stash Starter', currentPeriodEnd: null };
  }
}

/** First day of next calendar month (for free tier AI reset). */
export function getFirstOfNextMonth(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString();
}
