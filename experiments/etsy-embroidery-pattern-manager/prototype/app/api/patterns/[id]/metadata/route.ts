import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getImageMetadata, formatFileSize } from '@/lib/image-metadata';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const patternId = resolvedParams.id;
    
    // Get pattern to find image URL
    const { getPattern } = await import('@/lib/patterns');
    const pattern = getPattern(patternId);
    
    if (!pattern || !pattern.imageUrl) {
      return NextResponse.json({ 
        error: 'Pattern not found or has no image' 
      }, { status: 404 });
    }
    
    // Convert URL path to file system path
    const imagePath = path.join(process.cwd(), 'public', pattern.imageUrl);
    console.log('[API /patterns/[id]/metadata] Pattern imageUrl:', pattern.imageUrl);
    console.log('[API /patterns/[id]/metadata] Resolved imagePath:', imagePath);
    
    // Get image metadata
    const metadata = await getImageMetadata(imagePath);
    console.log('[API /patterns/[id]/metadata] Metadata result:', metadata);
    
    if (!metadata) {
      return NextResponse.json({ 
        error: 'Could not read image metadata' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      ...metadata,
      formattedSize: metadata.fileSize ? formatFileSize(metadata.fileSize) : undefined,
    });
  } catch (error) {
    console.error('[API /patterns/[id]/metadata] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get image metadata',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

