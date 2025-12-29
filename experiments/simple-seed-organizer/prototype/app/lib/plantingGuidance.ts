import { Seed } from '@/types/seed';
import { ClimateData } from '@/types/climate';
import { getProfile } from '@/lib/storage';
import { getClimateData } from '@/data/climate';

export interface PlantingGuidance {
  hasData: boolean;
  lastFrostDate?: Date;
  firstFrostDate?: Date;
  startSeedsIndoors?: Date;
  transplantDate?: Date;
  directSowDate?: Date;
  expectedHarvestDate?: Date; // Legacy - use harvestDates instead
  harvestDates?: {
    fromIndoorStart?: Date;
    fromTransplantedStart?: Date;
    fromDirectSow?: Date;
  };
  weeksBeforeLastFrost?: number;
  recommendations: string[];
}

/**
 * Get planting guidance for a seed based on user's location
 */
export function getPlantingGuidance(seed: Seed): PlantingGuidance {
  const profile = getProfile();
  if (!profile?.zipCode) {
    return {
      hasData: false,
      recommendations: ['Add your zip code in Profile to get personalized planting dates'],
    };
  }

  const climate = getClimateData(profile.zipCode);
  if (!climate) {
    return {
      hasData: false,
      recommendations: ['Climate data not available for your zip code'],
    };
  }

  const currentYear = new Date().getFullYear();
  const [lastFrostMonth, lastFrostDay] = climate.averageLastFrost.split('-').map(Number);
  const [firstFrostMonth, firstFrostDay] = climate.averageFirstFrost.split('-').map(Number);
  
  const lastFrostDate = new Date(currentYear, lastFrostMonth - 1, lastFrostDay);
  const firstFrostDate = new Date(currentYear, firstFrostMonth - 1, firstFrostDay);
  
  // If first frost is before last frost, it's next year
  if (firstFrostDate < lastFrostDate) {
    firstFrostDate.setFullYear(currentYear + 1);
  }

  const recommendations: string[] = [];
  let startSeedsIndoors: Date | undefined;
  let transplantDate: Date | undefined;
  let directSowDate: Date | undefined;
  let expectedHarvestDate: Date | undefined; // Legacy support
  const harvestDates: {
    fromIndoorStart?: Date;
    fromTransplantedStart?: Date;
    fromDirectSow?: Date;
  } = {};
  let weeksBeforeLastFrost: number | undefined;

  // Determine seed starting strategy based on seed type and characteristics
  const isWarmSeason = seed.type === 'vegetable' && ['tomato', 'pepper', 'eggplant', 'cucumber', 'squash'].some(v => 
    seed.name.toLowerCase().includes(v) || seed.variety.toLowerCase().includes(v)
  );
  
  const isCoolSeason = seed.type === 'vegetable' && ['lettuce', 'spinach', 'kale', 'broccoli', 'cabbage', 'carrot', 'beet', 'radish'].some(v =>
    seed.name.toLowerCase().includes(v) || seed.variety.toLowerCase().includes(v)
  );

  const isHerb = seed.type === 'herb';
  const isFlower = seed.type === 'flower';

  // Parse days to germination
  const daysToGermination = seed.daysToGermination 
    ? parseInt(seed.daysToGermination.split('-')[0]) || parseInt(seed.daysToGermination) || 7
    : 7;

  // Parse days to maturity
  const daysToMaturity = seed.daysToMaturity
    ? parseInt(seed.daysToMaturity.split('-')[0]) || parseInt(seed.daysToMaturity) || 60
    : 60;

  if (isWarmSeason) {
    // Warm season crops: Start indoors 6-8 weeks before last frost
    // For tomatoes, typically 6-8 weeks
    // For peppers, typically 8-10 weeks
    const isTomato = seed.name.toLowerCase().includes('tomato') || seed.variety.toLowerCase().includes('tomato');
    const weeksToStart = isTomato ? 6 : 8;
    weeksBeforeLastFrost = weeksToStart;
    
    startSeedsIndoors = new Date(lastFrostDate);
    startSeedsIndoors.setDate(startSeedsIndoors.getDate() - (weeksToStart * 7));
    
    transplantDate = new Date(lastFrostDate);
    transplantDate.setDate(transplantDate.getDate() + 7); // 1 week after last frost for safety
    
    // Direct sow date: 1 week after last frost for safety
    directSowDate = new Date(lastFrostDate);
    directSowDate.setDate(directSowDate.getDate() + 7);
    
    // Calculate harvest dates for all scenarios
    // 1. Started indoors: start indoors date + days to germination + days to maturity (earliest harvest)
    harvestDates.fromIndoorStart = new Date(startSeedsIndoors);
    harvestDates.fromIndoorStart.setDate(harvestDates.fromIndoorStart.getDate() + daysToGermination + daysToMaturity);
    
    // 2. Transplanted start (bought from nursery): transplant date + days to maturity
    harvestDates.fromTransplantedStart = new Date(transplantDate);
    harvestDates.fromTransplantedStart.setDate(harvestDates.fromTransplantedStart.getDate() + daysToMaturity);
    
    // 3. Direct sow: direct sow date + days to germination + days to maturity (later harvest)
    harvestDates.fromDirectSow = new Date(directSowDate);
    harvestDates.fromDirectSow.setDate(harvestDates.fromDirectSow.getDate() + daysToGermination + daysToMaturity);
    
    expectedHarvestDate = harvestDates.fromIndoorStart; // Legacy support
    
    recommendations.push(`Start seeds indoors ${weeksToStart} weeks before last frost`);
    recommendations.push(`Transplant outdoors 1 week after last frost (around ${formatDate(transplantDate)})`);
  } else if (isCoolSeason) {
    // Cool season crops: Can direct sow or start indoors
    // Many can be planted 2-4 weeks before last frost
    const weeksToStart = 4;
    weeksBeforeLastFrost = weeksToStart;
    
    startSeedsIndoors = new Date(lastFrostDate);
    startSeedsIndoors.setDate(startSeedsIndoors.getDate() - (weeksToStart * 7));
    
    directSowDate = new Date(lastFrostDate);
    directSowDate.setDate(directSowDate.getDate() - (weeksToStart * 7));
    
    // Calculate harvest dates for all scenarios
    // 1. Started indoors: start indoors date + days to germination + days to maturity (earliest harvest)
    harvestDates.fromIndoorStart = new Date(startSeedsIndoors);
    harvestDates.fromIndoorStart.setDate(harvestDates.fromIndoorStart.getDate() + daysToGermination + daysToMaturity);
    
    // 2. Transplanted start: transplant date + days to maturity
    const coolTransplantDate = new Date(lastFrostDate);
    coolTransplantDate.setDate(coolTransplantDate.getDate() + 7);
    harvestDates.fromTransplantedStart = new Date(coolTransplantDate);
    harvestDates.fromTransplantedStart.setDate(harvestDates.fromTransplantedStart.getDate() + daysToMaturity);
    
    // 3. Direct sow: direct sow date + days to germination + days to maturity (later harvest)
    harvestDates.fromDirectSow = new Date(directSowDate);
    harvestDates.fromDirectSow.setDate(harvestDates.fromDirectSow.getDate() + daysToGermination + daysToMaturity);
    
    expectedHarvestDate = harvestDates.fromDirectSow; // Legacy support
    
    recommendations.push(`Can start indoors or direct sow ${weeksToStart} weeks before last frost`);
    recommendations.push(`Direct sow date: ${formatDate(directSowDate)}`);
  } else if (isHerb) {
    // Herbs: Can start indoors 4-6 weeks before last frost or direct sow
    const weeksToStart = 6;
    weeksBeforeLastFrost = weeksToStart;
    
    startSeedsIndoors = new Date(lastFrostDate);
    startSeedsIndoors.setDate(startSeedsIndoors.getDate() - (weeksToStart * 7));
    
    directSowDate = new Date(lastFrostDate);
    directSowDate.setDate(directSowDate.getDate() - 14); // 2 weeks before last frost
    
    const herbTransplantDate = new Date(lastFrostDate);
    herbTransplantDate.setDate(herbTransplantDate.getDate() + 7);
    
    // Calculate harvest dates
    // 1. Started indoors: start indoors date + days to germination + days to maturity (earliest harvest)
    harvestDates.fromIndoorStart = new Date(startSeedsIndoors);
    harvestDates.fromIndoorStart.setDate(harvestDates.fromIndoorStart.getDate() + daysToGermination + daysToMaturity);
    
    // 2. Transplanted start: transplant date + days to maturity
    harvestDates.fromTransplantedStart = new Date(herbTransplantDate);
    harvestDates.fromTransplantedStart.setDate(harvestDates.fromTransplantedStart.getDate() + daysToMaturity);
    
    // 3. Direct sow: direct sow date + days to germination + days to maturity (later harvest)
    harvestDates.fromDirectSow = new Date(directSowDate);
    harvestDates.fromDirectSow.setDate(harvestDates.fromDirectSow.getDate() + daysToGermination + daysToMaturity);
    
    recommendations.push(`Start indoors ${weeksToStart} weeks before last frost, or direct sow 2 weeks before`);
    recommendations.push(`Indoor start: ${formatDate(startSeedsIndoors)}`);
    recommendations.push(`Direct sow: ${formatDate(directSowDate)}`);
  } else if (isFlower) {
    // Flowers: Varies, but many annuals start 6-8 weeks before last frost
    const weeksToStart = 6;
    weeksBeforeLastFrost = weeksToStart;
    
    startSeedsIndoors = new Date(lastFrostDate);
    startSeedsIndoors.setDate(startSeedsIndoors.getDate() - (weeksToStart * 7));
    
    transplantDate = new Date(lastFrostDate);
    transplantDate.setDate(transplantDate.getDate() + 7);
    
    // Direct sow date: 1 week after last frost
    directSowDate = new Date(lastFrostDate);
    directSowDate.setDate(directSowDate.getDate() + 7);
    
    // Calculate harvest dates
    // 1. Started indoors: start indoors date + days to germination + days to maturity (earliest harvest)
    harvestDates.fromIndoorStart = new Date(startSeedsIndoors);
    harvestDates.fromIndoorStart.setDate(harvestDates.fromIndoorStart.getDate() + daysToGermination + daysToMaturity);
    
    // 2. Transplanted start: transplant date + days to maturity
    harvestDates.fromTransplantedStart = new Date(transplantDate);
    harvestDates.fromTransplantedStart.setDate(harvestDates.fromTransplantedStart.getDate() + daysToMaturity);
    
    // 3. Direct sow: direct sow date + days to germination + days to maturity (later harvest)
    harvestDates.fromDirectSow = new Date(directSowDate);
    harvestDates.fromDirectSow.setDate(harvestDates.fromDirectSow.getDate() + daysToGermination + daysToMaturity);
    
    recommendations.push(`Start seeds indoors ${weeksToStart} weeks before last frost`);
    recommendations.push(`Transplant after last frost: ${formatDate(transplantDate)}`);
  } else {
    // Generic guidance
    const weeksToStart = 6;
    weeksBeforeLastFrost = weeksToStart;
    
    startSeedsIndoors = new Date(lastFrostDate);
    startSeedsIndoors.setDate(startSeedsIndoors.getDate() - (weeksToStart * 7));
    
    recommendations.push(`Start seeds indoors ${weeksToStart} weeks before last frost`);
  }

  // Add planting month info if available
  if (seed.plantingMonths && seed.plantingMonths.length > 0) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = seed.plantingMonths.map(m => monthNames[m - 1]).join(', ');
    recommendations.push(`Planting months: ${months}`);
  }

  return {
    hasData: true,
    lastFrostDate,
    firstFrostDate,
    startSeedsIndoors,
    transplantDate,
    directSowDate,
    expectedHarvestDate, // Legacy support
    harvestDates: Object.keys(harvestDates).length > 0 ? harvestDates : undefined,
    weeksBeforeLastFrost,
    recommendations,
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

