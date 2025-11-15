import { NextRequest, NextResponse } from 'next/server';
import { updatePattern, getPattern, deletePattern } from '@/lib/patterns';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pattern = getPattern(params.id);
    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }
    return NextResponse.json(pattern);
  } catch (error) {
    console.error('Error fetching pattern:', error);
    return NextResponse.json({ error: 'Failed to fetch pattern' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const pattern = updatePattern(params.id, body);
    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }
    return NextResponse.json(pattern);
  } catch (error) {
    console.error('Error updating pattern:', error);
    return NextResponse.json({ error: 'Failed to update pattern' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = deletePattern(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pattern:', error);
    return NextResponse.json({ error: 'Failed to delete pattern' }, { status: 500 });
  }
}

