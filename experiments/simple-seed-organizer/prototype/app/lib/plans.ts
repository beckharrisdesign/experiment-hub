/**
 * Single source of truth for subscription tiers.
 * Used by landing, pricing page, and profile.
 *
 * One free tier + one paid tier, billed yearly at a single price.
 */

export const TIER_ORDER = ["Seed Stash Starter", "Home Garden"] as const;
export type TierName = (typeof TIER_ORDER)[number];

export interface TierPlan {
  id: TierName;
  seeds: string;
  ai: string;
  /** Display price, e.g. 'Free' or '$15/year'. */
  price: string;
  /** Stripe price ID for the paid plan (yearly). Undefined for the free tier. */
  priceId?: string;
}

export const PLANS: TierPlan[] = [
  {
    id: "Seed Stash Starter",
    seeds: "50",
    ai: "10/month",
    price: "Free",
  },
  {
    id: "Home Garden",
    seeds: "Unlimited",
    ai: "50/month",
    price: "$15/year",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY,
  },
];

const LEGACY_PAID_TIERS = new Set(["Serious Hobby", "Paid"]);

/** Map any legacy or unknown tier string to a canonical TierName. */
export function normalizeTier(tier: string): TierName {
  if (LEGACY_PAID_TIERS.has(tier)) return "Home Garden";
  return TIER_ORDER.includes(tier as TierName)
    ? (tier as TierName)
    : "Seed Stash Starter";
}

export function getTierIndex(tier: string): number {
  return TIER_ORDER.indexOf(normalizeTier(tier));
}

export function getUpgradeTiers(currentTier: string): TierPlan[] {
  const idx = getTierIndex(currentTier);
  return PLANS.filter((_, i) => i > idx);
}

export function getDowngradeTiers(currentTier: string): TierPlan[] {
  const idx = getTierIndex(currentTier);
  return PLANS.filter((_, i) => i < idx);
}

/** Build a map of Stripe price ID → tier name from env vars. */
export function buildPriceToTierMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const plan of PLANS) {
    if (plan.priceId) map[plan.priceId] = plan.id;
  }
  return map;
}
