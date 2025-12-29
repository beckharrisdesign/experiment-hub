# Hardiness Zone Data Source - Research Findings

## Summary

**Finding**: There is **no free, downloadable database** that directly maps plants to USDA hardiness zones.

**Available Resources**:
- ✅ ZIP code → Hardiness Zone (we have this)
- ❌ Plant → Hardiness Zone (not available as bulk data)

---

## What We Found

### ✅ Available: ZIP-to-Zone Mapping

1. **USDA Plant Hardiness Zone Map**
   - Interactive map: https://planthardiness.ars.usda.gov/
   - GIS data: https://prism.oregonstate.edu/phzm
   - Free to use with attribution

2. **Frostline Project**
   - API and dataset for ZIP-to-zone
   - CSV and SQLite formats
   - https://dev.ihsn.org/nada/catalog/79917

**Status**: We already have zip-to-zone data in our prototype ✅

---

### ❌ Not Available: Plant-to-Zone Mapping

**No direct APIs or databases found for**:
- Plant species → Hardiness zones
- Scientific name → Zones
- USDA symbol → Zones

**Why?**
- Hardiness zones are location-based, not plant-based
- Zones tell you what plants *can* grow in a location
- But there's no authoritative database saying "this plant grows in zones X-Y"

---

## Why This Makes Sense

Hardiness zones work like this:
1. **Location** has a hardiness zone (based on minimum temperature)
2. **Plants** have temperature tolerances
3. **Match**: Plants that tolerate a zone's minimum temperature can grow there

But plants don't have "official" hardiness zones because:
- Many plants are grown as annuals in zones where they're not perennial
- Microclimates vary within zones
- Different cultivars have different tolerances
- Growing conditions matter (sun, soil, water)

---

## Solution: Manual Entry + Research

Since there's no bulk database, we need to:

1. **Research** hardiness zones for each plant
2. **Sources**:
   - Seed packet information
   - Gardening websites (Burpee, Johnny's Seeds, etc.)
   - Extension service publications
   - Gardening reference books

3. **Entry**: Use our script to add zones

---

## What We Built

### 1. Manual Entry Script
**File**: `scripts/add-hardiness-zones.ts`

**Features**:
- Easy-to-edit array of plants and zones
- Pre-populated with 15 common garden plants
- Prevents duplicates
- Shows statistics

**Usage**:
```bash
npm run add-zones
```

### 2. Documentation
- `HARDINESS_ZONE_SOURCES.md` - Comprehensive list of potential sources
- `HARDINESS_ZONE_FINDINGS.md` - This document (research summary)

---

## Current Status

### ✅ Completed
- [x] Researched available data sources
- [x] Created manual entry script
- [x] Added 15 common garden plants with zones
- [x] Documented findings

### 🔄 Next Steps
- [ ] Import USDA Plants database (`npm run import-usda`)
- [ ] Link USDA Plants to hardiness zones (match by symbol)
- [ ] Expand plant list to 50-100 common garden plants
- [ ] Research zones for more plants

---

## Recommended Approach

### Phase 1: Start Small (This Week)
1. **Import USDA Plants**: `npm run import-usda`
2. **Add zones for 50-100 common plants**:
   - Vegetables: tomatoes, peppers, lettuce, carrots, etc.
   - Herbs: basil, oregano, thyme, cilantro, etc.
   - Flowers: zinnia, marigold, sunflower, etc.

### Phase 2: Expand (Next 2 Weeks)
1. **Research** zones for 200-300 more plants
2. **Focus** on garden plants (not all 93K USDA Plants)
3. **Document** sources for each entry

### Phase 3: Long-term
1. **Community contribution** system
2. **Automated research** tools
3. **Integration** with seed company APIs (if available)

---

## Data Quality

### Verification Strategy
- Cross-reference multiple sources
- Prefer seed packet information (most reliable for garden plants)
- Use extension services for native plants
- Document source for each entry

### Coverage Goal
- **MVP**: 100-200 common garden plants
- **V1**: 500-1000 garden plants
- **Future**: Expand as needed

---

## Example: Adding a New Plant

1. **Find USDA Symbol**:
   ```bash
   # Search USDA Plants database
   # Or use: searchUSDAPlantsByScientificName('Solanum lycopersicum')
   ```

2. **Research Zones**:
   - Check seed packet
   - Check gardening websites
   - Check extension services

3. **Add to Script**:
   ```typescript
   {
     symbol: 'SOLY',
     zones: [3, 4, 5, 6, 7, 8, 9, 10, 11],
     source: 'seed-packet',
     notes: 'Annual, grown as annual in all zones'
   }
   ```

4. **Run Script**:
   ```bash
   npm run add-zones
   ```

---

## Conclusion

**No bulk plant-to-zone database exists**, but we can build one manually:

1. ✅ **Script ready** for easy entry
2. ✅ **15 plants** already added
3. ✅ **Process documented** for expansion
4. ✅ **Hybrid approach** supports this workflow

**Recommendation**: Start with manual entry for common garden plants, expand gradually.

---

**Last Updated**: 2025-01-23  
**Status**: Research Complete, Ready for Data Entry

