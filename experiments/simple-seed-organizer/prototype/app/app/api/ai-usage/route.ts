import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAiUsage } from '@/lib/ai-usage';

/**
 * GET /api/ai-usage
 * Returns the current month's AI completion count for the authenticated user.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ completions: 0 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const completions = await getAiUsage(supabase, user.id);
  return NextResponse.json({ completions });
}
