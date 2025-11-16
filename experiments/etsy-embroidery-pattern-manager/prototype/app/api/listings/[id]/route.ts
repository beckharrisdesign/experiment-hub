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

