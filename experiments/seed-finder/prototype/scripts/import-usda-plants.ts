import db from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

interface USDAPlantRow {
  symbol: string;
  synonym_symbol: string;
  scientific_name: string;
  common_name: string;
  family: string;
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Extract binomial from scientific name (remove author)
 * Example: "Solanum lycopersicum L." -> "Solanum lycopersicum"
 */
function extractBinomial(scientificName: string): string {
  // Remove author (everything after the binomial)
  // Authors typically start with uppercase letter or parentheses
  const match = scientificName.match(/^([A-Z][a-z]+(?:\s+[a-z]+)+)/);
  if (match) {
    return match[1].trim();
  }
  // Fallback: return as-is if no clear pattern
  return scientificName.trim();
}

/**
 * Import USDA Plants database from CSV
 */
function importUSDAPlants() {
  const csvPath = path.join(process.cwd(), 'data', 'plantlst.txt');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ USDA Plants CSV not found at:', csvPath);
    process.exit(1);
  }

  console.log('📖 Reading USDA Plants CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    console.error('❌ CSV file is empty');
    process.exit(1);
  }

  // Skip header
  const dataLines = lines.slice(1);
  console.log(`📊 Found ${dataLines.length.toLocaleString()} plant records\n`);

  // Prepare insert statement
  const insert = db.prepare(`
    INSERT OR REPLACE INTO usda_plants (
      symbol,
      synonym_symbol,
      scientific_name,
      scientific_name_full,
      common_name,
      family
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Process in batches for better performance
  const batchSize = 1000;
  let processed = 0;
  let inserted = 0;
  let errors = 0;

  const transaction = db.transaction(() => {
    for (let i = 0; i < dataLines.length; i++) {
      try {
        const values = parseCSVLine(dataLines[i]);
        
        if (values.length < 5) {
          errors++;
          continue;
        }

        const symbol = values[0] || '';
        const synonymSymbol = values[1] || '';
        const scientificNameFull = values[2] || '';
        const commonName = values[3] || '';
        const family = values[4] || '';

        // Skip if no symbol or scientific name
        if (!symbol || !scientificNameFull) {
          errors++;
          continue;
        }

        // Extract clean binomial
        const scientificName = extractBinomial(scientificNameFull);

        insert.run(
          symbol,
          synonymSymbol || null,
          scientificName,
          scientificNameFull,
          commonName || null,
          family || null
        );

        inserted++;
        processed++;

        // Progress update
        if (processed % batchSize === 0) {
          console.log(`  Processed ${processed.toLocaleString()} / ${dataLines.length.toLocaleString()} records...`);
        }
      } catch (error) {
        errors++;
        if (errors <= 10) {
          console.warn(`  Warning: Error processing line ${i + 2}:`, error);
        }
      }
    }
  });

  console.log('🔄 Importing into database...');
  transaction();

  console.log('\n✅ Import complete!');
  console.log(`   - Processed: ${processed.toLocaleString()} records`);
  console.log(`   - Inserted: ${inserted.toLocaleString()} plants`);
  console.log(`   - Errors: ${errors.toLocaleString()}`);

  // Show statistics
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(common_name) as with_common_name,
      COUNT(DISTINCT family) as unique_families
    FROM usda_plants
  `).get() as any;

  console.log('\n📈 Database Statistics:');
  console.log(`   - Total plants: ${stats.total.toLocaleString()}`);
  console.log(`   - With common names: ${stats.with_common_name.toLocaleString()} (${(stats.with_common_name / stats.total * 100).toFixed(1)}%)`);
  console.log(`   - Unique families: ${stats.unique_families.toLocaleString()}`);
}

// Run import
try {
  importUSDAPlants();
} catch (error) {
  console.error('❌ Import failed:', error);
  process.exit(1);
}

