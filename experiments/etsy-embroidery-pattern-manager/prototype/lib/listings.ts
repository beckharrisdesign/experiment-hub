import db from './db';
import { Listing } from '@/types';
import { randomUUID } from 'crypto';
import { getBrandIdentity } from './brand-identity';

export function getAllListings(): Listing[] {
  const rows = db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => {
    // Get pattern IDs from listing_patterns junction table
    const patternRows = db.prepare('SELECT pattern_id FROM listing_patterns WHERE listing_id = ?').all(row.id) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    return {
      id: row.id,
      productTemplateId: row.product_template_id,
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

export function getListing(id: string): Listing | null {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as any;
  if (!row) return null;

  // Get pattern IDs from listing_patterns junction table
  const patternRows = db.prepare('SELECT pattern_id FROM listing_patterns WHERE listing_id = ?').all(id) as any[];
  const patternIds = patternRows.map((p: any) => p.pattern_id);

  return {
    id: row.id,
    productTemplateId: row.product_template_id || row.product_id, // Support migration
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

  // Get product template info
  const productTemplate = db.prepare('SELECT * FROM product_templates WHERE id = ?').get(productTemplateId) as any;
  console.log('[generateListing] Product template from DB:', productTemplate ? productTemplate.name : 'NOT FOUND');
  if (!productTemplate) {
    throw new Error('Product template not found');
  }

  if (patternIds.length === 0) {
    throw new Error('At least one pattern must be selected for the listing');
  }
  
  // Get pattern names for listing generation
  const { getPattern } = await import('./patterns');
  const patternNames = patternIds.map(id => {
    const pattern = getPattern(id);
    console.log('[generateListing] Pattern lookup:', { id, name: pattern?.name || 'NOT FOUND' });
    return pattern?.name || id;
  });
  console.log('[generateListing] Pattern names:', patternNames);

  // Parse types from JSON array or single string (backward compatibility)
  let types: string[] = [];
  if (productTemplate.type) {
    try {
      types = JSON.parse(productTemplate.type);
      if (!Array.isArray(types)) {
        types = [productTemplate.type];
      }
    } catch {
      types = [productTemplate.type];
    }
  }
  console.log('[generateListing] Template types:', types);
  const isBundle = patternNames.length > 1;
  console.log('[generateListing] Is bundle:', isBundle);

  const systemPrompt = `You are an expert Etsy SEO copywriter. Generate optimized Etsy listing content that:
- Uses the store's brand tone: ${brandIdentity.brandTone}
- Includes the store name: ${brandIdentity.storeName}
- Is optimized for Etsy search (140 character title, 13 tags)
- Is keyword-rich and natural
- Matches the brand's ${brandIdentity.brandTone} tone`;

  const patternNameText = patternNames.length === 1 
    ? patternNames[0]
    : `${patternNames.length}-Pattern Bundle: ${patternNames.join(', ')}`;

  // Check if OpenAI is available
  let listingData: any;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  console.log('[generateListing] OpenAI available:', hasOpenAI);
  
  if (hasOpenAI) {
    try {
      console.log('[generateListing] Attempting OpenAI generation...');
      const { generateContent } = await import('./openai');
      const prompt = `Generate an Etsy listing for ${isBundle ? 'a bundle of' : 'an'} embroidery pattern${patternNames.length > 1 ? 's' : ''} called "${patternNameText}".
Product template types: ${types.join(', ')}
${isBundle ? `This is a bundle of ${patternNames.length} patterns.` : ''}

Return a JSON object with:
{
  "title": "SEO-optimized title (max 140 characters)",
  "description": "Structured description with pattern overview, what's included, usage instructions (use brand tone: ${brandIdentity.brandTone})",
  "tags": ["tag1", "tag2", ...] (exactly 13 tags),
  "category": "suggested Etsy category",
  "price": suggested price (number)
}`;

      const response = await generateContent(prompt, systemPrompt);
      console.log('[generateListing] OpenAI response received, length:', response.length);
      
      // Parse JSON from response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          listingData = JSON.parse(jsonMatch[0]);
          console.log('[generateListing] Parsed OpenAI response:', listingData);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (e) {
        console.log('[generateListing] Failed to parse OpenAI response, using fallback:', e);
        // Fall through to fallback
        throw e;
      }
    } catch (e) {
      // Fall through to fallback if OpenAI fails
      console.log('[generateListing] OpenAI generation failed, using fallback:', e);
    }
  }
  
  // Use fallback listing if OpenAI is not available or failed
  if (!listingData) {
    console.log('[generateListing] Using fallback listing data');
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
    productTemplateId,
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
    productTemplateId: finalListing?.productTemplateId,
    patternIds: finalListing?.patternIds,
  });
  console.log('[generateListing] Listing generation complete');
  
  return finalListing!;
}

// Get all listings for a specific product template
export function getListingsByProductTemplate(productTemplateId: string): Listing[] {
  const rows = db.prepare('SELECT * FROM listings WHERE product_template_id = ? ORDER BY created_at DESC').all(productTemplateId) as any[];
  return rows.map((row) => {
    // Get pattern IDs from listing_patterns junction table
    const patternRows = db.prepare('SELECT pattern_id FROM listing_patterns WHERE listing_id = ?').all(row.id) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    return {
      id: row.id,
      productTemplateId: row.product_template_id,
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
      productTemplateId: row.product_template_id,
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
  if (data.patternIds !== undefined) {
    console.log('[updateListing] Updating pattern associations:', data.patternIds);
    const now = new Date().toISOString();
    // Delete existing associations
    db.prepare('DELETE FROM listing_patterns WHERE listing_id = ?').run(id);
    console.log('[updateListing] Deleted existing pattern associations');
    // Insert new associations
    if (data.patternIds.length > 0) {
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
  }

  const updatedListing = getListing(id);
  console.log('[updateListing] Retrieved updated listing:', updatedListing ? {
    id: updatedListing.id,
    title: updatedListing.title,
    productTemplateId: updatedListing.productTemplateId,
    patternIds: updatedListing.patternIds,
  } : 'NOT FOUND');
  console.log('[updateListing] Update complete');
  
  return updatedListing;
}

