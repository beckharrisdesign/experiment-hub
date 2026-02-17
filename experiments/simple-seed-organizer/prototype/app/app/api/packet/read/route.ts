import { NextRequest, NextResponse } from 'next/server';
import { processPacketImages } from '@/lib/packetReader';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * API route to process seed packet images (OCR, no AI)
 * POST /api/packet/read
 *
 * Body: FormData with:
 * - frontImage: File (image file)
 * - backImage?: File (optional image file)
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

    const rl = rateLimit(`ocr:${user.id}`, { windowMs: 60_000, max: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Please wait a moment before trying again.' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : {} }
      );
    }

    const formData = await request.formData();
    const frontImage = formData.get('frontImage') as File | null;
    const backImage = formData.get('backImage') as File | null;

    if (!frontImage) {
      return NextResponse.json(
        { error: 'frontImage is required' },
        { status: 400 }
      );
    }

    // Process the images
    const extractedData = await processPacketImages(
      frontImage,
      backImage || undefined
    );

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (error) {
    console.error('Error processing packet images:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process images',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

