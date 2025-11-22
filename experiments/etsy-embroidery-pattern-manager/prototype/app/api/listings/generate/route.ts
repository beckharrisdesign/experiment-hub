import { NextRequest, NextResponse } from 'next/server';
import { generateListing } from '@/lib/listings';
import { getProductTemplate } from '@/lib/product-templates';
import { getPattern } from '@/lib/patterns';

export async function POST(request: NextRequest) {
  console.log('[API /listings/generate] Request received');
  try {
    const body = await request.json();
    console.log('[API /listings/generate] Request body:', body);
    const { productTemplateId, patternIds } = body;

    console.log('[API /listings/generate] Product template ID:', productTemplateId);
    console.log('[API /listings/generate] Pattern IDs:', patternIds);

    if (!productTemplateId) {
      console.log('[API /listings/generate] Error: Product template ID is required');
      return NextResponse.json({ error: 'Product template ID is required' }, { status: 400 });
    }

    const productTemplate = getProductTemplate(productTemplateId);
    console.log('[API /listings/generate] Product template found:', productTemplate ? productTemplate.name : 'NOT FOUND');
    if (!productTemplate) {
      console.log('[API /listings/generate] Error: Product template not found');
      return NextResponse.json({ error: 'Product template not found' }, { status: 404 });
    }

    console.log('[API /listings/generate] Template details:', {
      id: productTemplate.id,
      name: productTemplate.name,
      numberOfItems: productTemplate.numberOfItems,
      types: productTemplate.types,
    });

    // patternIds must be provided - any pattern can be used with any template
    if (!patternIds || patternIds.length === 0) {
      console.log('[API /listings/generate] Error: No pattern IDs provided');
      return NextResponse.json({ error: 'At least one pattern must be selected' }, { status: 400 });
    }

    // Validate that selected patterns match the template's numberOfItems
    const expectedCount = productTemplate.numberOfItems === 'single' ? 1 
      : productTemplate.numberOfItems === 'three' ? 3 
      : 5;
    
    console.log('[API /listings/generate] Expected pattern count:', expectedCount);
    console.log('[API /listings/generate] Actual pattern count:', patternIds.length);
    
    if (patternIds.length !== expectedCount) {
      console.log('[API /listings/generate] Error: Pattern count mismatch');
      return NextResponse.json({ 
        error: `Template requires ${expectedCount} pattern(s), but ${patternIds.length} were selected` 
      }, { status: 400 });
    }

    const selectedPatternIds = patternIds;
    console.log('[API /listings/generate] Calling generateListing with:', {
      productTemplateId,
      selectedPatternIds,
    });

    const listing = await generateListing(productTemplateId, selectedPatternIds);
    console.log('[API /listings/generate] Listing generated successfully:', {
      id: listing.id,
      title: listing.title,
      productTemplateId: listing.productTemplateId,
      patternIds: listing.patternIds,
    });
    
    return NextResponse.json(listing);
  } catch (error) {
    console.error('[API /listings/generate] Error generating listing:', error);
    console.error('[API /listings/generate] Error type:', error?.constructor?.name);
    console.error('[API /listings/generate] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[API /listings/generate] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Ensure we always return a proper error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      error: 'Failed to generate listing',
      details: errorMessage,
      ...(error instanceof Error && error.stack ? { stack: error.stack.split('\n').slice(0, 5) } : {}),
    };
    
    console.error('[API /listings/generate] Returning error response:', errorDetails);
    return NextResponse.json(errorDetails, { status: 500 });
  }
}

