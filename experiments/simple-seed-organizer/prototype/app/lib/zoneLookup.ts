import { lookupZoneByZip } from '@/data/zipToZone';
import { getZoneInfo } from '@/data/zones';
import { getClimateData } from '@/data/climate';
import { HardinessZone, ZoneLookup } from '@/types/zone';
import { ClimateData } from '@/types/climate';

/**
 * Complete zone lookup result with temperature data
 */
export interface ZoneLookupResult {
  zipCode: string;
  zone: string;
  zoneInfo: HardinessZone | null;
  previousZone?: string;
  changed: boolean;
  location?: string;
  state?: string;
  climate?: ClimateData;
}

/**
 * Lookup zone information by zip code with full temperature data
 */
export function lookupZone(zipCode: string): ZoneLookupResult | null {
  const lookup = lookupZoneByZip(zipCode);
  if (!lookup) return null;

  const zoneInfo = getZoneInfo(lookup.zone2024);
  const changed = !!lookup.zone2012 && lookup.zone2012 !== lookup.zone2024;
  const climate = getClimateData(zipCode);

  return {
    zipCode: lookup.zipCode,
    zone: lookup.zone2024,
    zoneInfo,
    previousZone: lookup.zone2012,
    changed,
    location: lookup.location,
    state: lookup.state,
    climate: climate ?? undefined,
  };
}

/**
 * Get zone temperature range as formatted string
 */
export function formatZoneTemperature(zone: string, unit: 'F' | 'C' = 'F'): string {
  const zoneInfo = getZoneInfo(zone);
  if (!zoneInfo) return '';

  if (unit === 'F') {
    return `${zoneInfo.minTempF}°F to ${zoneInfo.maxTempF}°F`;
  } else {
    return `${zoneInfo.minTempC}°C to ${zoneInfo.maxTempC}°C`;
  }
}

/**
 * Check if a zone is compatible with another zone (for seed compatibility)
 * A zone is compatible if it's the same or warmer (higher number)
 */
export function isZoneCompatible(seedZone: string, userZone: string): boolean {
  const seedInfo = getZoneInfo(seedZone);
  const userInfo = getZoneInfo(userZone);
  
  if (!seedInfo || !userInfo) return false;
  
  // User zone is compatible if minimum temp is >= seed zone minimum temp
  return userInfo.minTempF >= seedInfo.minTempF;
}

