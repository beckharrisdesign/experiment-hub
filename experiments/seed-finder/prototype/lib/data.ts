import db from './db';

export interface Seed {
  id: string;
  english_name: string;
  latin_name: string | null;
  category: string | null;
  hardiness_zones: number[];
  usda_symbol?: string | null;
  family?: string | null;
  created_at: string;
  updated_at: string;
}

export interface USDAPlant {
  symbol: string;
  synonym_symbol: string | null;
  scientific_name: string;
  scientific_name_full: string;
  common_name: string | null;
  family: string | null;
  imported_at: string;
}

export interface ZipHardiness {
  zip_code: string;
  hardiness_zone: number;
  city: string | null;
  state: string | null;
}

export function getZipHardiness(zipCode: string): ZipHardiness | null {
  const row = db.prepare('SELECT * FROM zip_hardiness WHERE zip_code = ?').get(zipCode) as any;
  if (!row) return null;
  
  return {
    zip_code: row.zip_code,
    hardiness_zone: row.hardiness_zone,
    city: row.city,
    state: row.state,
  };
}

export function getSeedsByHardinessZone(zone: number): Seed[] {
  const rows = db.prepare('SELECT * FROM seeds').all() as any[];
  
  const seeds: Seed[] = [];
  
  for (const row of rows) {
    try {
      // Try to get zones from hardiness_zones JSON field first
      let zones: number[] = [];
      if (row.hardiness_zones) {
        zones = JSON.parse(row.hardiness_zones) as number[];
      }
      
      // If seed has USDA symbol, also check plant_hardiness_zones table
      if (row.usda_symbol && zones.length === 0) {
        zones = getHardinessZonesForPlant(row.usda_symbol);
      }
      
      // Only include if this seed has the requested zone
      if (zones.includes(zone)) {
        seeds.push({
          id: row.id,
          english_name: row.english_name,
          latin_name: row.latin_name,
          category: row.category,
          hardiness_zones: zones,
          usda_symbol: row.usda_symbol || null,
          family: row.family || null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
      }
    } catch {
      // Skip invalid rows
      continue;
    }
  }
  
  return seeds;
}

export function getAllSeeds(): Seed[] {
  const rows = db.prepare('SELECT * FROM seeds').all() as any[];
  
  return rows.map(row => {
    try {
      let zones: number[] = [];
      if (row.hardiness_zones) {
        zones = JSON.parse(row.hardiness_zones) as number[];
      }
      
      // If seed has USDA symbol, also check plant_hardiness_zones table
      if (row.usda_symbol && zones.length === 0) {
        zones = getHardinessZonesForPlant(row.usda_symbol);
      }
      
      return {
        id: row.id,
        english_name: row.english_name,
        latin_name: row.latin_name,
        category: row.category,
        hardiness_zones: zones,
        usda_symbol: row.usda_symbol || null,
        family: row.family || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch {
      return {
        id: row.id,
        english_name: row.english_name,
        latin_name: row.latin_name,
        category: row.category,
        hardiness_zones: [],
        usda_symbol: row.usda_symbol || null,
        family: row.family || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }
  });
}

export function getSeedBySlug(slug: string): Seed | null {
  // Find seed by matching slug (english_name converted to slug)
  const allSeeds = getAllSeeds();
  const seed = allSeeds.find(s => 
    s.english_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === slug.toLowerCase()
  );
  
  return seed || null;
}

export function getZipsForSeed(seed: Seed): ZipHardiness[] {
  const rows = db.prepare('SELECT * FROM zip_hardiness').all() as any[];
  
  return rows
    .map(row => ({
      zip_code: row.zip_code,
      hardiness_zone: row.hardiness_zone,
      city: row.city,
      state: row.state,
    }))
    .filter(zip => seed.hardiness_zones.includes(zip.hardiness_zone))
    .slice(0, 5); // Limit to 5 example zip codes
}

export function getAllZipCodes(): ZipHardiness[] {
  const rows = db.prepare('SELECT * FROM zip_hardiness ORDER BY city, state').all() as any[];
  
  return rows.map(row => ({
    zip_code: row.zip_code,
    hardiness_zone: row.hardiness_zone,
    city: row.city,
    state: row.state,
  }));
}

export function getZipCodesByHardinessZone(zone: number): ZipHardiness[] {
  const rows = db.prepare('SELECT * FROM zip_hardiness WHERE hardiness_zone = ? ORDER BY city, state').all(zone) as any[];
  
  return rows.map(row => ({
    zip_code: row.zip_code,
    hardiness_zone: row.hardiness_zone,
    city: row.city,
    state: row.state,
  }));
}

// ============================================================================
// USDA Plants Functions
// ============================================================================

/**
 * Get USDA Plant by symbol
 */
export function getUSDAPlantBySymbol(symbol: string): USDAPlant | null {
  const row = db.prepare('SELECT * FROM usda_plants WHERE symbol = ?').get(symbol) as any;
  if (!row) return null;
  
  return {
    symbol: row.symbol,
    synonym_symbol: row.synonym_symbol,
    scientific_name: row.scientific_name,
    scientific_name_full: row.scientific_name_full,
    common_name: row.common_name,
    family: row.family,
    imported_at: row.imported_at,
  };
}

/**
 * Search USDA Plants by scientific name (partial match)
 */
export function searchUSDAPlantsByScientificName(query: string, limit: number = 10): USDAPlant[] {
  const rows = db.prepare(`
    SELECT * FROM usda_plants 
    WHERE scientific_name LIKE ? 
    ORDER BY scientific_name
    LIMIT ?
  `).all(`%${query}%`, limit) as any[];
  
  return rows.map(row => ({
    symbol: row.symbol,
    synonym_symbol: row.synonym_symbol,
    scientific_name: row.scientific_name,
    scientific_name_full: row.scientific_name_full,
    common_name: row.common_name,
    family: row.family,
    imported_at: row.imported_at,
  }));
}

/**
 * Search USDA Plants by common name (partial match)
 */
export function searchUSDAPlantsByCommonName(query: string, limit: number = 10): USDAPlant[] {
  const rows = db.prepare(`
    SELECT * FROM usda_plants 
    WHERE common_name LIKE ? 
    ORDER BY common_name
    LIMIT ?
  `).all(`%${query}%`, limit) as any[];
  
  return rows.map(row => ({
    symbol: row.symbol,
    synonym_symbol: row.synonym_symbol,
    scientific_name: row.scientific_name,
    scientific_name_full: row.scientific_name_full,
    common_name: row.common_name,
    family: row.family,
    imported_at: row.imported_at,
  }));
}

// ============================================================================
// Hardiness Zone Functions
// ============================================================================

/**
 * Get hardiness zones for a plant (by symbol or seed id)
 */
export function getHardinessZonesForPlant(plantSymbol: string): number[] {
  const rows = db.prepare(`
    SELECT hardiness_zone 
    FROM plant_hardiness_zones 
    WHERE plant_symbol = ?
    ORDER BY hardiness_zone
  `).all(plantSymbol) as any[];
  
  return rows.map(row => row.hardiness_zone);
}

/**
 * Add hardiness zones for a plant
 */
export function addHardinessZonesForPlant(
  plantSymbol: string, 
  zones: number[], 
  source: string = 'manual'
): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO plant_hardiness_zones (plant_symbol, hardiness_zone, source)
    VALUES (?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    zones.forEach(zone => {
      insert.run(plantSymbol, zone, source);
    });
  });
  
  transaction();
}

/**
 * Get all plants (seeds + USDA) with hardiness zones for a given zone
 */
export function getPlantsByHardinessZone(zone: number): (Seed | USDAPlant)[] {
  // Get plant symbols that have this hardiness zone
  const plantSymbols = db.prepare(`
    SELECT DISTINCT plant_symbol 
    FROM plant_hardiness_zones 
    WHERE hardiness_zone = ?
  `).all(zone) as any[];
  
  const results: (Seed | USDAPlant)[] = [];
  
  // Get seeds with matching zones
  const seeds = getSeedsByHardinessZone(zone);
  results.push(...seeds);
  
  // Get USDA plants with matching zones
  for (const row of plantSymbols) {
    const symbol = row.plant_symbol;
    
    // Skip if already in seeds
    if (seeds.some(s => s.usda_symbol === symbol)) {
      continue;
    }
    
    const usdaPlant = getUSDAPlantBySymbol(symbol);
    if (usdaPlant) {
      results.push(usdaPlant);
    }
  }
  
  return results;
}

/**
 * Get all USDA Plants with pagination
 */
export function getAllUSDAPlants(limit: number = 50, offset: number = 0): USDAPlant[] {
  const rows = db.prepare(`
    SELECT * FROM usda_plants 
    ORDER BY scientific_name
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[];
  
  return rows.map(row => ({
    symbol: row.symbol,
    synonym_symbol: row.synonym_symbol,
    scientific_name: row.scientific_name,
    scientific_name_full: row.scientific_name_full,
    common_name: row.common_name,
    family: row.family,
    imported_at: row.imported_at,
  }));
}

/**
 * Get total count of USDA Plants
 */
export function getUSDAPlantsCount(): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM usda_plants').get() as any;
  return result.count;
}

/**
 * Get USDA Plants by family
 */
export function getUSDAPlantsByFamily(family: string, limit: number = 50): USDAPlant[] {
  const rows = db.prepare(`
    SELECT * FROM usda_plants 
    WHERE family = ?
    ORDER BY scientific_name
    LIMIT ?
  `).all(family, limit) as any[];
  
  return rows.map(row => ({
    symbol: row.symbol,
    synonym_symbol: row.synonym_symbol,
    scientific_name: row.scientific_name,
    scientific_name_full: row.scientific_name_full,
    common_name: row.common_name,
    family: row.family,
    imported_at: row.imported_at,
  }));
}

/**
 * Get all unique families from USDA Plants
 */
export function getAllUSDAFamilies(): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT family 
    FROM usda_plants 
    WHERE family IS NOT NULL AND family != ''
    ORDER BY family
  `).all() as any[];
  
  return rows.map(row => row.family);
}

