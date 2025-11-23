import db from '../lib/db';
import { addHardinessZonesForPlant } from '../lib/data';

/**
 * Add hardiness zones for common garden plants
 * 
 * This script helps populate hardiness zone data for plants.
 * Zones are based on common gardening knowledge and seed packet information.
 * 
 * Usage:
 *   - Edit the plantZones array below
 *   - Run: npm run add-zones (or tsx scripts/add-hardiness-zones.ts)
 */

interface PlantZone {
  symbol: string;  // USDA symbol or seed id
  zones: number[];
  source: string;  // 'manual', 'seed-packet', 'extension', etc.
  notes?: string;
}

// Common garden plants with hardiness zones
// Add more plants here as you research them
const plantZones: PlantZone[] = [
  // Vegetables
  {
    symbol: 'SOLY',  // Solanum lycopersicum (Tomato)
    zones: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    source: 'seed-packet',
    notes: 'Annual, grown as annual in all zones'
  },
  {
    symbol: 'LASA',  // Lactuca sativa (Lettuce)
    zones: [4, 5, 6, 7, 8, 9, 10],
    source: 'seed-packet',
    notes: 'Cool season crop'
  },
  {
    symbol: 'CAAN',  // Capsicum annuum (Bell Pepper)
    zones: [9, 10, 11],
    source: 'seed-packet',
    notes: 'Warm season, perennial in zones 9-11'
  },
  {
    symbol: 'DACA2',  // Daucus carota (Carrot)
    zones: [3, 4, 5, 6, 7, 8, 9, 10],
    source: 'seed-packet',
    notes: 'Cool season crop'
  },
  {
    symbol: 'CUSA',  // Cucumis sativus (Cucumber)
    zones: [4, 5, 6, 7, 8, 9, 10],
    source: 'seed-packet',
    notes: 'Warm season annual'
  },
  
  // Herbs
  {
    symbol: 'OCBA',  // Ocimum basilicum (Basil)
    zones: [4, 5, 6, 7, 8, 9, 10],
    source: 'seed-packet',
    notes: 'Annual, frost tender'
  },
  {
    symbol: 'ORVU',  // Origanum vulgare (Oregano)
    zones: [4, 5, 6, 7, 8, 9, 10],
    source: 'seed-packet',
    notes: 'Perennial herb'
  },
  {
    symbol: 'THVU',  // Thymus vulgaris (Thyme)
    zones: [5, 6, 7, 8, 9, 10],
    source: 'seed-packet',
    notes: 'Perennial herb'
  },
  {
    symbol: 'COSA',  // Coriandrum sativum (Cilantro)
    zones: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    source: 'seed-packet',
    notes: 'Cool season annual'
  },
  {
    symbol: 'PECR2',  // Petroselinum crispum (Parsley)
    zones: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    source: 'seed-packet',
    notes: 'Biennial, grown as annual'
  },
  
  // Flowers
  {
    symbol: 'ZIEL',  // Zinnia elegans (Zinnia)
    zones: [3, 4, 5, 6, 7, 8, 9, 10],
    source: 'seed-packet',
    notes: 'Annual flower'
  },
  {
    symbol: 'TAPA',  // Tagetes patula (Marigold)
    zones: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    source: 'seed-packet',
    notes: 'Annual flower'
  },
  {
    symbol: 'HEAN3',  // Helianthus annuus (Sunflower)
    zones: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    source: 'seed-packet',
    notes: 'Annual flower'
  },
  {
    symbol: 'TRMA',  // Tropaeolum majus (Nasturtium)
    zones: [9, 10, 11],
    source: 'seed-packet',
    notes: 'Annual in most zones, perennial in warm zones'
  },
  {
    symbol: 'COBI',  // Cosmos bipinnatus (Cosmos)
    zones: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    source: 'seed-packet',
    notes: 'Annual flower'
  },
];

/**
 * Add hardiness zones for all plants in the list
 */
function addZones() {
  console.log('🌱 Adding hardiness zones for garden plants...\n');
  
  let added = 0;
  let skipped = 0;
  
  for (const plant of plantZones) {
    try {
      // Check if zones already exist
      const existing = db.prepare(`
        SELECT COUNT(*) as count 
        FROM plant_hardiness_zones 
        WHERE plant_symbol = ?
      `).get(plant.symbol) as any;
      
      if (existing.count > 0) {
        console.log(`⏭️  Skipping ${plant.symbol} (zones already exist)`);
        skipped++;
        continue;
      }
      
      // Add zones
      addHardinessZonesForPlant(plant.symbol, plant.zones, plant.source);
      console.log(`✅ Added zones ${plant.zones.join(', ')} for ${plant.symbol}${plant.notes ? ` (${plant.notes})` : ''}`);
      added++;
    } catch (error) {
      console.error(`❌ Error adding zones for ${plant.symbol}:`, error);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   - Added: ${added} plants`);
  console.log(`   - Skipped: ${skipped} plants`);
  console.log(`   - Total: ${plantZones.length} plants`);
  
  // Show statistics
  const stats = db.prepare(`
    SELECT 
      COUNT(DISTINCT plant_symbol) as total_plants,
      COUNT(*) as total_zone_mappings
    FROM plant_hardiness_zones
  `).get() as any;
  
  console.log(`\n📈 Database Statistics:`);
  console.log(`   - Plants with zones: ${stats.total_plants}`);
  console.log(`   - Total zone mappings: ${stats.total_zone_mappings}`);
}

// Run
try {
  addZones();
} catch (error) {
  console.error('❌ Failed to add zones:', error);
  process.exit(1);
}

