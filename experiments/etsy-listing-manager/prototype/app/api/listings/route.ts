import { NextRequest, NextResponse } from 'next/server';
import { getAllListings } from '@/lib/listings';

export async function GET() {
  try {
    const listings = getAllListings();
    return NextResponse.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

