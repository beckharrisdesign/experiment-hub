# USDA Plants Database Import Summary

## Import Status: ✅ Complete

**Date**: 2025-01-23  
**File**: `data/plantlst.txt`  
**Size**: 6.7 MB  
**Records Processed**: 93,157  
**Records Imported**: 48,995 unique plants

---

## Import Statistics

### Overall
- **Total Plants**: 48,995 unique symbols
- **With Common Names**: 24,663 (50.3%)
- **With Scientific Names**: 48,995 (100%)
- **Unique Families**: 548

### Top 10 Plant Families
1. **Asteraceae** (Sunflower family): 2,457 plants
2. **Fabaceae** (Legume family): 2,184 plants
3. **Poaceae** (Grass family): 1,582 plants
4. **Rosaceae** (Rose family): 913 plants
5. **Cyperaceae** (Sedge family): 784 plants
6. **Scrophulariaceae** (Figwort family): 775 plants
7. **Brassicaceae** (Mustard family): 742 plants
8. **Liliaceae** (Lily family): 569 plants
9. **Lamiaceae** (Mint family): 524 plants
10. **Myrtaceae** (Myrtle family): 451 plants

---

## Why Fewer Records Than Processed?

The CSV had 93,157 lines, but we imported 48,995 unique plants because:
- **Duplicate Symbols**: Some plants have multiple entries (synonyms, varieties)
- **INSERT OR REPLACE**: Our import uses `INSERT OR REPLACE`, so duplicates with the same symbol overwrite previous entries
- **This is correct**: We want unique symbols in the database

---

## Sample Plants Imported

### Garden Vegetables
- **Tomato**: `SOLY2` - Solanum lycopersicum (garden tomato)
- **Lettuce**: Need to find Lactuca sativa symbol
- **Pepper**: `CAAN4` - Capsicum annuum (cayenne pepper)
- **Carrot**: `DACA2` - Daucus carota

### Herbs
- **Basil**: Need to find Ocimum basilicum symbol
- **Oregano**: `ORVU` - Origanum vulgare
- **Thyme**: `THVU` - Thymus vulgaris
- **Cilantro**: `COSA` - Coriandrum sativum
- **Parsley**: `PECR2` - Petroselinum crispum

### Flowers
- **Zinnia**: `ZIVI2` - Zinnia elegans
- **Marigold**: `TAPA` - Tagetes patula
- **Sunflower**: `HEAN3` - Helianthus annuus
- **Cosmos**: `COBI` - Cosmos bipinnatus
- **Nasturtium**: `TRMA` - Tropaeolum majus

---

## Next Steps

### 1. Verify Hardiness Zone Symbols
Some hardiness zone entries may need symbol updates:
- Check if symbols in `plant_hardiness_zones` match actual USDA symbols
- Update symbols if needed

### 2. Link Seeds to USDA Plants
Update existing seeds to link to USDA Plants:
```sql
UPDATE seeds SET usda_symbol = 'SOLY2' WHERE latin_name LIKE '%lycopersicum%';
```

### 3. Search for Missing Plants
Use the search functions to find plants:
```typescript
import { searchUSDAPlantsByScientificName, searchUSDAPlantsByCommonName } from '@/lib/data';

// Search by scientific name
const results = searchUSDAPlantsByScientificName('Lactuca sativa', 10);

// Search by common name
const results = searchUSDAPlantsByCommonName('basil', 10);
```

### 4. Add More Hardiness Zones
- Research correct USDA symbols for plants
- Update `scripts/add-hardiness-zones.ts` with correct symbols
- Run `npm run add-zones` again

---

## Database Queries

### Find a Plant
```sql
-- By symbol
SELECT * FROM usda_plants WHERE symbol = 'SOLY2';

-- By scientific name
SELECT * FROM usda_plants WHERE scientific_name LIKE '%lycopersicum%';

-- By common name
SELECT * FROM usda_plants WHERE common_name LIKE '%tomato%';
```

### Statistics
```sql
-- Total plants
SELECT COUNT(*) FROM usda_plants;

-- Plants with common names
SELECT COUNT(*) FROM usda_plants WHERE common_name IS NOT NULL;

-- Plants by family
SELECT family, COUNT(*) as count 
FROM usda_plants 
WHERE family IS NOT NULL 
GROUP BY family 
ORDER BY count DESC;
```

---

## Integration Status

✅ **Database Schema**: Ready  
✅ **USDA Plants**: Imported (48,995 plants)  
✅ **Hardiness Zones**: 15 plants with zones (114 zone mappings)  
🔄 **Next**: Link seeds to USDA Plants and expand hardiness zone data

---

**Import Time**: ~30 seconds  
**Database Size**: ~6.7 MB (CSV) → SQLite database  
**Status**: Ready for use

