import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

  // Products table (different offerings from a pattern: PDF, SVG, kit, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('printable-pdf', 'svg', 'kit', 'custom')),
      status TEXT NOT NULL CHECK(status IN ('draft', 'ready', 'listed')),
      title TEXT,
      description TEXT,
      tags TEXT, -- JSON array
      category TEXT,
      price REAL,
      seo_score INTEGER,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id)
    )
  `);
  
  // Add image_url column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE products ADD COLUMN image_url TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Listings table (legacy - will be migrated to products)
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      tags TEXT NOT NULL, -- JSON array
      category TEXT,
      price REAL,
      seo_score INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id)
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

// Initialize on import
initDatabase();

export default db;

