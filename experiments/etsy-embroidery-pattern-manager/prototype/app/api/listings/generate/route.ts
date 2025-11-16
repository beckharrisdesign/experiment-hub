import { NextRequest, NextResponse } from 'next/server';
import { generateListing } from '@/lib/listings';
import { getProductTemplate } from '@/lib/product-templates';
import { getPattern } from '@/lib/patterns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productTemplateId, patternIds } = body;

    if (!productTemplateId) {
      return NextResponse.json({ error: 'Product template ID is required' }, { status: 400 });
    }

    const productTemplate = getProductTemplate(productTemplateId);
    if (!productTemplate) {
      return NextResponse.json({ error: 'Product template not found' }, { status: 404 });
    }

    // Determine which patterns to use
    let selectedPatternIds: string[];
    
    if (patternIds && patternIds.length > 0) {
      // Use provided patternIds
      selectedPatternIds = patternIds;
    } else {
      // No patternIds provided - use all patterns from template if single, otherwise require selection
      const expectedCount = productTemplate.numberOfItems === 'single' ? 1 
        : productTemplate.numberOfItems === 'three' ? 3 
        : 5;
      
      if (expectedCount === 1 && productTemplate.patternIds.length === 1) {
        // Single item template with one pattern - use it automatically
        selectedPatternIds = productTemplate.patternIds;
      } else {
        // Multiple items required - patternIds must be provided
        return NextResponse.json({ 
          error: `This template requires ${expectedCount} pattern(s). Please select which patterns to include.` 
        }, { status: 400 });
      }
    }

    if (selectedPatternIds.length === 0) {
      return NextResponse.json({ error: 'At least one pattern must be selected' }, { status: 400 });
    }

    // Validate that selected patterns match the template's numberOfItems
    const expectedCount = productTemplate.numberOfItems === 'single' ? 1 
      : productTemplate.numberOfItems === 'three' ? 3 
      : 5;
    
    if (selectedPatternIds.length !== expectedCount) {
      return NextResponse.json({ 
        error: `Template requires ${expectedCount} pattern(s), but ${selectedPatternIds.length} were selected` 
      }, { status: 400 });
    }

    // Validate that all selected patterns are in the template's available patterns
    const invalidPatterns = selectedPatternIds.filter(id => !productTemplate.patternIds.includes(id));
    if (invalidPatterns.length > 0) {
      return NextResponse.json({ 
        error: `Some selected patterns are not available in this template` 
      }, { status: 400 });
    }

    const listing = await generateListing(productTemplateId, selectedPatternIds);
    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error generating listing:', error);
    return NextResponse.json({ error: 'Failed to generate listing' }, { status: 500 });
  }
}

