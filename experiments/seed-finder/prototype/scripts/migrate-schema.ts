import db from '../lib/db';

/**
 * Migrate existing database to hybrid schema
 * Adds new columns to existing tables if they don't exist
 */
function migrateSchema() {
  console.log('🔄 Migrating database schema...\n');

  try {
    // Check if usda_symbol column exists in seeds table
    const seedsColumns = db.prepare("PRAGMA table_info(seeds)").all() as any[];
    const hasUsdaSymbol = seedsColumns.some((col: any) => col.name === 'usda_symbol');
    const hasFamily = seedsColumns.some((col: any) => col.name === 'family');

    if (!hasUsdaSymbol) {
      console.log('  Adding usda_symbol column to seeds table...');
      db.exec('ALTER TABLE seeds ADD COLUMN usda_symbol TEXT');
    }

    if (!hasFamily) {
      console.log('  Adding family column to seeds table...');
      db.exec('ALTER TABLE seeds ADD COLUMN family TEXT');
    }

    // Check if usda_plants table exists
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='usda_plants'
    `).get() as any;

    if (!tables) {
      console.log('  Creating usda_plants table...');
      db.exec(`
        CREATE TABLE usda_plants (
          symbol TEXT PRIMARY KEY,
          synonym_symbol TEXT,
          scientific_name TEXT NOT NULL,
          scientific_name_full TEXT,
          common_name TEXT,
          family TEXT,
          imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // Check if plant_hardiness_zones table exists
    const zonesTable = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='plant_hardiness_zones'
    `).get() as any;

    if (!zonesTable) {
      console.log('  Creating plant_hardiness_zones table...');
      db.exec(`
        CREATE TABLE plant_hardiness_zones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plant_symbol TEXT NOT NULL,
          hardiness_zone INTEGER NOT NULL,
          source TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(plant_symbol, hardiness_zone)
        );
      `);
    }

    // Create indexes
    console.log('  Creating indexes...');
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_usda_plants_scientific_name ON usda_plants(scientific_name);
      CREATE INDEX IF NOT EXISTS idx_usda_plants_common_name ON usda_plants(common_name);
      CREATE INDEX IF NOT EXISTS idx_usda_plants_family ON usda_plants(family);
      CREATE INDEX IF NOT EXISTS idx_plant_hardiness_zones_symbol ON plant_hardiness_zones(plant_symbol);
      CREATE INDEX IF NOT EXISTS idx_plant_hardiness_zones_zone ON plant_hardiness_zones(hardiness_zone);
      CREATE INDEX IF NOT EXISTS idx_seeds_usda_symbol ON seeds(usda_symbol);
    `);

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateSchema();

