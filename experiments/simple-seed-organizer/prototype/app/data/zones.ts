import { HardinessZone } from '@/types/zone';

// USDA Hardiness Zone temperature ranges (2024 map)
// Each zone represents a 10°F range, subdivided into a, b, c (approximately 3.3°F each)
export const HARDINESS_ZONES: HardinessZone[] = [
  // Zone 1
  { zone: '1', minTempF: -60, maxTempF: -50, minTempC: -51, maxTempC: -46, description: 'Zone 1: Below -50°F (-46°C)' },
  { zone: '1a', minTempF: -60, maxTempF: -55, minTempC: -51, maxTempC: -48, description: 'Zone 1a: -60°F to -55°F (-51°C to -48°C)' },
  { zone: '1b', minTempF: -55, maxTempF: -50, minTempC: -48, maxTempC: -46, description: 'Zone 1b: -55°F to -50°F (-48°C to -46°C)' },
  { zone: '1c', minTempF: -50, maxTempF: -45, minTempC: -46, maxTempC: -43, description: 'Zone 1c: -50°F to -45°F (-46°C to -43°C)' },
  
  // Zone 2
  { zone: '2', minTempF: -50, maxTempF: -40, minTempC: -46, maxTempC: -40, description: 'Zone 2: -50°F to -40°F (-46°C to -40°C)' },
  { zone: '2a', minTempF: -50, maxTempF: -45, minTempC: -46, maxTempC: -43, description: 'Zone 2a: -50°F to -45°F (-46°C to -43°C)' },
  { zone: '2b', minTempF: -45, maxTempF: -40, minTempC: -43, maxTempC: -40, description: 'Zone 2b: -45°F to -40°F (-43°C to -40°C)' },
  { zone: '2c', minTempF: -40, maxTempF: -35, minTempC: -40, maxTempC: -37, description: 'Zone 2c: -40°F to -35°F (-40°C to -37°C)' },
  
  // Zone 3
  { zone: '3', minTempF: -40, maxTempF: -30, minTempC: -40, maxTempC: -34, description: 'Zone 3: -40°F to -30°F (-40°C to -34°C)' },
  { zone: '3a', minTempF: -40, maxTempF: -35, minTempC: -40, maxTempC: -37, description: 'Zone 3a: -40°F to -35°F (-40°C to -37°C)' },
  { zone: '3b', minTempF: -35, maxTempF: -30, minTempC: -37, maxTempC: -34, description: 'Zone 3b: -35°F to -30°F (-37°C to -34°C)' },
  { zone: '3c', minTempF: -30, maxTempF: -25, minTempC: -34, maxTempC: -32, description: 'Zone 3c: -30°F to -25°F (-34°C to -32°C)' },
  
  // Zone 4
  { zone: '4', minTempF: -30, maxTempF: -20, minTempC: -34, maxTempC: -29, description: 'Zone 4: -30°F to -20°F (-34°C to -29°C)' },
  { zone: '4a', minTempF: -30, maxTempF: -25, minTempC: -34, maxTempC: -32, description: 'Zone 4a: -30°F to -25°F (-34°C to -32°C)' },
  { zone: '4b', minTempF: -25, maxTempF: -20, minTempC: -32, maxTempC: -29, description: 'Zone 4b: -25°F to -20°F (-32°C to -29°C)' },
  { zone: '4c', minTempF: -20, maxTempF: -15, minTempC: -29, maxTempC: -26, description: 'Zone 4c: -20°F to -15°F (-29°C to -26°C)' },
  
  // Zone 5
  { zone: '5', minTempF: -20, maxTempF: -10, minTempC: -29, maxTempC: -23, description: 'Zone 5: -20°F to -10°F (-29°C to -23°C)' },
  { zone: '5a', minTempF: -20, maxTempF: -15, minTempC: -29, maxTempC: -26, description: 'Zone 5a: -20°F to -15°F (-29°C to -26°C)' },
  { zone: '5b', minTempF: -15, maxTempF: -10, minTempC: -26, maxTempC: -23, description: 'Zone 5b: -15°F to -10°F (-26°C to -23°C)' },
  { zone: '5c', minTempF: -10, maxTempF: -5, minTempC: -23, maxTempC: -21, description: 'Zone 5c: -10°F to -5°F (-23°C to -21°C)' },
  
  // Zone 6
  { zone: '6', minTempF: -10, maxTempF: 0, minTempC: -23, maxTempC: -18, description: 'Zone 6: -10°F to 0°F (-23°C to -18°C)' },
  { zone: '6a', minTempF: -10, maxTempF: -5, minTempC: -23, maxTempC: -21, description: 'Zone 6a: -10°F to -5°F (-23°C to -21°C)' },
  { zone: '6b', minTempF: -5, maxTempF: 0, minTempC: -21, maxTempC: -18, description: 'Zone 6b: -5°F to 0°F (-21°C to -18°C)' },
  { zone: '6c', minTempF: 0, maxTempF: 5, minTempC: -18, maxTempC: -15, description: 'Zone 6c: 0°F to 5°F (-18°C to -15°C)' },
  
  // Zone 7
  { zone: '7', minTempF: 0, maxTempF: 10, minTempC: -18, maxTempC: -12, description: 'Zone 7: 0°F to 10°F (-18°C to -12°C)' },
  { zone: '7a', minTempF: 0, maxTempF: 5, minTempC: -18, maxTempC: -15, description: 'Zone 7a: 0°F to 5°F (-18°C to -15°C)' },
  { zone: '7b', minTempF: 5, maxTempF: 10, minTempC: -15, maxTempC: -12, description: 'Zone 7b: 5°F to 10°F (-15°C to -12°C)' },
  { zone: '7c', minTempF: 10, maxTempF: 15, minTempC: -12, maxTempC: -9, description: 'Zone 7c: 10°F to 15°F (-12°C to -9°C)' },
  
  // Zone 8
  { zone: '8', minTempF: 10, maxTempF: 20, minTempC: -12, maxTempC: -7, description: 'Zone 8: 10°F to 20°F (-12°C to -7°C)' },
  { zone: '8a', minTempF: 10, maxTempF: 15, minTempC: -12, maxTempC: -9, description: 'Zone 8a: 10°F to 15°F (-12°C to -9°C)' },
  { zone: '8b', minTempF: 15, maxTempF: 20, minTempC: -9, maxTempC: -7, description: 'Zone 8b: 15°F to 20°F (-9°C to -7°C)' },
  { zone: '8c', minTempF: 20, maxTempF: 25, minTempC: -7, maxTempC: -4, description: 'Zone 8c: 20°F to 25°F (-7°C to -4°C)' },
  
  // Zone 9
  { zone: '9', minTempF: 20, maxTempF: 30, minTempC: -7, maxTempC: -1, description: 'Zone 9: 20°F to 30°F (-7°C to -1°C)' },
  { zone: '9a', minTempF: 20, maxTempF: 25, minTempC: -7, maxTempC: -4, description: 'Zone 9a: 20°F to 25°F (-7°C to -4°C)' },
  { zone: '9b', minTempF: 25, maxTempF: 30, minTempC: -4, maxTempC: -1, description: 'Zone 9b: 25°F to 30°F (-4°C to -1°C)' },
  { zone: '9c', minTempF: 30, maxTempF: 35, minTempC: -1, maxTempC: 2, description: 'Zone 9c: 30°F to 35°F (-1°C to 2°C)' },
  
  // Zone 10
  { zone: '10', minTempF: 30, maxTempF: 40, minTempC: -1, maxTempC: 4, description: 'Zone 10: 30°F to 40°F (-1°C to 4°C)' },
  { zone: '10a', minTempF: 30, maxTempF: 35, minTempC: -1, maxTempC: 2, description: 'Zone 10a: 30°F to 35°F (-1°C to 2°C)' },
  { zone: '10b', minTempF: 35, maxTempF: 40, minTempC: 2, maxTempC: 4, description: 'Zone 10b: 35°F to 40°F (2°C to 4°C)' },
  { zone: '10c', minTempF: 40, maxTempF: 45, minTempC: 4, maxTempC: 7, description: 'Zone 10c: 40°F to 45°F (4°C to 7°C)' },
  
  // Zone 11
  { zone: '11', minTempF: 40, maxTempF: 50, minTempC: 4, maxTempC: 10, description: 'Zone 11: 40°F to 50°F (4°C to 10°C)' },
  { zone: '11a', minTempF: 40, maxTempF: 45, minTempC: 4, maxTempC: 7, description: 'Zone 11a: 40°F to 45°F (4°C to 7°C)' },
  { zone: '11b', minTempF: 45, maxTempF: 50, minTempC: 7, maxTempC: 10, description: 'Zone 11b: 45°F to 50°F (7°C to 10°C)' },
  { zone: '11c', minTempF: 50, maxTempF: 55, minTempC: 10, maxTempC: 13, description: 'Zone 11c: 50°F to 55°F (10°C to 13°C)' },
  
  // Zone 12
  { zone: '12', minTempF: 50, maxTempF: 60, minTempC: 10, maxTempC: 16, description: 'Zone 12: 50°F to 60°F (10°C to 16°C)' },
  { zone: '12a', minTempF: 50, maxTempF: 55, minTempC: 10, maxTempC: 13, description: 'Zone 12a: 50°F to 55°F (10°C to 13°C)' },
  { zone: '12b', minTempF: 55, maxTempF: 60, minTempC: 13, maxTempC: 16, description: 'Zone 12b: 55°F to 60°F (13°C to 16°C)' },
  { zone: '12c', minTempF: 60, maxTempF: 65, minTempC: 16, maxTempC: 18, description: 'Zone 12c: 60°F to 65°F (16°C to 18°C)' },
  
  // Zone 13
  { zone: '13', minTempF: 60, maxTempF: 70, minTempC: 16, maxTempC: 21, description: 'Zone 13: 60°F to 70°F (16°C to 21°C)' },
  { zone: '13a', minTempF: 60, maxTempF: 65, minTempC: 16, maxTempC: 18, description: 'Zone 13a: 60°F to 65°F (16°C to 18°C)' },
  { zone: '13b', minTempF: 65, maxTempF: 70, minTempC: 18, maxTempC: 21, description: 'Zone 13b: 65°F to 70°F (18°C to 21°C)' },
  { zone: '13c', minTempF: 70, maxTempF: 75, minTempC: 21, maxTempC: 24, description: 'Zone 13c: 70°F to 75°F (21°C to 24°C)' },
];

// Create a lookup map for quick access
export const ZONE_LOOKUP: Record<string, HardinessZone> = {};
HARDINESS_ZONES.forEach(zone => {
  ZONE_LOOKUP[zone.zone] = zone;
});

// Get zone information by zone string
export function getZoneInfo(zone: string): HardinessZone | null {
  return ZONE_LOOKUP[zone] || null;
}

// Get all zones for a base zone number (e.g., "9" returns 9, 9a, 9b, 9c)
export function getZonesForBase(baseZone: number): HardinessZone[] {
  return HARDINESS_ZONES.filter(z => {
    const zoneNum = parseInt(z.zone.replace(/[abc]/g, ''));
    return zoneNum === baseZone;
  });
}

