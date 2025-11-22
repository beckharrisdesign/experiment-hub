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

// Initialize schema - Clean schema only, no legacy columns
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

  // Product Templates table
  // Templates define the structure (single/three/five patterns) but don't restrict which patterns can be used
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- Stores JSON array of types like ["digital", "physical"]
      status TEXT NOT NULL CHECK(status IN ('draft', 'ready', 'listed')),
      number_of_items TEXT CHECK(number_of_items IN ('single', 'three', 'five')) DEFAULT 'single',
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
  // This is optional - templates don't need pre-associated patterns
  // Any pattern can be used with any template when creating a listing
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

  // Migrate existing data from old schema to new schema
  migrateFromLegacySchema();

  // Listings table - Clean schema
  // A listing = Product Template + Pattern(s)
  // REQUIREMENT: Each listing MUST have both a product_template_id and at least one pattern
  // Multiple listings can exist for the same pattern+template combination (for testing variations)
  // The listing combines details from both template and pattern(s)
  // Stores backward references to both product_template_id and pattern_ids (via junction table)
  // NO pattern_id column - patterns are stored in listing_patterns junction table only
  migrateListingsTable();

  // Listing-Pattern junction table (many-to-many relationship)
  // Stores which patterns are included in each specific listing
  // This allows different listings from the same template to have different pattern selections
  db.exec(`
    CREATE TABLE IF NOT EXISTS listing_patterns (
      listing_id TEXT NOT NULL,
      pattern_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (listing_id, pattern_id),
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    )
  `);

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

// Migrate from legacy schema (products -> product_templates, etc.)
function migrateFromLegacySchema() {
  try {
    // Migrate old products table to product_templates
    const hasProductsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get() as any;
    if (hasProductsTable) {
      console.log('[Migration] Migrating products table to product_templates...');
      const oldProducts = db.prepare('SELECT * FROM products').all() as any[];
      for (const product of oldProducts) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO product_templates (id, name, type, status, title, description, tags, category, price, seo_score, image_url, number_of_items, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            product.id, 
            product.name, 
            product.type, 
            product.status || 'draft',
            product.title, 
            product.description, 
            product.tags, 
            product.category,
            product.price, 
            product.seo_score, 
            product.image_url,
            product.number_of_items || 'single',
            product.created_at || new Date().toISOString(), 
            product.updated_at || new Date().toISOString()
          );
        } catch (e) {
          // Already exists, skip
        }
      }
      
      // Migrate old junction table
      const hasOldJunction = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='product_patterns'").get() as any;
      if (hasOldJunction) {
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
    console.error('[Migration] Error migrating from legacy schema:', e);
  }
}

// Migrate listings table - recreate with clean schema
function migrateListingsTable() {
  try {
    // Check if listings table exists
    const tableInfo = db.prepare("PRAGMA table_info(listings)").all() as any[];
    const hasListingsTable = tableInfo.length > 0;
    
    // If table doesn't exist, create it
    if (!hasListingsTable) {
      console.log('[Migration] Creating new listings table...');
      db.exec(`
        CREATE TABLE listings (
          id TEXT PRIMARY KEY,
          product_template_id TEXT NOT NULL, -- Backward reference to product template
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          tags TEXT, -- JSON array (up to 13 tags)
          category TEXT,
          price REAL,
          quantity INTEGER,
          sku TEXT,
          photos TEXT, -- JSON array (up to 20 photos/videos)
          digital_files TEXT, -- JSON array (up to 5 files)
          digital_note TEXT,
          offer_personalization INTEGER DEFAULT 0, -- Boolean
          personalization_options TEXT, -- JSON array
          attributes TEXT, -- JSON object (craftType, occasion, holiday, etc.)
          materials TEXT, -- JSON array
          processing_time TEXT,
          shipping_profile_id TEXT,
          returns_accepted INTEGER DEFAULT 0, -- Boolean
          shop_section_id TEXT,
          featured INTEGER DEFAULT 0, -- Boolean
          renewal_option TEXT DEFAULT 'automatic', -- 'automatic' | 'manual'
          seo_score INTEGER,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_template_id) REFERENCES product_templates(id) ON DELETE CASCADE
        )
      `);
      console.log('[Migration] New listings table created');
      return; // Exit early - no migration needed
    }
    
    // Clean up any leftover backup table from a previous failed migration
    try {
      const hasBackup = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='listings_old_backup'").get() as any;
      if (hasBackup) {
        console.log('[Migration] Found leftover backup table from previous migration - cleaning up...');
        db.exec('DROP TABLE IF EXISTS listings_old_backup');
        console.log('[Migration] Backup table cleaned up');
      }
    } catch (cleanupError) {
      console.warn('[Migration] Could not check for leftover backup table:', cleanupError);
    }
    
    // Check for legacy columns
    const hasOldPatternId = tableInfo.some((col: any) => col.name === 'pattern_id');
    const hasOldProductId = tableInfo.some((col: any) => col.name === 'product_id');
    
    // If listings table exists with legacy columns, migrate it
    if (hasOldPatternId || hasOldProductId) {
      console.log('[Migration] Migrating listings table to clean schema...');
      
      // Backup existing listings data
      const existingListings = db.prepare('SELECT * FROM listings').all() as any[];
      const existingListingPatterns = db.prepare('SELECT * FROM listing_patterns').all() as any[];
      
      console.log(`[Migration] Found ${existingListings.length} existing listings to migrate`);
      
      // Temporarily disable foreign keys for migration
      db.pragma('foreign_keys = OFF');
      
      // Drop old table backup if it exists
      db.exec('DROP TABLE IF EXISTS listings_old_backup');
      db.exec('ALTER TABLE listings RENAME TO listings_old_backup');
      
      // Create new clean listings table
      db.exec(`
        CREATE TABLE listings (
          id TEXT PRIMARY KEY,
          product_template_id TEXT NOT NULL, -- Backward reference to product template
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          tags TEXT, -- JSON array (up to 13 tags)
          category TEXT,
          price REAL,
          quantity INTEGER,
          sku TEXT,
          photos TEXT, -- JSON array (up to 20 photos/videos)
          digital_files TEXT, -- JSON array (up to 5 files)
          digital_note TEXT,
          offer_personalization INTEGER DEFAULT 0, -- Boolean
          personalization_options TEXT, -- JSON array
          attributes TEXT, -- JSON object (craftType, occasion, holiday, etc.)
          materials TEXT, -- JSON array
          processing_time TEXT,
          shipping_profile_id TEXT,
          returns_accepted INTEGER DEFAULT 0, -- Boolean
          shop_section_id TEXT,
          featured INTEGER DEFAULT 0, -- Boolean
          renewal_option TEXT DEFAULT 'automatic', -- 'automatic' | 'manual'
          seo_score INTEGER,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_template_id) REFERENCES product_templates(id) ON DELETE CASCADE
        )
      `);
      
      // Migrate data from old table
      for (const oldListing of existingListings) {
        // Determine product_template_id
        let productTemplateId = oldListing.product_template_id;
        
        if (!productTemplateId) {
          if (oldListing.product_id) {
            productTemplateId = oldListing.product_id;
          } else if (oldListing.pattern_id) {
            // Find or create a product template for this pattern
            const existingTemplate = db.prepare(`
              SELECT pt.id FROM product_templates pt
              INNER JOIN product_template_patterns ptp ON pt.id = ptp.product_template_id
              WHERE ptp.pattern_id = ?
              LIMIT 1
            `).get(oldListing.pattern_id) as any;
            
            if (existingTemplate) {
              productTemplateId = existingTemplate.id;
            } else {
              // Create a default template
              const templateId = randomUUID();
              const now = new Date().toISOString();
              db.prepare(`
                INSERT INTO product_templates (id, name, type, status, number_of_items, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(templateId, 'Digital Download', JSON.stringify(['digital']), 'draft', 'single', now, now);
              
              // Link pattern to template
              db.prepare('INSERT INTO product_template_patterns (product_template_id, pattern_id, created_at) VALUES (?, ?, ?)')
                .run(templateId, oldListing.pattern_id, now);
              
              productTemplateId = templateId;
            }
          }
        }
        
        if (!productTemplateId) {
          console.warn(`[Migration] Skipping listing ${oldListing.id} - no product_template_id available`);
          continue;
        }
        
        // Insert into new table
        try {
          db.prepare(`
            INSERT INTO listings (
              id, product_template_id, title, description, tags, category, price,
              quantity, sku, photos, digital_files, digital_note, offer_personalization,
              personalization_options, attributes, materials, processing_time,
              shipping_profile_id, returns_accepted, shop_section_id, featured,
              renewal_option, seo_score, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            oldListing.id,
            productTemplateId,
            oldListing.title,
            oldListing.description,
            oldListing.tags || '[]',
            oldListing.category || null,
            oldListing.price || null,
            oldListing.quantity || null,
            oldListing.sku || null,
            oldListing.photos || null,
            oldListing.digital_files || null,
            oldListing.digital_note || null,
            oldListing.offer_personalization || 0,
            oldListing.personalization_options || null,
            oldListing.attributes || null,
            oldListing.materials || null,
            oldListing.processing_time || null,
            oldListing.shipping_profile_id || null,
            oldListing.returns_accepted || 0,
            oldListing.shop_section_id || null,
            oldListing.featured || 0,
            oldListing.renewal_option || 'automatic',
            oldListing.seo_score || null,
            oldListing.created_at,
            oldListing.updated_at
          );
          
          // Migrate pattern associations
          if (oldListing.pattern_id) {
            // Check if already in junction table
            const existing = db.prepare('SELECT * FROM listing_patterns WHERE listing_id = ? AND pattern_id = ?')
              .get(oldListing.id, oldListing.pattern_id) as any;
            if (!existing) {
              db.prepare('INSERT OR IGNORE INTO listing_patterns (listing_id, pattern_id, created_at) VALUES (?, ?, ?)')
                .run(oldListing.id, oldListing.pattern_id, oldListing.created_at || new Date().toISOString());
            }
          }
        } catch (e) {
          console.error(`[Migration] Error migrating listing ${oldListing.id}:`, e);
        }
      }
      
      // Restore any existing listing_patterns that weren't in the old table
      for (const lp of existingListingPatterns) {
        db.prepare('INSERT OR IGNORE INTO listing_patterns (listing_id, pattern_id, created_at) VALUES (?, ?, ?)')
          .run(lp.listing_id, lp.pattern_id, lp.created_at || new Date().toISOString());
      }
      
      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
      
      // Drop backup table only after successful migration
      try {
        db.exec('DROP TABLE IF EXISTS listings_old_backup');
        console.log('[Migration] Backup table cleaned up');
      } catch (dropError) {
        console.warn('[Migration] Could not drop backup table (may not exist):', dropError);
      }
      
      console.log('[Migration] Listings table migration complete');
    } else {
      // Table exists and is already in correct format - no migration needed
      console.log('[Migration] Listings table is already in correct format - no migration needed');
    }
  } catch (e) {
    console.error('[Migration] Error migrating listings table:', e);
    // If migration fails, try to restore from backup
    try {
      const hasBackup = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='listings_old_backup'").get() as any;
      if (hasBackup) {
        console.log('[Migration] Restoring from backup...');
        db.exec('DROP TABLE IF EXISTS listings');
        db.exec('ALTER TABLE listings_old_backup RENAME TO listings');
        console.log('[Migration] Backup restored successfully');
      } else {
        console.log('[Migration] No backup table found - migration may have failed before backup was created');
        // Ensure listings table exists even if migration failed
        const hasListings = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='listings'").get() as any;
        if (!hasListings) {
          console.log('[Migration] Creating listings table as fallback...');
          db.exec(`
            CREATE TABLE listings (
              id TEXT PRIMARY KEY,
              product_template_id TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              tags TEXT,
              category TEXT,
              price REAL,
              quantity INTEGER,
              sku TEXT,
              photos TEXT,
              digital_files TEXT,
              digital_note TEXT,
              offer_personalization INTEGER DEFAULT 0,
              personalization_options TEXT,
              attributes TEXT,
              materials TEXT,
              processing_time TEXT,
              shipping_profile_id TEXT,
              returns_accepted INTEGER DEFAULT 0,
              shop_section_id TEXT,
              featured INTEGER DEFAULT 0,
              renewal_option TEXT DEFAULT 'automatic',
              seo_score INTEGER,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (product_template_id) REFERENCES product_templates(id) ON DELETE CASCADE
            )
          `);
        }
      }
    } catch (restoreError) {
      console.error('[Migration] Failed to restore from backup:', restoreError);
      // Last resort: ensure listings table exists
      try {
        const hasListings = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='listings'").get() as any;
        if (!hasListings) {
          console.log('[Migration] Creating listings table as last resort...');
          db.exec(`
            CREATE TABLE listings (
              id TEXT PRIMARY KEY,
              product_template_id TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              tags TEXT,
              category TEXT,
              price REAL,
              quantity INTEGER,
              sku TEXT,
              photos TEXT,
              digital_files TEXT,
              digital_note TEXT,
              offer_personalization INTEGER DEFAULT 0,
              personalization_options TEXT,
              attributes TEXT,
              materials TEXT,
              processing_time TEXT,
              shipping_profile_id TEXT,
              returns_accepted INTEGER DEFAULT 0,
              shop_section_id TEXT,
              featured INTEGER DEFAULT 0,
              renewal_option TEXT DEFAULT 'automatic',
              seo_score INTEGER,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (product_template_id) REFERENCES product_templates(id) ON DELETE CASCADE
            )
          `);
        }
      } catch (finalError) {
        console.error('[Migration] Failed to create listings table as fallback:', finalError);
      }
    }
  }
}

// Initialize on import
initDatabase();

export default db;
