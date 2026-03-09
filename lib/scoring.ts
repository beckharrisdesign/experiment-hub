import type { ExperimentScores } from "@/types";

/**
 * Sum all 5 scoring dimensions. Returns null if scores are absent or incomplete.
 */
export function calculateTotalScore(
  scores: ExperimentScores | null | undefined
): number | null {
  if (!scores) return null;

  const {
    businessOpportunity,
    personalImpact,
    competitiveAdvantage,
    platformCost,
    socialImpact,
  } = scores;

  if (
    businessOpportunity === undefined ||
    personalImpact === undefined ||
    competitiveAdvantage === undefined ||
    platformCost === undefined ||
    socialImpact === undefined
  ) {
    return null;
  }

  return (
    businessOpportunity +
    personalImpact +
    competitiveAdvantage +
    platformCost +
    socialImpact
  );
}

/**
 * Parse a formatted SOM string like "$50K", "$1.5M", "$2B" into a raw number
 * for sort comparison. Returns 0 for null/unparseable values.
 */
export function parseSOMValue(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/\$?([\d.]+)([KMkmBb])?/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") return num * 1000;
  if (suffix === "M") return num * 1000000;
  if (suffix === "B") return num * 1000000000;
  return num;
}
