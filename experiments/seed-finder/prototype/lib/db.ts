import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'seeds.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize base schema (backward compatible)
db.exec(`
  -- Original seeds table (for backward compatibility and manual entries)
  CREATE TABLE IF NOT EXISTS seeds (
    id TEXT PRIMARY KEY,
    english_name TEXT NOT NULL,
    latin_name TEXT,
    category TEXT,
    hardiness_zones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Zip code to hardiness zone mapping
  CREATE TABLE IF NOT EXISTS zip_hardiness (
    zip_code TEXT PRIMARY KEY,
    hardiness_zone INTEGER NOT NULL,
    city TEXT,
    state TEXT
  );
`);

// Migrate existing schema if needed (add new columns if they don't exist)
try {
  const seedsColumns = db.prepare("PRAGMA table_info(seeds)").all() as any[];
  const hasUsdaSymbol = seedsColumns.some((col: any) => col.name === 'usda_symbol');
  const hasFamily = seedsColumns.some((col: any) => col.name === 'family');

  if (!hasUsdaSymbol) {
    db.exec('ALTER TABLE seeds ADD COLUMN usda_symbol TEXT');
  }
  if (!hasFamily) {
    db.exec('ALTER TABLE seeds ADD COLUMN family TEXT');
  }
} catch (error) {
  // Ignore errors if columns already exist or table doesn't exist yet
}

// Initialize new tables for hybrid approach
db.exec(`
  -- USDA Plants database table
  CREATE TABLE IF NOT EXISTS usda_plants (
    symbol TEXT PRIMARY KEY,
    synonym_symbol TEXT,
    scientific_name TEXT NOT NULL,
    scientific_name_full TEXT,
    common_name TEXT,
    family TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Hardiness zone mapping (links plants to zones)
  CREATE TABLE IF NOT EXISTS plant_hardiness_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_symbol TEXT NOT NULL,
    hardiness_zone INTEGER NOT NULL,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plant_symbol, hardiness_zone)
  );
`);

// Create indexes (only if tables/columns exist)
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_usda_plants_scientific_name ON usda_plants(scientific_name);
    CREATE INDEX IF NOT EXISTS idx_usda_plants_common_name ON usda_plants(common_name);
    CREATE INDEX IF NOT EXISTS idx_usda_plants_family ON usda_plants(family);
    CREATE INDEX IF NOT EXISTS idx_plant_hardiness_zones_symbol ON plant_hardiness_zones(plant_symbol);
    CREATE INDEX IF NOT EXISTS idx_plant_hardiness_zones_zone ON plant_hardiness_zones(hardiness_zone);
  `);
  
  // Only create this index if usda_symbol column exists
  const seedsColumns = db.prepare("PRAGMA table_info(seeds)").all() as any[];
  const hasUsdaSymbol = seedsColumns.some((col: any) => col.name === 'usda_symbol');
  if (hasUsdaSymbol) {
    db.exec('CREATE INDEX IF NOT EXISTS idx_seeds_usda_symbol ON seeds(usda_symbol)');
  }
} catch (error) {
  // Ignore index creation errors
}

export default db;

