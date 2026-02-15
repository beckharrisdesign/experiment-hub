import db from './db';
import { Listing, Pattern, Template, BrandIdentity } from '@/types';
import { randomUUID } from 'crypto';
import { getBrandIdentity } from './brand-identity';
import { getPattern } from './patterns';
import { getProductTemplate } from './product-templates';

export function getAllListings(): Listing[] {
  const rows = db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all() as any[];
  const listings: Listing[] = [];
  
  for (const row of rows) {
    // Get pattern IDs from listing_patterns junction table
    const patternRows = db.prepare('SELECT pattern_id FROM listing_patterns WHERE listing_id = ?').all(row.id) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    // REQUIREMENT: Each listing must have both a pattern and a template
    // Filter out invalid listings that don't meet this requirement
    if (patternIds.length === 0 || !row.product_template_id) {
      console.warn(`[getAllListings] Invalid listing ${row.id}: missing pattern or template. Pattern IDs: ${patternIds.length}, Template ID: ${row.product_template_id || 'missing'}`);
      continue;
    }
    
    listings.push({
      id: row.id,
      templateId: row.product_template_id,
      patternIds,
      title: row.title,
      description: row.description,
      tags: row.tags ? JSON.parse(row.tags) : [],
      category: row.category || undefined,
      price: row.price || undefined,
      quantity: row.quantity || undefined,
      sku: row.sku || undefined,
      photos: row.photos ? JSON.parse(row.photos) : undefined,
      digitalFiles: row.digital_files ? JSON.parse(row.digital_files) : undefined,
      digitalNote: row.digital_note || undefined,
      offerPersonalization: row.offer_personalization === 1,
      personalizationOptions: row.personalization_options ? JSON.parse(row.personalization_options) : undefined,
      attributes: row.attributes ? JSON.parse(row.attributes) : undefined,
      materials: row.materials ? JSON.parse(row.materials) : undefined,
      processingTime: row.processing_time || undefined,
      shippingProfileId: row.shipping_profile_id || undefined,
      returnsAccepted: row.returns_accepted === 1,
      shopSectionId: row.shop_section_id || undefined,
      featured: row.featured === 1,
      renewalOption: (row.renewal_option || 'automatic') as 'automatic' | 'manual',
      seoScore: row.seo_score || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  
  return listings;
}

export function getListing(id: string): Listing | null {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as any;
  if (!row) return null;

  // Get pattern IDs from listing_patterns junction table
  const patternRows = db.prepare('SELECT pattern_id FROM listing_patterns WHERE listing_id = ?').all(id) as any[];
  const patternIds = patternRows.map((p: any) => p.pattern_id);

  // REQUIREMENT: Each listing must have both a pattern and a template
  if (patternIds.length === 0 || !row.product_template_id) {
    console.warn(`[getListing] Invalid listing ${id}: missing pattern or template. Pattern IDs: ${patternIds.length}, Template ID: ${row.product_template_id || 'missing'}`);
    return null;
  }

  return {
    id: row.id,
    templateId: row.product_template_id || row.product_id, // Support migration
    patternIds,
    title: row.title,
    description: row.description,
    tags: row.tags ? JSON.parse(row.tags) : [],
    category: row.category || undefined,
    price: row.price || undefined,
    quantity: row.quantity || undefined,
    sku: row.sku || undefined,
    photos: row.photos ? JSON.parse(row.photos) : undefined,
    digitalFiles: row.digital_files ? JSON.parse(row.digital_files) : undefined,
    digitalNote: row.digital_note || undefined,
    offerPersonalization: row.offer_personalization === 1,
    personalizationOptions: row.personalization_options ? JSON.parse(row.personalization_options) : undefined,
    attributes: row.attributes ? JSON.parse(row.attributes) : undefined,
    materials: row.materials ? JSON.parse(row.materials) : undefined,
    processingTime: row.processing_time || undefined,
    shippingProfileId: row.shipping_profile_id || undefined,
    returnsAccepted: row.returns_accepted === 1,
    shopSectionId: row.shop_section_id || undefined,
    featured: row.featured === 1,
    renewalOption: (row.renewal_option || 'automatic') as 'automatic' | 'manual',
    seoScore: row.seo_score || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Agent-based listing generation that connects patterns, templates, and brand identity
 */
async function generateListingWithAgent(
  patterns: Pattern[],
  productTemplate: Template,
  brandIdentity: BrandIdentity
): Promise<{
  title: string;
  description: string;
  tags: string[];
  category: string;
  price: number;
  seoScore?: number;
}> {
  const isBundle = patterns.length > 1;
  const patternNames = patterns.map(p => p.name);
  
  // Build comprehensive context for the agent
  const patternsContext = patterns.map((pattern, idx) => {
    return `Pattern ${idx + 1}: "${pattern.name}"
${pattern.category ? `- Category: ${pattern.category}` : ''}
${pattern.difficulty ? `- Difficulty: ${pattern.difficulty}` : ''}
${pattern.style ? `- Style: ${pattern.style}` : ''}
${pattern.notes ? `- Notes: ${pattern.notes}` : ''}`;
  }).join('\n\n');

  const templateContext = `Template: "${productTemplate.name}"
- Types: ${productTemplate.types.join(', ')}
- Number of Items: ${productTemplate.numberOfItems}
${productTemplate.commonInstructions ? `- Common Instructions: ${productTemplate.commonInstructions}` : ''}`;

  const brandContext = `Store: "${brandIdentity.storeName}"
- Brand Tone: ${brandIdentity.brandTone}
- Visual Style: ${brandIdentity.creativeDirection.visualStyle}
${brandIdentity.creativeDirection.colorPalette.length > 0 ? `- Color Palette: ${brandIdentity.creativeDirection.colorPalette.join(', ')}` : ''}`;

  // Agent system prompt based on listing-generator.md
  const systemPrompt = `You are an expert Etsy SEO copywriter and listing strategist. Your role is to create compelling, search-optimized listings that connect product details, brand identity, and market context.

Key responsibilities:
1. Analyze relationships between patterns, template structure, and brand identity
2. Generate SEO-optimized content that balances search visibility with brand voice
3. Apply brand tone consistently throughout (${brandIdentity.brandTone})
4. Ensure all content meets Etsy requirements (140 char title, 13 tags, etc.)

Brand Tone Guidelines:
${getBrandToneGuidelines(brandIdentity.brandTone)}

Always return valid JSON with exactly this structure:
{
  "title": "SEO-optimized title (max 140 characters)",
  "description": "Structured description using brand tone",
  "tags": ["tag1", "tag2", ...] (exactly 13 tags, no duplicates),
  "category": "suggested Etsy category path",
  "price": suggested_price_number,
  "seoScore": calculated_score_0_100
}`;

  // Comprehensive user prompt
  const userPrompt = `Generate an optimized Etsy listing by connecting all these pieces:

${brandContext}

${templateContext}

${patternsContext}

Context:
- This is ${isBundle ? `a bundle of ${patterns.length} patterns` : 'a single pattern listing'}
- Product type: ${productTemplate.types.join(' and ')}
- ${isBundle ? 'Bundle pricing should reflect value (typically 20-30% discount)' : 'Single pattern pricing'}

Requirements:
1. Title: Max 140 characters, include pattern name(s), product type, key keywords
2. Description: Use ${brandIdentity.brandTone} tone, include:
   - Engaging opening
   - What's included (from template types)
   - Pattern details (from pattern information)
   - Usage instructions (from template commonInstructions if available)
   - Brand-appropriate closing
3. Tags: Exactly 13 tags covering: pattern type, craft type, style, difficulty, use cases, category
4. Category: Appropriate Etsy category path
5. Price: Reasonable for product type${isBundle ? ' with bundle discount' : ''}
6. SEO Score: Calculate based on title optimization, description quality, tag coverage, category match, brand consistency

Return your response as a JSON object with the exact structure specified in the system prompt.`;

  const { generateContent } = await import('./openai');
  
  // Use JSON mode for structured responses
  const response = await generateContent(
    userPrompt, 
    systemPrompt + '\n\nIMPORTANT: You must return ONLY valid JSON, no additional text or markdown formatting.',
    {
      temperature: 0.7,
      maxTokens: 2000,
      responseFormat: { type: 'json_object' },
    }
  );
  
  // Parse JSON from response (should be clean JSON with JSON mode)
  let listingData: any;
  try {
    // Try direct parse first (JSON mode should return clean JSON)
    listingData = JSON.parse(response.trim());
  } catch (e) {
    // Fallback: try to extract JSON if there's any wrapper text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in agent response');
    }
    listingData = JSON.parse(jsonMatch[0]);
  }
  
  // Validate and ensure required fields
  if (!listingData.title || !listingData.description || !listingData.tags) {
    throw new Error('Agent response missing required fields');
  }
  
  // Ensure exactly 13 tags
  if (!Array.isArray(listingData.tags) || listingData.tags.length !== 13) {
    throw new Error(`Agent returned ${listingData.tags?.length || 0} tags, expected exactly 13`);
  }
  
  return listingData;
}

function getBrandToneGuidelines(tone: BrandIdentity['brandTone']): string {
  const guidelines: Record<BrandIdentity['brandTone'], string> = {
    friendly: `- Warm, conversational language
- Use "you" and "your"
- Emojis are acceptable
- Encouraging and supportive tone
- Example: "You'll love creating this beautiful pattern!"`,
    professional: `- Polished, business-like language
- Clear and direct
- Minimal emojis
- Focus on quality and value
- Example: "This professional-grade pattern includes..."`,
    whimsical: `- Playful, creative language
- Fun descriptions
- Emojis welcome
- Lighthearted tone
- Example: "Get ready to stitch something magical! ✨"`,
    minimalist: `- Clean, simple language
- Focus on essentials
- No emojis
- Straightforward tone
- Example: "Embroidery pattern. Digital download."`,
    vintage: `- Classic, nostalgic language
- Timeless descriptions
- Elegant tone
- Example: "A timeless pattern inspired by classic designs..."`,
    modern: `- Contemporary language
- Current terminology
- Sleek descriptions
- Example: "Contemporary embroidery pattern with modern aesthetic..."`,
  };
  return guidelines[tone] || guidelines.friendly;
}

// Generate listing from product template and selected pattern(s)
// patternIds: the specific patterns to include in this listing (selected from template's available patterns)
export async function generateListing(productTemplateId: string, patternIds: string[]): Promise<Listing> {
  console.log('[generateListing] Starting listing generation');
  console.log('[generateListing] Product template ID:', productTemplateId);
  console.log('[generateListing] Pattern IDs:', patternIds);

  const brandIdentity = getBrandIdentity();
  console.log('[generateListing] Brand identity found:', brandIdentity ? brandIdentity.storeName : 'NOT FOUND');
  if (!brandIdentity) {
    throw new Error('Brand identity must be set before generating listings');
  }

  // Get product template using library function
  const productTemplate = getProductTemplate(productTemplateId);
  console.log('[generateListing] Product template found:', productTemplate ? productTemplate.name : 'NOT FOUND');
  if (!productTemplate) {
    throw new Error('Product template not found');
  }

  if (patternIds.length === 0) {
    throw new Error('At least one pattern must be selected for the listing');
  }
  
  // Get full pattern objects (not just names)
  const patterns = patternIds.map(id => {
    const pattern = getPattern(id);
    if (!pattern) {
      throw new Error(`Pattern ${id} not found`);
    }
    return pattern;
  });
  console.log('[generateListing] Patterns loaded:', patterns.map(p => p.name));

  const isBundle = patterns.length > 1;
  console.log('[generateListing] Is bundle:', isBundle);

  // Check if OpenAI is available
  let listingData: any;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  
  if (hasOpenAI) {
    try {
      console.log('[generateListing] Attempting agent-based generation...');
      listingData = await generateListingWithAgent(patterns, productTemplate, brandIdentity);
      console.log('[generateListing] Agent response received:', {
        title: listingData.title?.substring(0, 50) + '...',
        tagsCount: listingData.tags?.length,
        hasPrice: !!listingData.price,
      });
    } catch (e) {
      console.log('[generateListing] Agent generation failed, using fallback:', e);
      // Fall through to fallback
    }
  }
  
  // Use fallback listing if OpenAI is not available or failed
  if (!listingData) {
    console.log('[generateListing] Using fallback listing data');
    const patternNames = patterns.map(p => p.name);
    const patternNameText = patternNames.length === 1 
      ? patternNames[0]
      : `${patternNames.length}-Pattern Bundle: ${patternNames.join(', ')}`;
    
    listingData = {
      title: `${patternNameText} - Embroidery Pattern${patternNames.length > 1 ? ' Bundle' : ''}`,
      description: `Beautiful ${patternNameText} embroidery pattern${patternNames.length > 1 ? ' bundle' : ''}. Perfect for your next project!`,
      tags: ['embroidery', 'pattern', 'digital', 'download', 'craft', 'stitch', 'handmade', 'diy', 'needlework', 'sewing', 'art', 'design', 'creative'],
      category: 'Crafts',
      price: patternNames.length > 1 ? (5.99 * patternNames.length * 0.8) : 5.99, // Bundle discount
    };
  }
  
  console.log('[generateListing] Final listing data:', listingData);

  const id = randomUUID();
  const now = new Date().toISOString();
  console.log('[generateListing] Generated listing ID:', id);
  console.log('[generateListing] Inserting listing into database...');

  // Clean schema - no pattern_id column, only product_template_id
  db.prepare(`
    INSERT INTO listings (
      id, product_template_id, title, description, tags, category, price,
      quantity, sku, photos, digital_files, digital_note, offer_personalization,
      personalization_options, attributes, materials, processing_time,
      shipping_profile_id, returns_accepted, shop_section_id, featured,
      renewal_option, seo_score, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    productTemplateId, // Database column name (still uses product_template_id)
    listingData.title,
    listingData.description,
    JSON.stringify(listingData.tags || []),
    listingData.category || null,
    listingData.price || null,
    listingData.quantity || null,
    listingData.sku || null,
    listingData.photos ? JSON.stringify(listingData.photos) : null,
    listingData.digitalFiles ? JSON.stringify(listingData.digitalFiles) : null,
    listingData.digitalNote || null,
    listingData.offerPersonalization ? 1 : 0,
    listingData.personalizationOptions ? JSON.stringify(listingData.personalizationOptions) : null,
    listingData.attributes ? JSON.stringify(listingData.attributes) : null,
    listingData.materials ? JSON.stringify(listingData.materials) : null,
    listingData.processingTime || null,
    listingData.shippingProfileId || null,
    listingData.returnsAccepted ? 1 : 0,
    listingData.shopSectionId || null,
    listingData.featured ? 1 : 0,
    listingData.renewalOption || 'automatic',
    listingData.seoScore || null,
    now,
    now
  );
  console.log('[generateListing] Listing inserted into database');

  // Insert pattern associations in listing_patterns junction table
  if (patternIds.length > 0) {
    console.log('[generateListing] Inserting pattern associations:', patternIds);
    const insertPattern = db.prepare('INSERT INTO listing_patterns (listing_id, pattern_id, created_at) VALUES (?, ?, ?)');
    const insertPatterns = db.transaction((patternIds: string[]) => {
      for (const patternId of patternIds) {
        insertPattern.run(id, patternId, now);
        console.log('[generateListing] Associated pattern:', patternId, 'with listing:', id);
      }
    });
    insertPatterns(patternIds);
    console.log('[generateListing] Pattern associations complete');
  }

  const finalListing = getListing(id);
  console.log('[generateListing] Final listing retrieved:', {
    id: finalListing?.id,
    title: finalListing?.title,
    templateId: finalListing?.templateId,
    patternIds: finalListing?.patternIds,
  });
  console.log('[generateListing] Listing generation complete');
  
  return finalListing!;
}

// Get all listings for a specific product template
export function getListingsByTemplate(productTemplateId: string): Listing[] {
  const rows = db.prepare('SELECT * FROM listings WHERE product_template_id = ? ORDER BY created_at DESC').all(productTemplateId) as any[];
  return rows.map((row) => {
    // Get pattern IDs from listing_patterns junction table
    const patternRows = db.prepare('SELECT pattern_id FROM listing_patterns WHERE listing_id = ?').all(row.id) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    return {
      id: row.id,
      templateId: row.product_template_id,
      patternIds,
      title: row.title,
      description: row.description,
      tags: JSON.parse(row.tags),
      category: row.category || undefined,
      price: row.price || undefined,
      seoScore: row.seo_score || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

// Get all listings that include a specific pattern
export function getListingsByPattern(patternId: string): Listing[] {
  // Find all listings that include this pattern
  const listingRows = db.prepare('SELECT listing_id FROM listing_patterns WHERE pattern_id = ?').all(patternId) as any[];
  const listingIds = listingRows.map((p: any) => p.listing_id);
  
  if (listingIds.length === 0) {
    return [];
  }
  
  // Get all listings
  const placeholders = listingIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM listings WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...listingIds) as any[];
  
  return rows.map((row) => {
    // Get pattern IDs from listing_patterns junction table
    const patternRows = db.prepare('SELECT pattern_id FROM listing_patterns WHERE listing_id = ?').all(row.id) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    return {
      id: row.id,
      templateId: row.product_template_id,
      patternIds,
      title: row.title,
      description: row.description,
      tags: row.tags ? JSON.parse(row.tags) : [],
      category: row.category || undefined,
      price: row.price || undefined,
      quantity: row.quantity || undefined,
      sku: row.sku || undefined,
      photos: row.photos ? JSON.parse(row.photos) : undefined,
      digitalFiles: row.digital_files ? JSON.parse(row.digital_files) : undefined,
      digitalNote: row.digital_note || undefined,
      offerPersonalization: row.offer_personalization === 1,
      personalizationOptions: row.personalization_options ? JSON.parse(row.personalization_options) : undefined,
      attributes: row.attributes ? JSON.parse(row.attributes) : undefined,
      materials: row.materials ? JSON.parse(row.materials) : undefined,
      processingTime: row.processing_time || undefined,
      shippingProfileId: row.shipping_profile_id || undefined,
      returnsAccepted: row.returns_accepted === 1,
      shopSectionId: row.shop_section_id || undefined,
      featured: row.featured === 1,
      renewalOption: (row.renewal_option || 'automatic') as 'automatic' | 'manual',
      seoScore: row.seo_score || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export function updateListing(id: string, data: Partial<Listing>): Listing | null {
  console.log('[updateListing] Starting update for listing ID:', id);
  console.log('[updateListing] Update data keys:', Object.keys(data));
  console.log('[updateListing] Update data:', data);
  
  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(data.tags));
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    values.push(data.category || null);
  }
  if (data.price !== undefined) {
    updates.push('price = ?');
    values.push(data.price || null);
  }
  if (data.quantity !== undefined) {
    updates.push('quantity = ?');
    values.push(data.quantity || null);
  }
  if (data.sku !== undefined) {
    updates.push('sku = ?');
    values.push(data.sku || null);
  }
  if (data.photos !== undefined) {
    updates.push('photos = ?');
    values.push(data.photos ? JSON.stringify(data.photos) : null);
  }
  if (data.digitalFiles !== undefined) {
    updates.push('digital_files = ?');
    values.push(data.digitalFiles ? JSON.stringify(data.digitalFiles) : null);
  }
  if (data.digitalNote !== undefined) {
    updates.push('digital_note = ?');
    values.push(data.digitalNote || null);
  }
  if (data.offerPersonalization !== undefined) {
    updates.push('offer_personalization = ?');
    values.push(data.offerPersonalization ? 1 : 0);
  }
  if (data.personalizationOptions !== undefined) {
    updates.push('personalization_options = ?');
    values.push(data.personalizationOptions ? JSON.stringify(data.personalizationOptions) : null);
  }
  if (data.attributes !== undefined) {
    updates.push('attributes = ?');
    values.push(data.attributes ? JSON.stringify(data.attributes) : null);
  }
  if (data.materials !== undefined) {
    updates.push('materials = ?');
    values.push(data.materials ? JSON.stringify(data.materials) : null);
  }
  if (data.processingTime !== undefined) {
    updates.push('processing_time = ?');
    values.push(data.processingTime || null);
  }
  if (data.shippingProfileId !== undefined) {
    updates.push('shipping_profile_id = ?');
    values.push(data.shippingProfileId || null);
  }
  if (data.returnsAccepted !== undefined) {
    updates.push('returns_accepted = ?');
    values.push(data.returnsAccepted ? 1 : 0);
  }
  if (data.shopSectionId !== undefined) {
    updates.push('shop_section_id = ?');
    values.push(data.shopSectionId || null);
  }
  if (data.featured !== undefined) {
    updates.push('featured = ?');
    values.push(data.featured ? 1 : 0);
  }
  if (data.renewalOption !== undefined) {
    updates.push('renewal_option = ?');
    values.push(data.renewalOption);
  }
  if (data.seoScore !== undefined) {
    updates.push('seo_score = ?');
    values.push(data.seoScore || null);
  }

  // Update listing fields
  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const updateSql = `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`;
    console.log('[updateListing] Update SQL:', updateSql);
    console.log('[updateListing] Update values count:', values.length);
    console.log('[updateListing] Update values preview:', values.slice(0, 5), '...');
    
    db.prepare(updateSql).run(...values);
    console.log('[updateListing] Database update executed');
  } else {
    console.log('[updateListing] No fields to update');
  }

  // Update pattern associations if provided
  // REQUIREMENT: Each listing must have at least one pattern
  if (data.patternIds !== undefined) {
    console.log('[updateListing] Updating pattern associations:', data.patternIds);
    
    // Validate: listings must have at least one pattern
    if (data.patternIds.length === 0) {
      throw new Error('A listing must have at least one pattern. Cannot remove all patterns.');
    }
    
    const now = new Date().toISOString();
    // Delete existing associations
    db.prepare('DELETE FROM listing_patterns WHERE listing_id = ?').run(id);
    console.log('[updateListing] Deleted existing pattern associations');
    // Insert new associations
    const insertPattern = db.prepare('INSERT INTO listing_patterns (listing_id, pattern_id, created_at) VALUES (?, ?, ?)');
    const insertPatterns = db.transaction((patternIds: string[]) => {
      for (const patternId of patternIds) {
        insertPattern.run(id, patternId, now);
        console.log('[updateListing] Associated pattern:', patternId, 'with listing:', id);
      }
    });
    insertPatterns(data.patternIds);
    console.log('[updateListing] Pattern associations updated');
  }

  const updatedListing = getListing(id);
  console.log('[updateListing] Retrieved updated listing:', updatedListing ? {
    id: updatedListing.id,
    title: updatedListing.title,
    templateId: updatedListing.templateId,
    patternIds: updatedListing.patternIds,
  } : 'NOT FOUND');
  console.log('[updateListing] Update complete');
  
  return updatedListing;
}

