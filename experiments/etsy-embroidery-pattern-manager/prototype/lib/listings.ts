import db from './db';
import { Listing } from '@/types';
import { randomUUID } from 'crypto';
import { getBrandIdentity } from './brand-identity';
import { generateContent } from './openai';

export function getAllListings(): Listing[] {
  const rows = db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => {
    // Get pattern IDs from listing_patterns junction table
    const patternRows = db.prepare('SELECT pattern_id FROM listing_patterns WHERE listing_id = ?').all(row.id) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    return {
      id: row.id,
      productTemplateId: row.product_template_id || row.product_id, // Support migration
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
    tags: JSON.parse(row.tags),
    category: row.category || undefined,
    price: row.price || undefined,
    seoScore: row.seo_score || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Generate listing from product template and selected pattern(s)
// patternIds: the specific patterns to include in this listing (selected from template's available patterns)
export async function generateListing(productTemplateId: string, patternIds: string[]): Promise<Listing> {
  const brandIdentity = getBrandIdentity();
  if (!brandIdentity) {
    throw new Error('Brand identity must be set before generating listings');
  }

  // Get product template info
  const productTemplate = db.prepare('SELECT * FROM product_templates WHERE id = ?').get(productTemplateId) as any;
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
    return pattern?.name || id;
  });

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
  const isBundle = patternNames.length > 1;

  const systemPrompt = `You are an expert Etsy SEO copywriter. Generate optimized Etsy listing content that:
- Uses the store's brand tone: ${brandIdentity.brandTone}
- Includes the store name: ${brandIdentity.storeName}
- Is optimized for Etsy search (140 character title, 13 tags)
- Is keyword-rich and natural
- Matches the brand's ${brandIdentity.brandTone} tone`;

  const patternNameText = patternNames.length === 1 
    ? patternNames[0]
    : `${patternNames.length}-Pattern Bundle: ${patternNames.join(', ')}`;

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
  
  // Parse JSON from response
  let listingData: any;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      listingData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (e) {
    // Fallback listing
    listingData = {
      title: `${patternNameText} - Embroidery Pattern${patternNames.length > 1 ? ' Bundle' : ''}`,
      description: `Beautiful ${patternNameText} embroidery pattern${patternNames.length > 1 ? ' bundle' : ''}. Perfect for your next project!`,
      tags: ['embroidery', 'pattern', 'digital', 'download', 'craft', 'stitch', 'handmade', 'diy', 'needlework', 'sewing', 'art', 'design', 'creative'],
      category: 'Crafts',
      price: patternNames.length > 1 ? (5.99 * patternNames.length * 0.8) : 5.99, // Bundle discount
    };
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO listings (id, product_template_id, title, description, tags, category, price, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    productTemplateId,
    listingData.title,
    listingData.description,
    JSON.stringify(listingData.tags),
    listingData.category || null,
    listingData.price || null,
    now,
    now
  );

  // Insert pattern associations in listing_patterns junction table
  if (patternIds.length > 0) {
    const insertPattern = db.prepare('INSERT INTO listing_patterns (listing_id, pattern_id, created_at) VALUES (?, ?, ?)');
    const insertPatterns = db.transaction((patternIds: string[]) => {
      for (const patternId of patternIds) {
        insertPattern.run(id, patternId, now);
      }
    });
    insertPatterns(patternIds);
  }

  return getListing(id)!;
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
      productTemplateId: row.product_template_id || row.product_id, // Support migration
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
      productTemplateId: row.product_template_id || row.product_id, // Support migration
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

export function updateListing(id: string, data: Partial<Listing>): Listing | null {
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
  if (data.seoScore !== undefined) {
    updates.push('seo_score = ?');
    values.push(data.seoScore || null);
  }

  // Update listing fields
  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE listings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  // Update pattern associations if provided
  if (data.patternIds !== undefined) {
    const now = new Date().toISOString();
    // Delete existing associations
    db.prepare('DELETE FROM listing_patterns WHERE listing_id = ?').run(id);
    // Insert new associations
    if (data.patternIds.length > 0) {
      const insertPattern = db.prepare('INSERT INTO listing_patterns (listing_id, pattern_id, created_at) VALUES (?, ?, ?)');
      const insertPatterns = db.transaction((patternIds: string[]) => {
        for (const patternId of patternIds) {
          insertPattern.run(id, patternId, now);
        }
      });
      insertPatterns(data.patternIds);
    }
  }

  return getListing(id);
}

