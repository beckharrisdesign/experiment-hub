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
 */
export async function incrementAiUsage(
  supabase: SupabaseClient,
  userId: string,
  count: number = 1
): Promise<number> {
  const period = getCurrentPeriod();
  const { data, error } = await supabase.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_period: period,
    p_count: count,
  });
  if (error) {
    console.error('[ai-usage] increment error:', error);
    throw error;
  }
  return data as number;
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
