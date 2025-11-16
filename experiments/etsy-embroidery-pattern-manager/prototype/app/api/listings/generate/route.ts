import { NextRequest, NextResponse } from 'next/server';
import { generateListing } from '@/lib/listings';
import { getProductTemplate } from '@/lib/product-templates';
import { getPattern } from '@/lib/patterns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productTemplateId } = body;

    if (!productTemplateId) {
      return NextResponse.json({ error: 'Product template ID is required' }, { status: 400 });
    }

    const productTemplate = getProductTemplate(productTemplateId);
    if (!productTemplate) {
      return NextResponse.json({ error: 'Product template not found' }, { status: 404 });
    }

    if (productTemplate.patternIds.length === 0) {
      return NextResponse.json({ error: 'Product template must have at least one pattern associated' }, { status: 400 });
    }

    // Get pattern names for listing generation
    const patternNames = productTemplate.patternIds.map(id => {
      const pattern = getPattern(id);
      return pattern?.name || id;
    });

    const listing = await generateListing(productTemplateId, patternNames);
    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error generating listing:', error);
    return NextResponse.json({ error: 'Failed to generate listing' }, { status: 500 });
  }
}

