import type { Experiment, ExperimentScores, ImpactScores } from "@/types";

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
 * Sum the three v3 impact dimensions (3-15). Returns null if scores are
 * absent or incomplete — a partial row must not show a misleading total.
 */
export function calculateImpactTotal(
  scores: ImpactScores | null | undefined
): number | null {
  if (!scores) return null;
  const { personal, social, business } = scores;
  if (
    personal === undefined ||
    social === undefined ||
    business === undefined
  ) {
    return null;
  }
  return personal + social + business;
}

export interface ScoreSummary {
  total: number;
  max: number;
  shape: "impact" | "v1";
}

/**
 * The total to display for an experiment, preferring the v3 impact shape over
 * v1 history when both are complete. Null when neither shape is complete.
 */
export function summarizeExperimentScore(
  experiment: Pick<Experiment, "scores" | "impactScores">
): ScoreSummary | null {
  const impact = calculateImpactTotal(experiment.impactScores);
  if (impact !== null) return { total: impact, max: 15, shape: "impact" };
  const v1 = calculateTotalScore(experiment.scores);
  if (v1 !== null) return { total: v1, max: 25, shape: "v1" };
  return null;
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
