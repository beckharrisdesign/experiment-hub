import { NextRequest, NextResponse } from 'next/server';
import { processPacketImages, ExtractedSeedData } from '@/lib/packetReader';

/**
 * API route to process seed packet images
 * POST /api/packet/read
 * 
 * Body: FormData with:
 * - frontImage: File (image file)
 * - backImage?: File (optional image file)
 */
export async function POST(request: NextRequest) {
  try {
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

