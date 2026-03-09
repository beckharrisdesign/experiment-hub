/** Seeds packed 3+ years ago should be used first. */
export const USE_FIRST_THRESHOLD_YEARS = 3;

export type ViabilityStatus = 'good' | 'watch' | 'use-first' | 'unknown';

/**
 * Returns age in whole years, or undefined if no year is provided.
 * Accepts an optional currentYear for testability.
 */
export function getSeedAgeYears(
  year: number | undefined,
  currentYear = new Date().getFullYear()
): number | undefined {
  if (year === undefined) return undefined;
  return currentYear - year;
}

/**
 * Returns a viability status based on the seed's packed year:
 *   good      — 0–1 years old
 *   watch     — 2 years old
 *   use-first — 3+ years old
 *   unknown   — no year recorded
 */
export function getViabilityStatus(
  year: number | undefined,
  currentYear = new Date().getFullYear()
): ViabilityStatus {
  const age = getSeedAgeYears(year, currentYear);
  if (age === undefined) return 'unknown';
  if (age >= USE_FIRST_THRESHOLD_YEARS) return 'use-first';
  if (age === 2) return 'watch';
  return 'good';
}

/** True if the seed meets the "use first" threshold. */
export function isUseFirst(
  year: number | undefined,
  currentYear = new Date().getFullYear()
): boolean {
  return getViabilityStatus(year, currentYear) === 'use-first';
}
