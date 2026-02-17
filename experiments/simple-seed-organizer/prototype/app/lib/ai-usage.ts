/**
 * AI completion usage tracking.
 * Each API call to extract an image counts as 1 completion.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Increment AI completions for the current month.
 * Call after successful AI extraction.
 * Uses RPC if available; falls back to direct table ops when function not found (migration not run).
 */
export async function incrementAiUsage(
  supabase: SupabaseClient,
  userId: string,
  count: number = 1
): Promise<number> {
  const period = getCurrentPeriod();

  // Try RPC first (requires migration 004_ai_usage.sql)
  const { data: rpcData, error: rpcError } = await supabase.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_period: period,
    p_count: count,
  });
  if (!rpcError) return rpcData as number;

  // PGRST202 = function not found (migration not run or schema cache stale)
  if (rpcError.code === 'PGRST202') {
    return incrementAiUsageFallback(supabase, userId, period, count);
  }

  console.error('[ai-usage] increment error:', rpcError);
  throw rpcError;
}

/**
 * Fallback when increment_ai_usage RPC is not available.
 * Run migration 004_ai_usage.sql and NOTIFY pgrst, 'reload schema' for atomic increments.
 */
async function incrementAiUsageFallback(
  supabase: SupabaseClient,
  userId: string,
  period: string,
  count: number
): Promise<number> {
  const { data: existing } = await supabase
    .from('ai_usage')
    .select('completions')
    .eq('user_id', userId)
    .eq('period', period)
    .maybeSingle();

  const newCount = (existing?.completions ?? 0) + count;
  const { error } = await supabase.from('ai_usage').upsert(
    {
      user_id: userId,
      period,
      completions: newCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,period' }
  );
  if (error) {
    console.error('[ai-usage] fallback increment error:', error);
    throw error;
  }
  return newCount;
}

/**
 * Get AI completion count for a user in a period.
 * Defaults to current month.
 */
export async function getAiUsage(
  supabase: SupabaseClient,
  userId: string,
  period?: string
): Promise<number> {
  const p = period ?? getCurrentPeriod();
  const { data, error } = await supabase
    .from('ai_usage')
    .select('completions')
    .eq('user_id', userId)
    .eq('period', p)
    .maybeSingle();
  if (error) {
    console.error('[ai-usage] get error:', error);
    return 0;
  }
  return data?.completions ?? 0;
}
