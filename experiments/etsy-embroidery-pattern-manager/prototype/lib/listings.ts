import db from './db';
import { Listing } from '@/types';
import { randomUUID } from 'crypto';
import { getBrandIdentity } from './brand-identity';
import { generateContent } from './openai';

export function getAllListings(): Listing[] {
  const rows = db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => {
    // Get pattern IDs from product_template_patterns junction table
    const productTemplateId = row.product_template_id || row.product_id; // Support migration
    const patternRows = db.prepare('SELECT pattern_id FROM product_template_patterns WHERE product_template_id = ?').all(productTemplateId) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    return {
      id: row.id,
      productTemplateId: productTemplateId,
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

  // Get pattern IDs from product_template_patterns junction table
  const productTemplateId = row.product_template_id || row.product_id; // Support migration
  const patternRows = db.prepare('SELECT pattern_id FROM product_template_patterns WHERE product_template_id = ?').all(productTemplateId) as any[];
  const patternIds = patternRows.map((p: any) => p.pattern_id);

  return {
    id: row.id,
    productTemplateId: productTemplateId,
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

// Generate listing from product template and pattern(s)
// The product template already has patternIds associated via product_template_patterns
export async function generateListing(productTemplateId: string, patternNames: string[]): Promise<Listing> {
  const brandIdentity = getBrandIdentity();
  if (!brandIdentity) {
    throw new Error('Brand identity must be set before generating listings');
  }

  // Get product template info
  const productTemplate = db.prepare('SELECT * FROM product_templates WHERE id = ?').get(productTemplateId) as any;
  if (!productTemplate) {
    throw new Error('Product template not found');
  }

  // Get pattern IDs from product_template_patterns
  const patternRows = db.prepare('SELECT pattern_id FROM product_template_patterns WHERE product_template_id = ?').all(productTemplateId) as any[];
  const patternIds = patternRows.map((p: any) => p.pattern_id);

  if (patternIds.length === 0) {
    throw new Error('Product template must have at least one pattern associated');
  }

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

  return getListing(id)!;
}

// Get all listings for a specific product template
export function getListingsByProductTemplate(productTemplateId: string): Listing[] {
  const rows = db.prepare('SELECT * FROM listings WHERE product_template_id = ? ORDER BY created_at DESC').all(productTemplateId) as any[];
  return rows.map((row) => {
    const productTemplateId = row.product_template_id || row.product_id; // Support migration
    const patternRows = db.prepare('SELECT pattern_id FROM product_template_patterns WHERE product_template_id = ?').all(productTemplateId) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    return {
      id: row.id,
      productTemplateId: productTemplateId,
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
  // Find all product templates that include this pattern
  const productTemplateRows = db.prepare('SELECT product_template_id FROM product_template_patterns WHERE pattern_id = ?').all(patternId) as any[];
  const productTemplateIds = productTemplateRows.map((p: any) => p.product_template_id);
  
  if (productTemplateIds.length === 0) {
    return [];
  }
  
  // Get all listings for those product templates
  const placeholders = productTemplateIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM listings WHERE product_template_id IN (${placeholders}) ORDER BY created_at DESC`).all(...productTemplateIds) as any[];
  
  return rows.map((row) => {
    const productTemplateId = row.product_template_id || row.product_id; // Support migration
    const patternRows = db.prepare('SELECT pattern_id FROM product_template_patterns WHERE product_template_id = ?').all(productTemplateId) as any[];
    const patternIds = patternRows.map((p: any) => p.pattern_id);
    
    return {
      id: row.id,
      productTemplateId: productTemplateId,
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

  if (updates.length === 0) {
    return getListing(id);
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE listings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getListing(id);
}

