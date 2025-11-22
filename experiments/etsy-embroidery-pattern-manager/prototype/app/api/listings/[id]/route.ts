import { NextRequest, NextResponse } from 'next/server';
import { updateListing, getListing } from '@/lib/listings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const listing = getListing(resolvedParams.id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  console.log('[API /listings/[id] PATCH] Request received');
  try {
    const resolvedParams = await Promise.resolve(params);
    const listingId = resolvedParams.id;
    console.log('[API /listings/[id] PATCH] Listing ID:', listingId);
    
    const body = await request.json();
    console.log('[API /listings/[id] PATCH] Request body keys:', Object.keys(body));
    console.log('[API /listings/[id] PATCH] Request body:', body);
    
    // REQUIREMENT: Each listing must have both a pattern and a template
    // Validate that if patternIds is being updated, it's not empty
    if (body.patternIds !== undefined) {
      if (!Array.isArray(body.patternIds) || body.patternIds.length === 0) {
        console.log('[API /listings/[id] PATCH] Error: patternIds must be a non-empty array');
        return NextResponse.json({ 
          error: 'A listing must have at least one pattern. Cannot remove all patterns.' 
        }, { status: 400 });
      }
    }
    
    // Validate that productTemplateId is not being removed
    if (body.productTemplateId !== undefined && !body.productTemplateId) {
      console.log('[API /listings/[id] PATCH] Error: productTemplateId cannot be removed');
      return NextResponse.json({ 
        error: 'A listing must have a product template. Cannot remove the template.' 
      }, { status: 400 });
    }
    
    const updated = updateListing(listingId, body);
    console.log('[API /listings/[id] PATCH] Update result:', updated ? 'Success' : 'Not found');
    
    if (!updated) {
      console.log('[API /listings/[id] PATCH] Error: Listing not found');
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    console.log('[API /listings/[id] PATCH] Updated listing:', {
      id: updated.id,
      title: updated.title,
      productTemplateId: updated.productTemplateId,
      patternIds: updated.patternIds,
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API /listings/[id] PATCH] Error updating listing:', error);
    console.error('[API /listings/[id] PATCH] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Failed to update listing',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

