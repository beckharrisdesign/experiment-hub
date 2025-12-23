import { ZoneLookup } from '@/types/zone';

// Zip code to zone mapping (2024 USDA Hardiness Zone Map)
// This is a sample dataset - in production, this would be loaded from a comprehensive database
// or fetched from an API like the USDA's zone lookup service

export const ZIP_TO_ZONE_2024: Record<string, ZoneLookup> = {
  // Austin, TX area - shifted from 8a to 9a in 2024
  '78701': { zipCode: '78701', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78702': { zipCode: '78702', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78703': { zipCode: '78703', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78704': { zipCode: '78704', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78705': { zipCode: '78705', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78721': { zipCode: '78721', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78722': { zipCode: '78722', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78723': { zipCode: '78723', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78724': { zipCode: '78724', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78725': { zipCode: '78725', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78726': { zipCode: '78726', zone2024: '9a', zone2012: '8a', location: 'Austin, TX', state: 'TX' },
  '78727': { zipCode: '78727', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78728': { zipCode: '78728', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78729': { zipCode: '78729', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78730': { zipCode: '78730', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78731': { zipCode: '78731', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78732': { zipCode: '78732', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78733': { zipCode: '78733', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78734': { zipCode: '78734', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78735': { zipCode: '78735', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78736': { zipCode: '78736', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78737': { zipCode: '78737', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78738': { zipCode: '78738', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78739': { zipCode: '78739', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78741': { zipCode: '78741', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78742': { zipCode: '78742', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78744': { zipCode: '78744', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78745': { zipCode: '78745', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78746': { zipCode: '78746', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78747': { zipCode: '78747', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78748': { zipCode: '78748', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78749': { zipCode: '78749', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78750': { zipCode: '78750', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78751': { zipCode: '78751', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78752': { zipCode: '78752', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78753': { zipCode: '78753', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78754': { zipCode: '78754', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78756': { zipCode: '78756', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78757': { zipCode: '78757', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78758': { zipCode: '78758', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  '78759': { zipCode: '78759', zone2024: '9a', zone2012: '8b', location: 'Austin, TX', state: 'TX' },
  
  // Sample other locations for demonstration
  '10001': { zipCode: '10001', zone2024: '7b', zone2012: '7a', location: 'New York, NY', state: 'NY' },
  '90210': { zipCode: '90210', zone2024: '10b', zone2012: '10b', location: 'Beverly Hills, CA', state: 'CA' },
  '98101': { zipCode: '98101', zone2024: '9a', zone2012: '8b', location: 'Seattle, WA', state: 'WA' },
  '60601': { zipCode: '60601', zone2024: '6a', zone2012: '5b', location: 'Chicago, IL', state: 'IL' },
  '33101': { zipCode: '33101', zone2024: '11a', zone2012: '11a', location: 'Miami, FL', state: 'FL' },
};

/**
 * Lookup zone information by zip code
 * @param zipCode - 5-digit zip code (or ZIP+4, will use first 5 digits)
 * @returns ZoneLookup object or null if not found
 */
export function lookupZoneByZip(zipCode: string): ZoneLookup | null {
  // Normalize zip code (take first 5 digits)
  const normalized = zipCode.replace(/[^\d]/g, '').substring(0, 5);
  if (normalized.length < 5) return null;
  
  return ZIP_TO_ZONE_2024[normalized] || null;
}

/**
 * Get all zip codes that changed zones between 2012 and 2024
 */
export function getZoneChanges(): ZoneLookup[] {
  return Object.values(ZIP_TO_ZONE_2024).filter(
    lookup => lookup.zone2012 && lookup.zone2012 !== lookup.zone2024
  );
}

