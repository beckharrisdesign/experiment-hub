# Hardiness Zone Data Sources

## Overview

This document catalogs potential sources for plant hardiness zone data to supplement the USDA Plants database.

**Challenge**: USDA Plants database does NOT include hardiness zone information. We need to find sources that map plants to zones.

---

## Data Source Options

### 1. USDA Plant Hardiness Zone Map (Zip-to-Zone)

**What it provides**: ZIP code → Hardiness Zone mapping  
**What it doesn't provide**: Plant → Hardiness Zone mapping

**Resources**:
- **Interactive Map**: https://planthardiness.ars.usda.gov/
- **GIS Data**: PRISM Climate Group at Oregon State University
  - Grid and shapefile formats
  - Download: https://prism.oregonstate.edu/phzm
  - Free to use (with attribution)

**Status**: ✅ We already have zip-to-zone data  
**Use Case**: Map user's zip code to their hardiness zone

---

### 2. Frostline Project (ZIP-to-Zone API)

**What it provides**: 
- ZIP code → Hardiness Zone API
- Dataset in CSV and SQLite formats
- Lightweight API for zone lookups

**Resources**:
- Dataset: https://dev.ihsn.org/nada/catalog/79917
- API: Provides zone data for specific ZIP codes
- Formats: CSV, SQLite

**Status**: ✅ Available for zip-to-zone (we already have this)  
**Use Case**: Alternative/backup for zip-to-zone mapping  
**Note**: Still doesn't provide plant-to-zone mapping

---

### 3. PlantMaps.com

**What it provides**: 
- ZIP code hardiness zone lookup
- Some plant hardiness zone information
- Widget/API for integration

**Resources**:
- Website: https://www.plantmaps.com/
- ZIP Code Tool: https://www.plantmaps.com/hardiness-zone-zipcode-search-widget.php

**Status**: ⚠️ Unknown if plant-to-zone data is available for download  
**Use Case**: Potential API/widget integration

---

### 4. Dave's Garden PlantFiles

**What it provides**: 
- Comprehensive plant database
- Hardiness zone information for many plants
- User-contributed data

**Resources**:
- Website: https://davesgarden.com/
- PlantFiles: https://davesgarden.com/guides/pf/

**Status**: ❓ Need to check if data is downloadable/accessible via API  
**Use Case**: Manual data entry or scraping (check terms of service)

---

### 5. Missouri Botanical Garden Plant Finder

**What it provides**: 
- Plant database with hardiness zones
- Authoritative botanical information

**Resources**:
- Website: https://www.missouribotanicalgarden.org/
- Plant Finder: https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderListResults.aspx

**Status**: ❓ Need to check if data is downloadable/accessible via API  
**Use Case**: Potential data source (check terms of service)

---

### 6. RHS (Royal Horticultural Society) Plant Finder

**What it provides**: 
- UK-based plant database
- Hardiness ratings (UK system, different from USDA)

**Resources**:
- Website: https://www.rhs.org.uk/

**Status**: ⚠️ UK hardiness system (different from USDA zones)  
**Use Case**: Not ideal (different zone system)

---

### 7. Manual Data Entry / Curated Lists

**What it provides**: 
- High-quality, verified data
- Focus on common garden plants

**Approach**:
1. Start with 100-500 most common garden vegetables, herbs, and flowers
2. Manually research and enter hardiness zones
3. Expand gradually

**Sources for Research**:
- Seed packet information
- Gardening websites (Burpee, Johnny's Seeds, etc.)
- Extension services (state university agricultural extensions)

**Status**: ✅ Most reliable for MVP  
**Use Case**: Start here for prototype

---

### 8. Seed Company Databases

**What it provides**: 
- Hardiness zone information on seed packets/websites
- Focused on garden plants

**Examples**:
- Burpee: https://www.burpee.com/
- Johnny's Selected Seeds: https://www.johnnyseeds.com/
- Baker Creek Heirloom Seeds: https://www.rareseeds.com/

**Status**: ⚠️ Data not in downloadable format  
**Use Case**: Manual research and data entry

---

### 9. University Extension Services

**What it provides**: 
- Regional plant recommendations
- Hardiness zone information
- Research-based data

**Examples**:
- University of California Extension
- Cornell Cooperative Extension
- State agricultural universities

**Status**: ⚠️ Scattered across many sources  
**Use Case**: Reference for manual data entry

---

## Recommended Approach

### Phase 1: Manual Entry (MVP)
**Start with 100-200 common garden plants**

1. **Create curated list** of most popular:
   - Vegetables (tomatoes, peppers, lettuce, etc.)
   - Herbs (basil, oregano, thyme, etc.)
   - Flowers (zinnia, marigold, sunflower, etc.)

2. **Research hardiness zones** from:
   - Seed company websites
   - Gardening reference books
   - Extension service publications

3. **Add to database** using `addHardinessZonesForPlant()` function

**Timeline**: 1-2 days for 100 plants  
**Quality**: High (verified data)  
**Coverage**: Focused on garden plants

### Phase 2: Expand with Scraping/APIs
**If available sources found**

1. **Evaluate legal/ethical considerations**
2. **Build scraper or API integration**
3. **Import bulk data**
4. **Verify and clean data**

**Timeline**: 1-2 weeks  
**Quality**: Variable (needs verification)  
**Coverage**: Broader

### Phase 3: Community Contribution
**Long-term**

1. **Allow users to contribute** hardiness zone data
2. **Vote/verify system** for accuracy
3. **Source tracking** (who provided data)

**Timeline**: Ongoing  
**Quality**: Community-verified  
**Coverage**: Comprehensive

---

## Implementation Priority

### ✅ Immediate (This Week)
1. **Manual entry** for 50-100 most common garden plants
2. **Create seed script** to populate `plant_hardiness_zones` table
3. **Test with prototype** to ensure it works

### 🔄 Short-term (Next 2 Weeks)
1. **Research** if any APIs/databases are available
2. **Evaluate** scraping options (check ToS)
3. **Expand** manual list to 200-300 plants

### 📅 Long-term (Future)
1. **Build** community contribution system
2. **Integrate** with external APIs if available
3. **Automate** data updates

---

## Data Quality Considerations

### Verification
- Cross-reference multiple sources
- Prefer authoritative sources (USDA, extension services)
- Document source for each entry

### Coverage
- Start with common garden plants
- Expand to native plants if needed
- Consider regional variations

### Maintenance
- Track data source
- Allow updates/corrections
- Version control for changes

---

## Next Steps

1. ✅ **Created manual entry script** (`scripts/add-hardiness-zones.ts`)
2. ✅ **Researched** APIs and databases (no direct plant-to-zone APIs found)
3. 🔄 **Start with 15 common plants** (already in script) to test the system
4. ✅ **Documented** sources and methodology

## Quick Start

### Add Hardiness Zones for Common Plants

```bash
npm run add-zones
```

This will add hardiness zones for 15 common garden plants (tomatoes, basil, zinnia, etc.) that are already in the script.

### Add More Plants

Edit `scripts/add-hardiness-zones.ts` and add more entries to the `plantZones` array:

```typescript
{
  symbol: 'USDA_SYMBOL',  // Find in USDA Plants database
  zones: [5, 6, 7, 8, 9],
  source: 'seed-packet',  // or 'extension', 'manual', etc.
  notes: 'Optional notes'
}
```

Then run `npm run add-zones` again.

---

## Questions to Answer

- [ ] Are there any free/open APIs for plant hardiness zones?
- [ ] Can we scrape data from seed company websites (legally/ethically)?
- [ ] Are there downloadable databases we haven't found?
- [ ] Should we focus on garden plants or all plants?

---

**Last Updated**: 2025-01-23  
**Status**: Research Phase

