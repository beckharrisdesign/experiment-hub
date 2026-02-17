import { NextRequest, NextResponse } from 'next/server';
import { extractWithAI } from '@/lib/packetReaderAI';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { incrementAiUsage } from '@/lib/ai-usage';
import sharp from 'sharp';

/**
 * Compress and resize image for OpenAI API
 * OpenAI Vision API works best with images under 20MB, but we'll optimize to ~200-500KB for faster processing
 * 
 * For text extraction, 1024px is usually sufficient and much faster than 2048px
 */
async function optimizeImage(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Get original image metadata
  const metadata = await sharp(buffer).metadata();
  const originalSize = file.size;
  const originalDimensions = `${metadata.width}x${metadata.height}`;
  
  // Resize to max 1024px on longest side and compress to JPEG with quality 80
  // This should reduce large images to ~200-500KB while maintaining text readability
  const optimizedBuffer = await sharp(buffer)
    .resize(1024, 1024, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  
  const optimizedSize = optimizedBuffer.length;
  const optimizedMetadata = await sharp(optimizedBuffer).metadata();
  const optimizedDimensions = `${optimizedMetadata.width}x${optimizedMetadata.height}`;
  
  console.log(`[Image Optimization] ${file.name}: ${originalDimensions} ${(originalSize / 1024).toFixed(0)}KB → ${optimizedDimensions} ${(optimizedSize / 1024).toFixed(0)}KB (${((1 - optimizedSize / originalSize) * 100).toFixed(1)}% reduction)`);
  
  // Create a new File with optimized data
  return new File([optimizedBuffer], file.name.replace(/\.png$/i, '.jpg'), {
    type: 'image/jpeg'
  });
}

/**
 * API route to process seed packet images using AI
 * POST /api/packet/read-ai
 * 
 * Body: FormData with:
 * - frontImage: File (image file)
 * - backImage?: File (optional image file)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    // Optimize images before processing (this will dramatically reduce processing time)
    console.log(`[API] Received images - Front: ${(frontImage.size / 1024).toFixed(0)}KB, Back: ${backImage ? (backImage.size / 1024).toFixed(0) + 'KB' : 'N/A'}`);
    const optimizedFront = await optimizeImage(frontImage);
    const optimizedBack = backImage ? await optimizeImage(backImage) : undefined;
    console.log(`[API] Optimized - Front: ${(optimizedFront.size / 1024).toFixed(0)}KB, Back: ${optimizedBack ? (optimizedBack.size / 1024).toFixed(0) + 'KB' : 'N/A'}`);

    // Process the optimized images with AI
    const extractedData = await extractWithAI(
      optimizedFront,
      optimizedBack,
      apiKey
    );

    // Count completions: 1 per image (front=1, back=1)
    const completionCount = backImage ? 2 : 1;
    if (supabase) {
      await incrementAiUsage(supabase, user.id, completionCount);
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (error) {
    console.error('Error processing packet images with AI:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process images',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

