# Hybrid Approach: USDA Plants + Hardiness Zones

## Overview

The Seed Finder prototype uses a **hybrid approach** that combines:
1. **USDA Plants Database** - Comprehensive plant identification and metadata
2. **Hardiness Zone Mapping** - Separate table linking plants to hardiness zones
3. **Seeds Table** - Can link to USDA Plants or exist independently

This approach allows us to leverage the authoritative USDA Plants database while supplementing it with hardiness zone data from other sources.

---

## Database Schema

### Core Tables

#### `seeds` (Enhanced)
- Original fields: `id`, `english_name`, `latin_name`, `category`, `hardiness_zones`
- New fields: `usda_symbol`, `family`
- Can work independently OR link to USDA Plants via `usda_symbol`

#### `usda_plants`
- Stores all USDA Plants database records
- Fields: `symbol`, `synonym_symbol`, `scientific_name`, `scientific_name_full`, `common_name`, `family`
- Imported from `data/plantlst.txt`

#### `plant_hardiness_zones`
- Links plants to hardiness zones
- Fields: `plant_symbol`, `hardiness_zone`, `source`
- Can reference either USDA symbol or seed id
- Supports multiple sources: 'usda', 'manual', 'external'

#### `zip_hardiness`
- Maps zip codes to hardiness zones
- Unchanged from original schema

---

## Usage

### 1. Migrate Existing Database

If you have an existing database, run the migration to add new columns:

```bash
npm run migrate
```

This will:
- Add `usda_symbol` and `family` columns to `seeds` table
- Create `usda_plants` and `plant_hardiness_zones` tables
- Create necessary indexes

### 2. Import USDA Plants Database

Import the USDA Plants CSV file:

```bash
npm run import-usda
```

This will:
- Parse `data/plantlst.txt`
- Extract clean binomial names (removes authors)
- Import ~93,000 plant records
- Show progress and statistics

**Note**: This may take a few minutes for 93K+ records.

### 3. Add Hardiness Zones

Hardiness zones are stored separately. You can add them manually or via script:

```typescript
import { addHardinessZonesForPlant } from '@/lib/data';

// Add zones for a USDA plant
addHardinessZonesForPlant('SOLY', [5, 6, 7, 8, 9, 10], 'manual');

// Add zones for a seed (by id)
addHardinessZonesForPlant('seed-1', [4, 5, 6, 7, 8], 'manual');
```

### 4. Link Seeds to USDA Plants

When creating seeds, you can link them to USDA Plants:

```typescript
// Seed linked to USDA Plant
{
  id: 'tomato-roma',
  english_name: 'Roma Tomato',
  latin_name: 'Solanum lycopersicum',
  usda_symbol: 'SOLY',  // Links to USDA Plants
  category: 'vegetable',
  // hardiness_zones can be in JSON or fetched from plant_hardiness_zones
}
```

---

## Data Access Functions

### USDA Plants

```typescript
import {
  getUSDAPlantBySymbol,
  searchUSDAPlantsByScientificName,
  searchUSDAPlantsByCommonName,
} from '@/lib/data';

// Get by symbol
const plant = getUSDAPlantBySymbol('SOLY');

// Search by scientific name
const results = searchUSDAPlantsByScientificName('Solanum', 10);

// Search by common name
const results = searchUSDAPlantsByCommonName('tomato', 10);
```

### Hardiness Zones

```typescript
import {
  getHardinessZonesForPlant,
  addHardinessZonesForPlant,
  getPlantsByHardinessZone,
} from '@/lib/data';

// Get zones for a plant
const zones = getHardinessZonesForPlant('SOLY');

// Add zones
addHardinessZonesForPlant('SOLY', [5, 6, 7, 8, 9, 10], 'manual');

// Get all plants (seeds + USDA) for a zone
const plants = getPlantsByHardinessZone(9);
```

### Seeds (Enhanced)

The existing seed functions now work with the hybrid approach:

- `getSeedsByHardinessZone(zone)` - Checks both `hardiness_zones` JSON and `plant_hardiness_zones` table
- `getAllSeeds()` - Includes USDA-linked seeds
- `getSeedBySlug(slug)` - Works with USDA-linked seeds

---

## How It Works

### Hardiness Zone Lookup Priority

When looking up hardiness zones for a seed:

1. **First**: Check `seeds.hardiness_zones` JSON field (for backward compatibility)
2. **Second**: If seed has `usda_symbol`, check `plant_hardiness_zones` table
3. **Result**: Combined zones from both sources

### Plant Matching

The system can match plants in multiple ways:

- **By USDA Symbol**: Direct link via `usda_symbol`
- **By Scientific Name**: Search USDA Plants by binomial name
- **By Common Name**: Search USDA Plants by common name

---

## Benefits

### ✅ Advantages

1. **Authoritative Data**: Uses official USDA Plants database
2. **Flexible**: Seeds can exist independently or link to USDA Plants
3. **Extensible**: Easy to add hardiness zones from multiple sources
4. **Backward Compatible**: Existing seeds continue to work
5. **Performance**: Indexed for fast lookups

### ⚠️ Considerations

1. **Hardiness Zones**: Must be added separately (not in USDA Plants)
2. **Common Names**: Only ~47% of USDA Plants have common names
3. **Category Mapping**: USDA uses "family", not "vegetable/herb/flower"
4. **Data Volume**: 93K+ plants (may need filtering for garden focus)

---

## Next Steps

### Finding Hardiness Zone Data

You'll need to source hardiness zone data from:

1. **USDA Hardiness Zone Map API** (if available)
2. **Third-party plant databases** (e.g., Dave's Garden, PlantNet)
3. **Manual entry** for common garden plants
4. **Infer from distribution** (less precise)

### Recommended Approach

1. **Start Small**: Add hardiness zones for 100-500 most common garden plants
2. **Expand Gradually**: Add more as needed
3. **Multiple Sources**: Combine data from different sources
4. **Source Tracking**: Use `source` field to track where data came from

---

## Example Workflow

```bash
# 1. Migrate schema (if needed)
npm run migrate

# 2. Import USDA Plants
npm run import-usda

# 3. Add hardiness zones (via script or manual)
# Create a script to add zones for common garden plants

# 4. Link seeds to USDA Plants (optional)
# Update existing seeds or create new ones with usda_symbol

# 5. Test queries
# Use the data access functions to query plants and zones
```

---

## Files

- `lib/db.ts` - Database schema and initialization
- `lib/data.ts` - Data access functions
- `scripts/migrate-schema.ts` - Schema migration
- `scripts/import-usda-plants.ts` - USDA Plants import
- `data/plantlst.txt` - USDA Plants CSV file

