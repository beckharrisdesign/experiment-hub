import { NextRequest, NextResponse } from 'next/server';
import { getAllProductTemplates, createProductTemplate } from '@/lib/product-templates';

export async function GET() {
  try {
    const productTemplates = getAllProductTemplates();
    return NextResponse.json(productTemplates);
  } catch (error) {
    console.error('Error fetching product templates:', error);
    return NextResponse.json({ error: 'Failed to fetch product templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productTemplate = createProductTemplate(body);
    return NextResponse.json(productTemplate);
  } catch (error: any) {
    console.error('Error creating product template:', error);
    console.error('Error details:', error?.message, error?.stack);
    return NextResponse.json({ 
      error: 'Failed to create product template',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

