import { NextRequest, NextResponse } from 'next/server';
import { getAllPatterns, createPattern } from '@/lib/patterns';

export async function GET() {
  try {
    const patterns = getAllPatterns();
    return NextResponse.json(patterns);
  } catch (error) {
    console.error('Error fetching patterns:', error);
    return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pattern = createPattern(body);
    return NextResponse.json(pattern);
  } catch (error) {
    console.error('Error creating pattern:', error);
    return NextResponse.json({ error: 'Failed to create pattern' }, { status: 500 });
  }
}

