/**
 * Plan limits (gates) - parameterized for easy tweaking.
 * Override via env vars if needed, e.g.:
 *   NEXT_PUBLIC_LIMIT_SEEDS_STARTER=50
 *   NEXT_PUBLIC_LIMIT_AI_STARTER=50
 */

import { normalizeTier } from "./plans";

export type TierName = "Seed Stash Starter" | "Home Garden";

export interface TierLimits {
  seedLimit: number | null; // null = unlimited
  aiLimit: number | null; // null = unlimited, per month
}

const DEFAULT_LIMITS: Record<TierName, TierLimits> = {
  "Seed Stash Starter": { seedLimit: 50, aiLimit: 10 },
  "Home Garden": { seedLimit: null, aiLimit: 50 },
};

function parseEnvInt(key: string): number | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[key];
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

const TIER_ENV_SUFFIX: Record<string, string> = {
  "Seed Stash Starter": "STARTER",
  "Home Garden": "HOME_GARDEN",
};

function getLimits(tier: string): TierLimits {
  const resolvedTier = normalizeTier(tier);
  const defaults = DEFAULT_LIMITS[resolvedTier];
  const suffix = TIER_ENV_SUFFIX[resolvedTier];
  const envSeeds = suffix
    ? parseEnvInt(`NEXT_PUBLIC_LIMIT_SEEDS_${suffix}`)
    : undefined;
  const envAi = suffix
    ? parseEnvInt(`NEXT_PUBLIC_LIMIT_AI_${suffix}`)
    : undefined;
  return {
    seedLimit: envSeeds !== undefined ? envSeeds : defaults.seedLimit,
    aiLimit: envAi !== undefined ? envAi : defaults.aiLimit,
  };
}

/** Can the user add another seed? */
export function canAddSeed(seedCount: number, tier: string): boolean {
  const { seedLimit } = getLimits(tier);
  if (seedLimit === null) return true;
  return seedCount < seedLimit;
}

/** Can the user use AI extraction (has remaining completions this month)? */
export function canUseAI(aiCompletions: number, tier: string): boolean {
  return canUseAICount(aiCompletions, tier, 1);
}

/** Can the user use `count` more AI completions this month? */
export function canUseAICount(
  aiCompletions: number,
  tier: string,
  count: number,
): boolean {
  const { aiLimit } = getLimits(tier);
  if (aiLimit === null) return true;
  return aiCompletions + count <= aiLimit;
}

/** Get limits for a tier (for display). */
export function getTierLimits(tier: string): TierLimits {
  return getLimits(tier);
}
