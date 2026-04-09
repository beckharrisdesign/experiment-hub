/** Seeds packed 3+ years ago should be used first (default threshold). */
export const USE_FIRST_THRESHOLD_YEARS = 3;

export type ViabilityStatus = "good" | "watch" | "use-first" | "unknown";

/**
 * Approximate viability in years for common crops, keyed by lowercase name
 * fragment. First matching entry wins.
 * Sources: USDA, Johnny's Selected Seeds, and general seed-saving guides.
 */
const CROP_VIABILITY_YEARS: Array<[string, number]> = [
  // Short-lived (2 years)
  ["onion", 2],
  ["leek", 2],
  ["chive", 2],
  ["parsley", 2],
  ["parsnip", 2],
  ["corn", 2],
  ["pepper", 2],
  // Standard (3 years — matches the default)
  ["bean", 3],
  ["pea", 3],
  ["carrot", 3],
  ["broccoli", 3],
  ["cabbage", 3],
  ["kale", 3],
  ["spinach", 3],
  ["basil", 3],
  // Long-lived (4 years)
  ["tomato", 4],
  ["squash", 4],
  ["pumpkin", 4],
  ["cucumber", 4],
  ["melon", 4],
  ["watermelon", 4],
  ["radish", 4],
  // Very long-lived (5+ years)
  ["lettuce", 5],
  ["beet", 5],
  ["chard", 5],
  ["celery", 5],
];

/**
 * Returns the viability threshold (years) for a given crop name.
 * Falls back to USE_FIRST_THRESHOLD_YEARS if the crop is unknown.
 */
export function getCropViabilityThreshold(cropName?: string): number {
  if (!cropName) return USE_FIRST_THRESHOLD_YEARS;
  const lower = cropName.toLowerCase();
  for (const [fragment, years] of CROP_VIABILITY_YEARS) {
    if (lower.includes(fragment)) return years;
  }
  return USE_FIRST_THRESHOLD_YEARS;
}

/**
 * Returns age in whole years, or undefined if no year is provided.
 * Accepts an optional currentYear for testability.
 */
export function getSeedAgeYears(
  year: number | undefined,
  currentYear = new Date().getFullYear(),
): number | undefined {
  if (year === undefined) return undefined;
  return currentYear - year;
}

/**
 * Returns a viability status based on the seed's packed year:
 *   good      — more than one year below the crop's use-first threshold
 *   watch     — one year below the threshold
 *   use-first — at or past the threshold
 *   unknown   — no year recorded
 *
 * Pass cropName (e.g. seed.name) for crop-specific thresholds.
 * Omit cropName to use the default 3-year threshold.
 */
export function getViabilityStatus(
  year: number | undefined,
  currentYear = new Date().getFullYear(),
  cropName?: string,
): ViabilityStatus {
  const age = getSeedAgeYears(year, currentYear);
  if (age === undefined) return "unknown";
  const threshold = getCropViabilityThreshold(cropName);
  if (age >= threshold) return "use-first";
  if (age >= threshold - 1) return "watch";
  return "good";
}

/** True if the seed meets the crop-specific "use first" threshold. */
export function isUseFirst(
  year: number | undefined,
  currentYear = new Date().getFullYear(),
  cropName?: string,
): boolean {
  return getViabilityStatus(year, currentYear, cropName) === "use-first";
}
