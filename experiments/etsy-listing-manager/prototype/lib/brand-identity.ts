import db from './db';
import { BrandIdentity } from '@/types';
import { randomUUID } from 'crypto';

export function getBrandIdentity(): BrandIdentity | null {
  const row = db.prepare('SELECT * FROM brand_identity ORDER BY created_at DESC LIMIT 1').get() as any;
  
  if (!row) return null;

  return {
    id: row.id,
    storeName: row.store_name,
    brandTone: row.brand_tone as BrandIdentity['brandTone'],
    creativeDirection: {
      visualStyle: row.visual_style as BrandIdentity['creativeDirection']['visualStyle'],
      colorPalette: JSON.parse(row.color_palette),
      typography: row.typography || undefined,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBrandIdentity(data: {
  storeName: string;
  brandTone: BrandIdentity['brandTone'];
  creativeDirection: BrandIdentity['creativeDirection'];
}): BrandIdentity {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO brand_identity (id, store_name, brand_tone, visual_style, color_palette, typography, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.storeName,
    data.brandTone,
    data.creativeDirection.visualStyle,
    JSON.stringify(data.creativeDirection.colorPalette),
    data.creativeDirection.typography || null,
    now,
    now
  );

  return {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBrandIdentity(id: string, data: Partial<{
  storeName: string;
  brandTone: BrandIdentity['brandTone'];
  creativeDirection: BrandIdentity['creativeDirection'];
}>): BrandIdentity | null {
  const existing = db.prepare('SELECT * FROM brand_identity WHERE id = ?').get(id) as any;
  if (!existing) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (data.storeName !== undefined) {
    updates.push('store_name = ?');
    values.push(data.storeName);
  }
  if (data.brandTone !== undefined) {
    updates.push('brand_tone = ?');
    values.push(data.brandTone);
  }
  if (data.creativeDirection?.visualStyle !== undefined) {
    updates.push('visual_style = ?');
    values.push(data.creativeDirection.visualStyle);
  }
  if (data.creativeDirection?.colorPalette !== undefined) {
    updates.push('color_palette = ?');
    values.push(JSON.stringify(data.creativeDirection.colorPalette));
  }
  if (data.creativeDirection?.typography !== undefined) {
    updates.push('typography = ?');
    values.push(data.creativeDirection.typography || null);
  }

  if (updates.length === 0) {
    return getBrandIdentity();
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE brand_identity SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getBrandIdentity();
}

