import db from './db';
import { ProductTemplate, ProductTemplateType } from '@/types';
import { randomUUID } from 'crypto';

export function getAllProductTemplates(): ProductTemplate[] {
  const rows = db.prepare('SELECT * FROM product_templates ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => {
    // Get pattern IDs from junction table
    const patternRows = db.prepare('SELECT pattern_id FROM product_template_patterns WHERE product_template_id = ?').all(row.id) as any[];
    const patternIds = patternRows.map((pr: any) => pr.pattern_id);
    
    // Handle types: can be JSON array or single string (for backward compatibility)
    let types: ProductTemplateType[] = [];
    if (row.type) {
      try {
        types = JSON.parse(row.type);
        if (!Array.isArray(types)) {
          types = [row.type as ProductTemplateType];
        }
      } catch {
        types = [row.type as ProductTemplateType];
      }
    }
    
    return {
      id: row.id,
      patternIds,
      name: row.name,
      types,
      numberOfItems: (row.number_of_items || 'single') as 'single' | 'three' | 'five',
      title: row.title || undefined,
      commonInstructions: row.description || undefined, // Map DB description to commonInstructions
      seoScore: row.seo_score || undefined,
      imageUrl: row.image_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export function getProductTemplate(id: string): ProductTemplate | null {
  const row = db.prepare('SELECT * FROM product_templates WHERE id = ?').get(id) as any;
  if (!row) return null;

  // Get pattern IDs from junction table
  const patternRows = db.prepare('SELECT pattern_id FROM product_template_patterns WHERE product_template_id = ?').all(id) as any[];
  const patternIds = patternRows.map((pr: any) => pr.pattern_id);

  // Handle types: can be JSON array or single string (for backward compatibility)
  let types: ProductTemplateType[] = [];
  if (row.type) {
    try {
      types = JSON.parse(row.type);
      if (!Array.isArray(types)) {
        types = [row.type as ProductTemplateType];
      }
    } catch {
      types = [row.type as ProductTemplateType];
    }
  }

  return {
    id: row.id,
    patternIds,
    name: row.name,
    types,
    title: row.title || undefined,
    commonInstructions: row.description || undefined, // Map DB description to commonInstructions
    seoScore: row.seo_score || undefined,
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getProductTemplatesByPattern(patternId: string): ProductTemplate[] {
  // Get product templates through junction table
  const productTemplateRows = db.prepare(`
    SELECT pt.* FROM product_templates pt
    INNER JOIN product_template_patterns ptp ON pt.id = ptp.product_template_id
    WHERE ptp.pattern_id = ?
    ORDER BY pt.created_at DESC
  `).all(patternId) as any[];
  
  return productTemplateRows.map((row) => {
    // Get all pattern IDs for this product template
    const patternRows = db.prepare('SELECT pattern_id FROM product_template_patterns WHERE product_template_id = ?').all(row.id) as any[];
    const patternIds = patternRows.map((pr: any) => pr.pattern_id);
    
    // Handle types: can be JSON array or single string (for backward compatibility)
    let types: ProductTemplateType[] = [];
    if (row.type) {
      try {
        types = JSON.parse(row.type);
        if (!Array.isArray(types)) {
          types = [row.type as ProductTemplateType];
        }
      } catch {
        types = [row.type as ProductTemplateType];
      }
    }
    
    return {
      id: row.id,
      patternIds,
      name: row.name,
      types,
      numberOfItems: (row.number_of_items || 'single') as 'single' | 'three' | 'five',
      title: row.title || undefined,
      commonInstructions: row.description || undefined, // Map DB description to commonInstructions
      seoScore: row.seo_score || undefined,
      imageUrl: row.image_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export function createProductTemplate(data: {
  name: string;
  types: ProductTemplateType[];
  numberOfItems?: 'single' | 'three' | 'five';
  patternIds?: string[]; // Can be empty, 1, or many
  title?: string;
  commonInstructions?: string;
  imageUrl?: string;
}): ProductTemplate {
  const id = randomUUID();
  const now = new Date().toISOString();
  const patternIds = data.patternIds || [];
  const types = data.types || [];
  const numberOfItems = data.numberOfItems || 'single';

  // Insert product template
  // Store types as JSON array in type column
  // Map commonInstructions to description column in DB
  // Status column is required by DB schema but not used in UI - set to 'draft' as default
  db.prepare(`
    INSERT INTO product_templates (id, name, type, number_of_items, status, title, description, tags, category, price, image_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    JSON.stringify(types),
    numberOfItems,
    'draft', // status - required by DB but not used in UI
    data.title || null,
    data.commonInstructions || null,
    null, // tags
    null, // category
    null, // price
    data.imageUrl || null,
    now,
    now
  );

  // Insert pattern associations in junction table
  if (patternIds.length > 0) {
    const insertPattern = db.prepare('INSERT INTO product_template_patterns (product_template_id, pattern_id, created_at) VALUES (?, ?, ?)');
    const insertPatterns = db.transaction((patternIds: string[]) => {
      for (const patternId of patternIds) {
        insertPattern.run(id, patternId, now);
      }
    });
    insertPatterns(patternIds);
  }

  return getProductTemplate(id)!;
}

export function updateProductTemplate(id: string, data: Partial<ProductTemplate>): ProductTemplate | null {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.types !== undefined) {
    // Store types as JSON array
    updates.push('type = ?');
    values.push(JSON.stringify(data.types.length > 0 ? data.types : []));
  }
  if (data.numberOfItems !== undefined) {
    updates.push('number_of_items = ?');
    values.push(data.numberOfItems);
  }
  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title || null);
  }
  if (data.commonInstructions !== undefined) {
    // Map commonInstructions to description column in DB
    updates.push('description = ?');
    values.push(data.commonInstructions || null);
  }
  if (data.seoScore !== undefined) {
    updates.push('seo_score = ?');
    values.push(data.seoScore || null);
  }
  if (data.imageUrl !== undefined) {
    updates.push('image_url = ?');
    values.push(data.imageUrl || null);
  }

  // Update product template fields
  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE product_templates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  // Update pattern associations if provided
  if (data.patternIds !== undefined) {
    const now = new Date().toISOString();
    // Delete existing associations
    db.prepare('DELETE FROM product_template_patterns WHERE product_template_id = ?').run(id);
    // Insert new associations
    if (data.patternIds.length > 0) {
      const insertPattern = db.prepare('INSERT INTO product_template_patterns (product_template_id, pattern_id, created_at) VALUES (?, ?, ?)');
      const insertPatterns = db.transaction((patternIds: string[]) => {
        for (const patternId of patternIds) {
          insertPattern.run(id, patternId, now);
        }
      });
      insertPatterns(data.patternIds);
    }
  }

  return getProductTemplate(id);
}

export function deleteProductTemplate(id: string): boolean {
  const result = db.prepare('DELETE FROM product_templates WHERE id = ?').run(id);
  return result.changes > 0;
}
