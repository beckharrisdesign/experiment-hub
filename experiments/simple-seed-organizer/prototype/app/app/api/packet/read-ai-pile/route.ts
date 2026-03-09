import { NextRequest, NextResponse } from 'next/server';
import { extractMultipleFromImage } from '@/lib/packetReaderAI';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { incrementAiUsage, getAiUsage } from '@/lib/ai-usage';
import { canUseAICount } from '@/lib/limits';
import { getTierForUser } from '@/lib/tier';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/packet/read-ai-pile
 *
 * Accepts a single photo of multiple seed packets and returns one
 * AIExtractedData entry per recognizable packet.
 *
 * Counts as 1 AI completion regardless of how many packets are found.
 *
 * Body: FormData with:
 * - image: File (required)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`ai:${user.id}`, { windowMs: 60_000, max: 30 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Please wait a moment before trying again.' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : {} }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    if (!image) {
      return NextResponse.json({ error: 'image is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    const tier = await getTierForUser(user.id, supabase, user.email ?? undefined);
    const aiCompletions = await getAiUsage(supabase, user.id);
    if (!canUseAICount(aiCompletions, tier, 1)) {
      return NextResponse.json(
        { error: 'AI limit reached', message: 'Upgrade to use more AI extractions this month.' },
        { status: 402 }
      );
    }

    const seeds = await extractMultipleFromImage(image, apiKey);

    try {
      await incrementAiUsage(supabase, user.id, 1);
    } catch (e) {
      console.warn('[read-ai-pile] Usage increment failed:', e);
    }

    return NextResponse.json({
      success: true,
      seeds,
      count: seeds.length,
    });
  } catch (error) {
    console.error('Error processing pile photo with AI:', error);
    return NextResponse.json(
      {
        error: 'Failed to process image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
