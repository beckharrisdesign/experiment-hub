import { ClimateData } from '@/types/climate';

// Climate data by zip code
// This is a sample dataset - in production, this would be loaded from a database
// or fetched from a climate API like NOAA or USDA

export const CLIMATE_DATA: Record<string, ClimateData> = {
  // Austin, TX - 78726 (Cedar Park area)
  '78726': {
    zipCode: '78726',
    averageFirstFrost: '11-15', // Mid-November
    averageLastFrost: '03-01', // Early March
    averageTemperatures: {
      january: 52,
      february: 56,
      march: 63,
      april: 71,
      may: 78,
      june: 84,
      july: 87,
      august: 87,
      september: 81,
      october: 72,
      november: 62,
      december: 54,
    },
    averageLowTemperatures: {
      january: 38,
      february: 42,
      march: 50,
      april: 58,
      may: 66,
      june: 72,
      july: 74,
      august: 74,
      september: 68,
      october: 58,
      november: 48,
      december: 40,
    },
    source: 'NOAA',
    lastUpdated: '2024',
  },
  
  // Sample other locations for demonstration
  '78701': {
    zipCode: '78701',
    averageFirstFrost: '11-20',
    averageLastFrost: '02-28',
    averageTemperatures: {
      january: 54,
      february: 58,
      march: 65,
      april: 73,
      may: 80,
      june: 86,
      july: 89,
      august: 89,
      september: 83,
      october: 74,
      november: 64,
      december: 56,
    },
    averageLowTemperatures: {
      january: 40,
      february: 44,
      march: 52,
      april: 60,
      may: 68,
      june: 74,
      july: 76,
      august: 76,
      september: 70,
      october: 60,
      november: 50,
      december: 42,
    },
    source: 'NOAA',
    lastUpdated: '2024',
  },
};

/**
 * Get climate data for a zip code
 * @param zipCode - 5-digit zip code
 * @returns ClimateData or null if not found
 */
export function getClimateData(zipCode: string): ClimateData | null {
  const normalized = zipCode.replace(/[^\d]/g, '').substring(0, 5);
  if (normalized.length < 5) return null;
  
  return CLIMATE_DATA[normalized] || null;
}

/**
 * Get average temperature for a specific month
 * @param zipCode - 5-digit zip code
 * @param month - Month number (1-12)
 * @returns Average temperature in Fahrenheit or null
 */
export function getAverageTemperature(zipCode: string, month: number): number | null {
  const climate = getClimateData(zipCode);
  if (!climate) return null;
  
  const monthNames: (keyof ClimateData['averageTemperatures'])[] = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  if (month < 1 || month > 12) return null;
  return climate.averageTemperatures[monthNames[month - 1]];
}

/**
 * Get growing season length in days
 * @param zipCode - 5-digit zip code
 * @returns Number of days between last and first frost, or null
 */
export function getGrowingSeasonLength(zipCode: string): number | null {
  const climate = getClimateData(zipCode);
  if (!climate) return null;
  
  const [lastFrostMonth, lastFrostDay] = climate.averageLastFrost.split('-').map(Number);
  const [firstFrostMonth, firstFrostDay] = climate.averageFirstFrost.split('-').map(Number);
  
  // Calculate days from last frost to first frost
  const lastFrostDate = new Date(2024, lastFrostMonth - 1, lastFrostDay);
  const firstFrostDate = new Date(2024, firstFrostMonth - 1, firstFrostDay);
  
  // If first frost is before last frost in the same year, it's in the next year
  if (firstFrostDate < lastFrostDate) {
    firstFrostDate.setFullYear(2025);
  }
  
  const diffTime = firstFrostDate.getTime() - lastFrostDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

