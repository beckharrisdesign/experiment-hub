import { NextRequest, NextResponse } from 'next/server';
import { extractWithAI } from '@/lib/packetReaderAI';
import sharp from 'sharp';

/**
 * Compress and resize image for OpenAI API
 * OpenAI Vision API works best with images under 20MB, but we'll optimize to ~1-2MB
 */
async function optimizeImage(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Resize to max 2048px on longest side and compress to JPEG with quality 85
  // This should reduce 50MB images to ~500KB-2MB
  const optimizedBuffer = await sharp(buffer)
    .resize(2048, 2048, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  
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
    console.log(`[API] Optimizing images... Original sizes: front=${(frontImage.size / 1024 / 1024).toFixed(2)}MB, back=${backImage ? (backImage.size / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}`);
    const optimizedFront = await optimizeImage(frontImage);
    const optimizedBack = backImage ? await optimizeImage(backImage) : undefined;
    console.log(`[API] Optimized sizes: front=${(optimizedFront.size / 1024 / 1024).toFixed(2)}MB, back=${optimizedBack ? (optimizedBack.size / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}`);

    // Process the optimized images with AI
    const extractedData = await extractWithAI(
      optimizedFront,
      optimizedBack,
      apiKey
    );

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

