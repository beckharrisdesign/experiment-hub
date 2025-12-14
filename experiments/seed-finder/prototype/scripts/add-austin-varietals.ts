import { addRecommendedVarietal } from '../lib/data';

/**
 * Add Austin, Texas recommended varietals for our initial seed list
 * Based on research in AUSTIN_VARIETAL_RESEARCH.md
 */

interface VarietalData {
  seedId: string;
  plantSymbol?: string | null;
  location: string;
  varietals: Array<{
    name: string;
    heatTolerance: string;
    diseaseResistance?: string;
    notes?: string;
    isPrimary?: boolean;
  }>;
}

const austinVarietals: VarietalData[] = [
  // Roma Tomato
  {
    seedId: '1', // Roma Tomato from seed-db.ts
    location: 'Austin, TX',
    varietals: [
      {
        name: 'Roma VF',
        heatTolerance: 'Excellent',
        diseaseResistance: 'Verticillium and Fusarium resistant',
        notes: 'Improved Roma with disease resistance, better heat tolerance than standard Roma',
        isPrimary: true,
      },
      {
        name: 'Amish Paste',
        heatTolerance: 'Excellent',
        notes: 'Large paste tomato (4-8 oz), more heat tolerant than San Marzano, excellent flavor',
        isPrimary: true,
      },
      {
        name: 'Juliet',
        heatTolerance: 'Excellent',
        notes: 'Small paste tomato (1-2 oz), cherry-sized, very heat tolerant',
        isPrimary: false,
      },
    ],
  },
  
  // Zinnia
  {
    seedId: '3', // Zinnia from seed-db.ts
    location: 'Austin, TX',
    varietals: [
      {
        name: 'Profusion Series',
        heatTolerance: 'Excellent',
        diseaseResistance: 'High (powdery mildew resistant)',
        notes: 'Hybrid (Z. elegans × Z. angustifolia), compact (12-18"), continuous blooms, mounding habit. Varieties: Profusion Cherry, Profusion White, Profusion Orange',
        isPrimary: true,
      },
      {
        name: 'Zahara Series',
        heatTolerance: 'Excellent',
        diseaseResistance: 'High (mildew, leaf spot resistant)',
        notes: 'Medium-sized blooms, single/semi-double flowers. Varieties: Zahara Starlight Rose, Zahara Raspberry Ripple',
        isPrimary: true,
      },
      {
        name: 'Zinnia angustifolia (Narrowleaf Zinnia)',
        heatTolerance: 'Excellent',
        diseaseResistance: 'Excellent',
        notes: 'Native to Southwest, extremely heat/drought tolerant. Varieties: Crystal White, Star Gold',
        isPrimary: false,
      },
      {
        name: 'Benary\'s Giant Series',
        heatTolerance: 'Good',
        notes: 'Large blooms (6" across), tall (3-4\'), long stems, excellent for cut flowers',
        isPrimary: false,
      },
    ],
  },
  
  // Basil
  // Note: "Genovese Basil" (seed id 2) is a cultivar of Ocimum basilicum
  // The recommended varietals are OTHER basil cultivars that work well in Austin
  {
    seedId: '2', // Genovese Basil from seed-db.ts
    location: 'Austin, TX',
    varietals: [
      {
        name: 'Thai Basil',
        heatTolerance: 'Excellent',
        notes: 'More heat tolerant than Genovese, purple stems, Asian variety (Ocimum basilicum var. thyrsiflora)',
        isPrimary: true,
      },
      {
        name: 'Lemon Basil',
        heatTolerance: 'Good',
        notes: 'Citrus flavor, good heat tolerance (Ocimum × citriodorum)',
        isPrimary: false,
      },
      {
        name: 'Purple Basil',
        heatTolerance: 'Good',
        notes: 'Decorative purple leaves, similar heat tolerance to Genovese',
        isPrimary: false,
      },
      {
        name: 'Spicy Globe Basil',
        heatTolerance: 'Good',
        notes: 'Compact growth, good for containers, good heat tolerance',
        isPrimary: false,
      },
    ],
  },
  
  // Lettuce
  {
    seedId: '4', // Lettuce from seed-db.ts
    location: 'Austin, TX',
    varietals: [
      {
        name: 'Romaine varieties',
        heatTolerance: 'Moderate',
        notes: 'More heat tolerant than leaf lettuce. Best grown in early spring (Feb-Apr) or fall (Sep-Nov). Summer is too hot.',
        isPrimary: true,
      },
      {
        name: 'Buttercrunch',
        heatTolerance: 'Moderate',
        notes: 'Butterhead type, slower to bolt than some varieties',
        isPrimary: false,
      },
    ],
  },
  
  // Marigold
  {
    seedId: '6', // Marigold from seed-db.ts
    location: 'Austin, TX',
    varietals: [
      {
        name: 'French Marigold',
        heatTolerance: 'Excellent',
        notes: 'Compact, small flowers, pest-repellent, excellent heat tolerance',
        isPrimary: true,
      },
      {
        name: 'African Marigold',
        heatTolerance: 'Excellent',
        notes: 'Large flowers, tall plants, excellent heat tolerance',
        isPrimary: false,
      },
    ],
  },
  
  // Sunflower
  {
    seedId: '9', // Sunflower from seed-db.ts
    location: 'Austin, TX',
    varietals: [
      {
        name: 'Mammoth Sunflower',
        heatTolerance: 'Excellent',
        notes: 'Very tall (10-12\'), large heads, classic variety',
        isPrimary: true,
      },
      {
        name: 'Autumn Beauty Mix',
        heatTolerance: 'Excellent',
        notes: 'Multi-colored, branching habit, heat tolerant mix',
        isPrimary: true,
      },
      {
        name: 'Lemon Queen',
        heatTolerance: 'Excellent',
        notes: 'Pale yellow, branching habit, good for pollinators',
        isPrimary: false,
      },
    ],
  },
];

function addAustinVarietals() {
  console.log('🌱 Adding Austin, TX recommended varietals...\n');
  
  let added = 0;
  let skipped = 0;
  
  for (const data of austinVarietals) {
    for (const varietal of data.varietals) {
      try {
        // Check if already exists
        const existing = db.prepare(`
          SELECT COUNT(*) as count 
          FROM recommended_varietals 
          WHERE seed_id = ? AND location = ? AND variety_name = ?
        `).get(data.seedId, data.location, varietal.name) as any;
        
        if (existing.count > 0) {
          console.log(`⏭️  Skipping ${varietal.name} for seed ${data.seedId} (already exists)`);
          skipped++;
          continue;
        }
        
        addRecommendedVarietal(
          data.seedId,
          data.plantSymbol || null,
          data.location,
          varietal.name,
          {
            heatTolerance: varietal.heatTolerance,
            diseaseResistance: varietal.diseaseResistance,
            notes: varietal.notes,
            source: 'Austin Varietal Research',
            isPrimary: varietal.isPrimary || false,
          }
        );
        
        const primary = varietal.isPrimary ? ' (PRIMARY)' : '';
        console.log(`✅ Added ${varietal.name}${primary} for seed ${data.seedId}`);
        added++;
      } catch (error) {
        console.error(`❌ Error adding ${varietal.name} for seed ${data.seedId}:`, error);
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   - Added: ${added} varietals`);
  console.log(`   - Skipped: ${skipped} varietals`);
  
  // Show statistics
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_varietals,
      COUNT(DISTINCT seed_id) as seeds_with_varietals,
      COUNT(DISTINCT location) as locations
    FROM recommended_varietals
  `).get() as any;
  
  console.log(`\n📈 Database Statistics:`);
  console.log(`   - Total varietals: ${stats.total_varietals}`);
  console.log(`   - Seeds with varietals: ${stats.seeds_with_varietals}`);
  console.log(`   - Locations: ${stats.locations}`);
}

// Import db for checking existing records
import db from '../lib/db';

// Run
try {
  addAustinVarietals();
} catch (error) {
  console.error('❌ Failed to add varietals:', error);
  process.exit(1);
}

