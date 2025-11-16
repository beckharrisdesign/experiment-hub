import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export function initDatabase() {
  // Brand Identity table
  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_identity (
      id TEXT PRIMARY KEY,
      store_name TEXT NOT NULL,
      brand_tone TEXT NOT NULL CHECK(brand_tone IN ('friendly', 'professional', 'whimsical', 'minimalist', 'vintage', 'modern')),
      visual_style TEXT NOT NULL,
      color_palette TEXT NOT NULL, -- JSON array
      typography TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Patterns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      notes TEXT,
      category TEXT,
      difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
      style TEXT,
      release_id TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (release_id) REFERENCES releases(id)
    )
  `);
  
  // Add image_url column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE patterns ADD COLUMN image_url TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Releases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      release_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Product Templates table (templates that can be applied to patterns)
  // Product templates are like "Digital PDF Listing", "Embroidery Kit", "3-Pattern Bundle"
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- Stores JSON array of types like ["digital", "physical"]
      status TEXT NOT NULL CHECK(status IN ('draft', 'ready', 'listed')),
      title TEXT,
      description TEXT,
      tags TEXT, -- JSON array
      category TEXT,
      price REAL,
      seo_score INTEGER,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Product Template-Pattern junction table (many-to-many relationship)
  // Allows product templates to be associated with 0, 1, or many patterns
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_template_patterns (
      product_template_id TEXT NOT NULL,
      pattern_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_template_id, pattern_id),
      FOREIGN KEY (product_template_id) REFERENCES product_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    )
  `);
  
  // Migration: Rename old products table to product_templates if it exists
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get() as any;
    if (tables) {
      console.log('Migrating products table to product_templates...');
      // Copy data from old table to new table
      const oldProducts = db.prepare('SELECT * FROM products').all() as any[];
      for (const product of oldProducts) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO product_templates (id, name, type, status, title, description, tags, category, price, seo_score, image_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            product.id, product.name, product.type, product.status,
            product.title, product.description, product.tags, product.category,
            product.price, product.seo_score, product.image_url,
            product.created_at, product.updated_at
          );
        } catch (e) {
          // Already exists, skip
        }
      }
      
      // Migrate junction table
      const oldJunction = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='product_patterns'").get() as any;
      if (oldJunction) {
        const oldJunctionData = db.prepare('SELECT * FROM product_patterns').all() as any[];
        for (const row of oldJunctionData) {
          try {
            db.prepare('INSERT OR IGNORE INTO product_template_patterns (product_template_id, pattern_id, created_at) VALUES (?, ?, ?)')
              .run(row.product_id, row.pattern_id, row.created_at || new Date().toISOString());
          } catch (e) {
            // Already exists, skip
          }
        }
      }
    }
  } catch (e) {
    // Migration failed or not needed, continue
  }
  
  // Add image_url column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE product_templates ADD COLUMN image_url TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Remove CHECK constraint on type column to allow JSON arrays
  // SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we need to recreate the table
  try {
    const tableInfo = db.prepare("PRAGMA table_info(product_templates)").all() as any[];
    const hasTypeColumn = tableInfo.some((col: any) => col.name === 'type');
    
    if (hasTypeColumn) {
      // Check if we need to migrate by trying to insert a JSON array
      // If it fails, we need to recreate the table
      const testId = 'migration-test-' + Date.now();
      try {
        db.prepare('INSERT INTO product_templates (id, name, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(testId, 'Migration Test', JSON.stringify(['digital']), 'draft', new Date().toISOString(), new Date().toISOString());
        db.prepare('DELETE FROM product_templates WHERE id = ?').run(testId);
      } catch (e: any) {
        // Constraint violation - need to recreate table
        console.log('Migrating product_templates table to remove type CHECK constraint...');
        
        // Create backup table
        db.exec(`
          CREATE TABLE product_templates_backup AS SELECT * FROM product_templates
        `);
        
        // Drop old table
        db.exec('DROP TABLE product_templates');
        
        // Recreate without CHECK constraint
        db.exec(`
          CREATE TABLE product_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('draft', 'ready', 'listed')),
            title TEXT,
            description TEXT,
            tags TEXT,
            category TEXT,
            price REAL,
            seo_score INTEGER,
            image_url TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy data back
        db.exec(`
          INSERT INTO product_templates SELECT * FROM product_templates_backup
        `);
        
        // Drop backup
        db.exec('DROP TABLE product_templates_backup');
        
        console.log('Migration completed successfully');
      }
    }
  } catch (e) {
    console.error('Error during type column migration:', e);
    // Continue anyway - might already be migrated
  }

  // Listings table - A listing = Product Template + Pattern(s)
  // Patterns come from product_template_patterns junction table via product_template_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      product_template_id TEXT NOT NULL, -- References product template (patterns come from product_template_patterns)
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      tags TEXT NOT NULL, -- JSON array
      category TEXT,
      price REAL,
      seo_score INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_template_id) REFERENCES product_templates(id) ON DELETE CASCADE
    )
  `);
  
  // Migration: Handle transition from old column names
  try {
    const tableInfo = db.prepare("PRAGMA table_info(listings)").all() as any[];
    const hasOldPatternId = tableInfo.some((col: any) => col.name === 'pattern_id');
    const hasOldProductId = tableInfo.some((col: any) => col.name === 'product_id');
    const hasProductTemplateId = tableInfo.some((col: any) => col.name === 'product_template_id');
    
    if (hasOldProductId && !hasProductTemplateId) {
      console.log('Migrating listings table from product_id to product_template_id...');
      // Add product_template_id column
      db.exec('ALTER TABLE listings ADD COLUMN product_template_id TEXT');
      
      // Copy data from product_id to product_template_id
      db.exec('UPDATE listings SET product_template_id = product_id WHERE product_template_id IS NULL');
    } else if (hasOldPatternId && !hasProductTemplateId) {
      console.log('Migrating listings table from pattern_id to product_template_id...');
      // Add product_template_id column
      db.exec('ALTER TABLE listings ADD COLUMN product_template_id TEXT');
      
      // For each listing with pattern_id, create or find a product template and link it
      const oldListings = db.prepare('SELECT id, pattern_id FROM listings WHERE pattern_id IS NOT NULL AND product_template_id IS NULL').all() as any[];
      for (const listing of oldListings) {
        // Find or create a default "Digital Download" product template for this pattern
        let productTemplate = db.prepare('SELECT id FROM product_templates WHERE type = ? AND id IN (SELECT product_template_id FROM product_template_patterns WHERE pattern_id = ?) LIMIT 1').get('printable-pdf', listing.pattern_id) as any;
        
        if (!productTemplate) {
          // Create a default product template for this pattern
          const productTemplateId = randomUUID();
          const now = new Date().toISOString();
          db.prepare(`
            INSERT INTO product_templates (id, name, type, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(productTemplateId, 'Digital Download', 'printable-pdf', 'draft', now, now);
          
          // Link pattern to product template
          db.prepare('INSERT INTO product_template_patterns (product_template_id, pattern_id, created_at) VALUES (?, ?, ?)').run(productTemplateId, listing.pattern_id, now);
          productTemplate = { id: productTemplateId };
        }
        
        // Update listing with product_template_id
        db.prepare('UPDATE listings SET product_template_id = ? WHERE id = ?').run(productTemplate.id, listing.id);
      }
    }
  } catch (e) {
    // Column already exists or migration not needed, ignore error
  }

  // Customer Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_messages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('order-confirmation', 'download-delivery', 'follow-up', 'question-response')),
      content TEXT NOT NULL,
      template_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Generated Images table
  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      pattern_id TEXT,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      spec TEXT NOT NULL, -- JSON
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id)
    )
  `);
}

// Initialize on import
initDatabase();

export default db;

