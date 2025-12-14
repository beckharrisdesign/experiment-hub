# Data Relationships Fix: Species vs Cultivars

## Issue Fixed

We corrected the data modeling issue where "Genovese Basil" was being treated as if it were the species, when it's actually a **cultivar** of `Ocimum basilicum`.

## Changes Made

### 1. Removed Redundant Varietal Entry
- **Before**: "Genovese Basil" seed entry had "Genovese Basil" listed as a recommended varietal
- **After**: Removed the redundant entry - the seed entry IS Genovese Basil, so we only list OTHER cultivars

### 2. Added More Basil Cultivars
- Added "Purple Basil" as a recommended varietal
- Added "Spicy Globe Basil" as a recommended varietal
- Updated varietal descriptions to include scientific names where applicable

### 3. Updated UI to Clarify Relationship
- Added note: "Species: Ocimum basilicum • Genovese Basil is a cultivar"
- Updated varietals section to say: "These other cultivars of Ocimum basilicum are recommended..."

### 4. Updated Varietal Descriptions
- Thai Basil: Now includes "(Ocimum basilicum var. thyrsiflora)"
- Lemon Basil: Now includes "(Ocimum × citriodorum)"

## Current Model

### Seed Entry
- **Name**: "Genovese Basil"
- **Species**: `Ocimum basilicum`
- **Type**: Cultivar of the species

### Recommended Varietals (for Austin, TX)
- **Thai Basil** (Primary) - Ocimum basilicum var. thyrsiflora
- **Lemon Basil** - Ocimum × citriodorum
- **Purple Basil** - Cultivar
- **Spicy Globe Basil** - Cultivar

## Future Improvements

1. **Link to USDA Species**: Find and link to the USDA symbol for `Ocimum basilicum` (if it exists in the database)
2. **Species-Level Pages**: Consider creating species-level pages that show all cultivars
3. **Cultivar Flag**: Add a field to indicate if a seed entry is a cultivar vs. species
4. **Parent Species Link**: Add a field linking cultivars to their parent species

## Example from Rare Seeds

The user's example shows many basil varieties, all cultivars of Ocimum basilicum:
- Genovese Basil (our seed entry)
- Thai Basil
- Lemon Basil
- Purple Basil
- Cinnamon Basil
- Spicy Globe Basil
- etc.

All of these should be modeled as cultivars/varieties of the species `Ocimum basilicum`.

