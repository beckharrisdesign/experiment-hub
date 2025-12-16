import { NextRequest, NextResponse } from 'next/server';
import { getAllProductTemplates } from '@/lib/product-templates';
import { getAllPatterns } from '@/lib/patterns';
import { getBrandIdentity } from '@/lib/brand-identity';

export async function POST(request: NextRequest) {
  console.log('[bulk-generate] Request received');
  try {
    // Lazy import generateListing to avoid module evaluation errors
    const { generateListing } = await import('@/lib/listings');
    const body = await request.json();
    console.log('[bulk-generate] Request body:', body);
    const { templateName } = body;

    if (!templateName) {
      console.log('[bulk-generate] Missing templateName');
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    // Check if brand identity is set
    const brandIdentity = getBrandIdentity();
    if (!brandIdentity) {
      console.log('[bulk-generate] Brand identity not set');
      return NextResponse.json({ 
        error: 'Brand identity must be set before generating listings. Please set your brand identity first.' 
      }, { status: 400 });
    }
    console.log('[bulk-generate] Brand identity found:', brandIdentity.storeName);

    // Find the template by name
    const allTemplates = getAllProductTemplates();
    console.log('[bulk-generate] All templates:', allTemplates.map(t => t.name));
    const template = allTemplates.find((t) => 
      t.name.toLowerCase().includes(templateName.toLowerCase())
    );

    if (!template) {
      console.log('[bulk-generate] Template not found:', templateName);
      return NextResponse.json({ 
        error: `Template "${templateName}" not found. Available templates: ${allTemplates.map(t => t.name).join(', ') || 'none'}` 
      }, { status: 404 });
    }
    console.log('[bulk-generate] Template found:', template.name, 'ID:', template.id);

    // Verify it's a single-item template
    if (template.numberOfItems !== 'single') {
      return NextResponse.json({ 
        error: `Template "${template.name}" is not a single-item template. It requires ${template.numberOfItems} items.` 
      }, { status: 400 });
    }

    // Get all patterns - any pattern can be used with any template
    const allPatterns = getAllPatterns();
    console.log('[bulk-generate] Total patterns:', allPatterns.length);

    if (allPatterns.length === 0) {
      console.log('[bulk-generate] No patterns in database');
      return NextResponse.json({ 
        error: `No patterns available. Please create patterns first.` 
      }, { status: 400 });
    }

    // Generate listings for each pattern
    const results = [];
    const errors = [];

    console.log('[bulk-generate] Starting generation for', allPatterns.length, 'patterns');
    for (const pattern of allPatterns) {
      try {
        console.log('[bulk-generate] Generating listing for pattern:', pattern.name);
        const listing = await generateListing(template.id, [pattern.id]);
        console.log('[bulk-generate] Successfully generated listing:', listing.title);
        results.push({
          patternId: pattern.id,
          patternName: pattern.name,
          listingId: listing.id,
          listingTitle: listing.title,
          success: true,
        });
      } catch (error: any) {
        console.error('[bulk-generate] Error generating listing for pattern', pattern.name, ':', error);
        errors.push({
          patternId: pattern.id,
          patternName: pattern.name,
          error: error.message || 'Failed to generate listing',
          success: false,
        });
      }
    }

    console.log('[bulk-generate] Generation complete. Successful:', results.length, 'Failed:', errors.length);
    return NextResponse.json({
      templateId: template.id,
      templateName: template.name,
      totalPatterns: allPatterns.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error: any) {
    console.error('Error bulk generating listings:', error);
    const errorMessage = error?.message || String(error) || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json({ 
      error: errorMessage,
      details: errorStack ? 'Check server logs for details' : undefined
    }, { status: 500 });
  }
}

