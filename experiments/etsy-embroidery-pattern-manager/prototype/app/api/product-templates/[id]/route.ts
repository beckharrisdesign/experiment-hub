import { NextRequest, NextResponse } from 'next/server';
import { getProductTemplate, updateProductTemplate, deleteProductTemplate } from '@/lib/product-templates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const productTemplate = getProductTemplate(resolvedParams.id);
    if (!productTemplate) {
      return NextResponse.json({ error: 'Product template not found' }, { status: 404 });
    }
    return NextResponse.json(productTemplate);
  } catch (error) {
    console.error('Error fetching product template:', error);
    return NextResponse.json({ error: 'Failed to fetch product template' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const updated = updateProductTemplate(resolvedParams.id, body);
    
    if (!updated) {
      return NextResponse.json({ error: 'Product template not found' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating product template:', error);
    return NextResponse.json({ error: 'Failed to update product template' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const deleted = deleteProductTemplate(resolvedParams.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Product template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product template:', error);
    return NextResponse.json({ error: 'Failed to delete product template' }, { status: 500 });
  }
}

