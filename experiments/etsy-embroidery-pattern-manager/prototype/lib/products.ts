import db from './db';
import { Product } from '@/types';
import { randomUUID } from 'crypto';

export function getAllProducts(): Product[] {
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    patternId: row.pattern_id,
    name: row.name,
    type: row.type as Product['type'],
    status: row.status as Product['status'],
    title: row.title || undefined,
    description: row.description || undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    category: row.category || undefined,
    price: row.price || undefined,
    seoScore: row.seo_score || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getProduct(id: string): Product | null {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!row) return null;

  return {
    id: row.id,
    patternId: row.pattern_id,
    name: row.name,
    type: row.type as Product['type'],
    status: row.status as Product['status'],
    title: row.title || undefined,
    description: row.description || undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    category: row.category || undefined,
    price: row.price || undefined,
    seoScore: row.seo_score || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getProductsByPattern(patternId: string): Product[] {
  const rows = db.prepare('SELECT * FROM products WHERE pattern_id = ? ORDER BY created_at DESC').all(patternId) as any[];
  return rows.map((row) => ({
    id: row.id,
    patternId: row.pattern_id,
    name: row.name,
    type: row.type as Product['type'],
    status: row.status as Product['status'],
    title: row.title || undefined,
    description: row.description || undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    category: row.category || undefined,
    price: row.price || undefined,
    seoScore: row.seo_score || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function createProduct(data: {
  patternId: string;
  name: string;
  type: Product['type'];
  status?: Product['status'];
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  price?: number;
}): Product {
  const id = randomUUID();
  const now = new Date().toISOString();
  const status = data.status || 'draft';

  db.prepare(`
    INSERT INTO products (id, pattern_id, name, type, status, title, description, tags, category, price, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.patternId,
    data.name,
    data.type,
    status,
    data.title || null,
    data.description || null,
    data.tags ? JSON.stringify(data.tags) : null,
    data.category || null,
    data.price || null,
    now,
    now
  );

  return getProduct(id)!;
}

export function updateProduct(id: string, data: Partial<Product>): Product | null {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title || null);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description || null);
  }
  if (data.tags !== undefined) {
    updates.push('tags = ?');
    values.push(data.tags ? JSON.stringify(data.tags) : null);
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
    return getProduct(id);
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getProduct(id);
}

export function deleteProduct(id: string): boolean {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return result.changes > 0;
}

