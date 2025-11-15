import db from './db';
import { Listing } from '@/types';
import { randomUUID } from 'crypto';
import { getBrandIdentity } from './brand-identity';
import { generateContent } from './openai';

export function getAllListings(): Listing[] {
  const rows = db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    patternId: row.pattern_id,
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tags),
    category: row.category || undefined,
    price: row.price || undefined,
    seoScore: row.seo_score || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getListing(id: string): Listing | null {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as any;
  if (!row) return null;

  return {
    id: row.id,
    patternId: row.pattern_id,
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

export async function generateListing(patternId: string, patternName: string): Promise<Listing> {
  const brandIdentity = getBrandIdentity();
  if (!brandIdentity) {
    throw new Error('Brand identity must be set before generating listings');
  }

  const systemPrompt = `You are an expert Etsy SEO copywriter. Generate optimized Etsy listing content that:
- Uses the store's brand tone: ${brandIdentity.brandTone}
- Includes the store name: ${brandIdentity.storeName}
- Is optimized for Etsy search (140 character title, 13 tags)
- Is keyword-rich and natural
- Matches the brand's ${brandIdentity.brandTone} tone`;

  const prompt = `Generate an Etsy listing for an embroidery pattern called "${patternName}".

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
      title: `${patternName} - Embroidery Pattern`,
      description: `Beautiful ${patternName} embroidery pattern. Perfect for your next project!`,
      tags: ['embroidery', 'pattern', 'digital', 'download', 'craft', 'stitch', 'handmade', 'diy', 'needlework', 'sewing', 'art', 'design', 'creative'],
      category: 'Crafts',
      price: 5.99,
    };
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO listings (id, pattern_id, title, description, tags, category, price, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    patternId,
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

