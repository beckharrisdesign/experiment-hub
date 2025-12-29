# Data Relationships Issue: Species vs Varietals

## Problem Identified

We have a data modeling issue where we're conflating **species** with **varietals/cultivars**.

### Current (Incorrect) Model

- **Seed Entry**: "Genovese Basil" with `latin_name: 'Ocimum basilicum'`
- **Recommended Varietals**: Thai Basil, Genovese Basil, Lemon Basil

**Issue**: "Genovese Basil" is being treated as if it's the species, when it's actually a **cultivar/variety** of the species `Ocimum basilicum`.

### Correct Model

- **Species**: `Ocimum basilicum` (Sweet Basil) - This is the base species
- **Cultivars/Varietals**:
  - Genovese Basil (cultivar of Ocimum basilicum)
  - Thai Basil (Ocimum basilicum var. thyrsiflora)
  - Lemon Basil (Ocimum × citriodorum - actually a hybrid)
  - Spicy Globe Basil (cultivar)
  - Purple Basil (cultivar)
  - etc.

## USDA Plants Database

The USDA Plants database has:
- `OCIMU` - Ocimum L. (genus level, common name "basil")
- Various Ocimum species, but may not have all cultivars

## Recommended Fix

### Option 1: Link Seeds to USDA Species, Varietals as Recommendations

1. **Update seed entry**: Change "Genovese Basil" to link to USDA symbol for `Ocimum basilicum`
2. **Keep varietals**: The recommended varietals table already correctly models this
3. **Display**: Show "Ocimum basilicum" as the species, with varietals listed below

### Option 2: Create Species-Level Entries

1. **Create species entry**: "Basil" (Ocimum basilicum) as the main seed entry
2. **Remove varietal-specific entries**: Don't have "Genovese Basil" as a separate seed
3. **Use varietals table**: All basil varietals (Genovese, Thai, Lemon, etc.) are recommendations

### Option 3: Hybrid Approach (Recommended)

1. **Keep current seeds**: "Genovese Basil" can stay as a specific cultivar entry
2. **Link to USDA species**: Set `usda_symbol` to point to `Ocimum basilicum` species
3. **Display hierarchy**: Show:
   - Species: Ocimum basilicum
   - Cultivar: Genovese Basil
   - Other varietals: Thai Basil, Lemon Basil, etc.

## Example from Rare Seeds

The user provided an example showing many basil varieties:
- Genovese Basil
- Thai Basil  
- Lemon Basil
- Purple Basil
- Cinnamon Basil
- Spicy Globe Basil
- etc.

All of these are cultivars/varieties of `Ocimum basilicum` (or related Ocimum species).

## Action Items

1. ✅ Document the issue (this file)
2. ⏳ Find correct USDA symbol for Ocimum basilicum
3. ⏳ Update seed entry to link to species
4. ⏳ Update UI to show species → cultivar relationship
5. ⏳ Consider creating a "species" view that shows all varietals

