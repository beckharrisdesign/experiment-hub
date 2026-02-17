/**
 * Single source of truth for subscription tiers.
 * Used by landing, pricing page, and profile.
 */

export const TIER_ORDER = ['Seed Stash Starter', 'Home Garden', 'Serious Hobby'] as const;
export type TierName = (typeof TIER_ORDER)[number];

export interface TierPlan {
  id: TierName;
  seeds: string;
  ai: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyDiscount: string;
  priceIds: { monthly?: string; yearly?: string };
}

export const PLANS: TierPlan[] = [
  {
    id: 'Seed Stash Starter',
    seeds: '50',
    ai: '5/month',
    monthlyPrice: 'Free',
    yearlyPrice: 'Free',
    yearlyDiscount: '',
    priceIds: {},
  },
  {
    id: 'Home Garden',
    seeds: '300',
    ai: '20/month',
    monthlyPrice: '$5',
    yearlyPrice: '$49',
    yearlyDiscount: '18% off',
    priceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_MONTHLY,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY,
    },
  },
  {
    id: 'Serious Hobby',
    seeds: 'Unlimited',
    ai: 'Unlimited',
    monthlyPrice: '$15',
    yearlyPrice: '$144',
    yearlyDiscount: '20% off',
    priceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_MONTHLY,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_YEARLY,
    },
  },
];

export function getTierIndex(tier: string): number {
  const i = TIER_ORDER.indexOf(tier as TierName);
  return i >= 0 ? i : 0;
}

export function getUpgradeTiers(currentTier: string): TierPlan[] {
  const idx = getTierIndex(currentTier);
  return PLANS.filter((_, i) => i > idx);
}

export function getDowngradeTiers(currentTier: string): TierPlan[] {
  const idx = getTierIndex(currentTier);
  return PLANS.filter((_, i) => i < idx);
}
