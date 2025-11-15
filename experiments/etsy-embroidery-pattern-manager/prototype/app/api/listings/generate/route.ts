import { NextRequest, NextResponse } from 'next/server';
import { generateListing } from '@/lib/listings';
import { getPattern } from '@/lib/patterns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patternId } = body;

    if (!patternId) {
      return NextResponse.json({ error: 'Pattern ID is required' }, { status: 400 });
    }

    const pattern = getPattern(patternId);
    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    const listing = await generateListing(patternId, pattern.name);
    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error generating listing:', error);
    return NextResponse.json({ error: 'Failed to generate listing' }, { status: 500 });
  }
}

