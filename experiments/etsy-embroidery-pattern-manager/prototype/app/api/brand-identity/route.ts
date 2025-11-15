import { NextRequest, NextResponse } from 'next/server';
import { createBrandIdentity, getBrandIdentity, updateBrandIdentity } from '@/lib/brand-identity';
import { BrandIdentity } from '@/types';

export async function GET() {
  try {
    const brandIdentity = getBrandIdentity();
    return NextResponse.json(brandIdentity);
  } catch (error) {
    console.error('Error fetching brand identity:', error);
    return NextResponse.json({ error: 'Failed to fetch brand identity' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const existing = getBrandIdentity();
    
    let brandIdentity: BrandIdentity;
    if (existing) {
      // Update existing brand identity
      brandIdentity = updateBrandIdentity(existing.id, {
        storeName: body.storeName,
        brandTone: body.brandTone,
        creativeDirection: body.creativeDirection,
      }) || existing;
    } else {
      // Create new brand identity
      brandIdentity = createBrandIdentity({
        storeName: body.storeName,
        brandTone: body.brandTone,
        creativeDirection: body.creativeDirection,
      });
    }
    
    return NextResponse.json(brandIdentity);
  } catch (error) {
    console.error('Error saving brand identity:', error);
    return NextResponse.json({ error: 'Failed to save brand identity' }, { status: 500 });
  }
}

