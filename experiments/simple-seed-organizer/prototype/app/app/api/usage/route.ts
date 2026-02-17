import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAiUsage } from '@/lib/ai-usage';
import { canAddSeed, canUseAI, getTierLimits } from '@/lib/limits';
import { getSubscriptionInfo, getFirstOfNextMonth } from '@/lib/tier';

async function getSeedCountForUser(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('seeds')
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}

/**
 * GET /api/usage
 * Returns tier, counts, and gate flags for the authenticated user.
 * Use for Add button, Auto Entry visibility, etc.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tier, currentPeriodEnd } = await getSubscriptionInfo(user.email ?? undefined);
  const resetsAt = currentPeriodEnd ?? getFirstOfNextMonth();

  const [seedCount, aiCompletions] = await Promise.all([
    getSeedCountForUser(supabase),
    getAiUsage(supabase, user.id),
  ]);

  const { seedLimit } = getTierLimits(tier);
  const overSeedLimit = seedLimit !== null && seedCount > seedLimit;

  return NextResponse.json({
    tier,
    seedCount,
    aiCompletions,
    seedLimit,
    overSeedLimit,
    canAddSeed: canAddSeed(seedCount, tier),
    canUseAI: canUseAI(aiCompletions, tier),
    resetsAt,
  });
}
