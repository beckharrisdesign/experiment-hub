import { Seed } from '@/types/seed';
import { getPlantingGuidance, PlantingGuidance } from './plantingGuidance';

export type PlantingAction = 'startIndoors' | 'directSow' | 'transplant';

export interface PlantingNowItem {
  seed: Seed;
  guidance: PlantingGuidance;
  action: PlantingAction;
  date: Date;
}

export interface PlantingNowGroup {
  action: PlantingAction;
  label: string;
  seeds: Seed[];
  date: Date; // earliest date in this group
}

export interface PlantingNowResult {
  /** Actions within the next 14 days (or up to 7 days past — grace period) */
  nowItems: PlantingNowItem[];
  /** Actions 15–28 days out */
  upcomingItems: PlantingNowItem[];
  /** Whether the user has a zone configured */
  hasZone: boolean;
}

const NOW_PAST_GRACE_DAYS = 7;  // include actions up to 7 days ago
const NOW_FUTURE_DAYS = 14;     // include actions up to 14 days out
const UPCOMING_DAYS = 28;       // "coming up" window ends at 28 days

/** Days between today and a target date (positive = future, negative = past). */
export function daysFromToday(date: Date, today: Date = new Date()): number {
  const d = new Date(date);
  const t = new Date(today);
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

/** True if the action date falls in the "act now" window (grace period to NOW_FUTURE_DAYS). */
export function isActionableNow(date: Date, today: Date = new Date()): boolean {
  const diff = daysFromToday(date, today);
  return diff >= -NOW_PAST_GRACE_DAYS && diff <= NOW_FUTURE_DAYS;
}

/** True if the action date falls in the "upcoming" window (just beyond now, up to UPCOMING_DAYS). */
export function isActionableUpcoming(date: Date, today: Date = new Date()): boolean {
  const diff = daysFromToday(date, today);
  return diff > NOW_FUTURE_DAYS && diff <= UPCOMING_DAYS;
}

/**
 * Group a flat list of planting items by action, collapsing duplicates.
 * Returns one entry per distinct action, sorted by earliest date.
 */
export function groupByAction(items: PlantingNowItem[]): PlantingNowGroup[] {
  const map = new Map<PlantingAction, { seeds: Seed[]; date: Date }>();
  for (const item of items) {
    const existing = map.get(item.action);
    if (existing) {
      if (!existing.seeds.includes(item.seed)) {
        existing.seeds.push(item.seed);
      }
      if (item.date < existing.date) existing.date = item.date;
    } else {
      map.set(item.action, { seeds: [item.seed], date: item.date });
    }
  }

  const ACTION_LABELS: Record<PlantingAction, string> = {
    startIndoors: 'Start indoors',
    directSow: 'Sow now',
    transplant: 'Transplant',
  };

  return Array.from(map.entries())
    .map(([action, { seeds, date }]) => ({
      action,
      label: ACTION_LABELS[action],
      seeds,
      date,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Compute which seeds need action right now or soon, based on the user's zone.
 * Calls getPlantingGuidance() for each seed — safe for client-side use only.
 *
 * @param seeds  The user's full seed collection
 * @param today  Optional override for the current date (useful for testing)
 */
export function getPlantingNow(seeds: Seed[], today: Date = new Date()): PlantingNowResult {
  if (seeds.length === 0) {
    return { nowItems: [], upcomingItems: [], hasZone: false };
  }

  // Check zone by testing the first seed's guidance
  const testGuidance = getPlantingGuidance(seeds[0]);
  if (!testGuidance.hasData) {
    return { nowItems: [], upcomingItems: [], hasZone: false };
  }

  const nowItems: PlantingNowItem[] = [];
  const upcomingItems: PlantingNowItem[] = [];
  const seenNow = new Set<string>(); // seedId:action to dedupe

  for (const seed of seeds) {
    const guidance = getPlantingGuidance(seed);
    if (!guidance.hasData) continue;

    const candidates: Array<{ date: Date; action: PlantingAction }> = [];
    if (guidance.startSeedsIndoors) candidates.push({ date: guidance.startSeedsIndoors, action: 'startIndoors' });
    if (guidance.directSowDate) candidates.push({ date: guidance.directSowDate, action: 'directSow' });
    if (guidance.transplantDate) candidates.push({ date: guidance.transplantDate, action: 'transplant' });

    for (const { date, action } of candidates) {
      const key = `${seed.id}:${action}`;
      if (isActionableNow(date, today)) {
        if (!seenNow.has(key)) {
          seenNow.add(key);
          nowItems.push({ seed, guidance, action, date });
        }
      } else if (isActionableUpcoming(date, today)) {
        if (!seenNow.has(key)) {
          seenNow.add(key);
          upcomingItems.push({ seed, guidance, action, date });
        }
      }
    }
  }

  nowItems.sort((a, b) => a.date.getTime() - b.date.getTime());
  upcomingItems.sort((a, b) => a.date.getTime() - b.date.getTime());

  return { nowItems, upcomingItems, hasZone: true };
}
