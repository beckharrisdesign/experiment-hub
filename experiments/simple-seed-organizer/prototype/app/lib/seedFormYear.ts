/**
 * Parse year from form text; never returns NaN.
 */
export function parseSeedYearFromInput(yearRaw: string): number | undefined {
  const t = yearRaw.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}
