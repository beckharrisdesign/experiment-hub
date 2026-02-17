import { NextRequest, NextResponse } from 'next/server';
import { extractSingleImageWithAI } from '@/lib/packetReaderAI';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { incrementAiUsage } from '@/lib/ai-usage';

/**
 * API route to process a single seed packet image (front or back) using AI.
 * Used for parallel extraction - call separately for front and back.
 *
 * POST /api/packet/read-ai-single
 *
 * Body: FormData with:
 * - image: File (required)
 * - side: 'front' | 'back' (required)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const side = formData.get('side') as string | null;

    if (!image || !side) {
      return NextResponse.json(
        { error: 'image and side are required' },
        { status: 400 }
      );
    }

    if (side !== 'front' && side !== 'back') {
      return NextResponse.json(
        { error: 'side must be "front" or "back"' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    const extractedData = await extractSingleImageWithAI(
      image,
      side as 'front' | 'back',
      apiKey
    );

    // 1 completion per image
    if (supabase) {
      await incrementAiUsage(supabase, user.id, 1);
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (error) {
    console.error('Error processing single packet image with AI:', error);
    return NextResponse.json(
      {
        error: 'Failed to process image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
