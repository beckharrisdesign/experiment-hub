import type { SunRequirement } from "@/types/seed";

/**
 * Normalizes free-text sun requirement strings (e.g. from AI extraction or
 * packet reading) to the canonical SunRequirement value used in the Seed type.
 */
export function normalizeSunRequirement(
  text?: string,
): SunRequirement | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (
    lower.includes("full sun") ||
    lower.includes("full-sun") ||
    lower === "sun"
  ) {
    return "full-sun";
  }
  if (
    lower.includes("partial") ||
    lower.includes("part shade") ||
    lower.includes("part-shade")
  ) {
    return "partial-shade";
  }
  if (
    lower.includes("full shade") ||
    lower.includes("full-shade") ||
    lower === "shade"
  ) {
    return "full-shade";
  }
  return undefined;
}
