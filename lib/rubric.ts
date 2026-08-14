/**
 * v3 impact rubric anchors, mirrored from `rules/scoring-criteria.mdc` so the
 * score component can render each dimension's legend in place. The rules file
 * is the source of truth — a vitest guard asserts these strings match it, so
 * edit both together.
 */

export const IMPACT_DIMENSIONS = ["personal", "social", "business"] as const;

export type ImpactDimensionKey = (typeof IMPACT_DIMENSIONS)[number];

export const IMPACT_DIMENSION_LABELS: Record<ImpactDimensionKey, string> = {
  personal: "Personal",
  social: "Social",
  business: "Business",
};

/** Anchor text per dimension, scores 5 down to 1. */
export const IMPACT_ANCHORS: Record<
  ImpactDimensionKey,
  { score: number; text: string }[]
> = {
  personal: [
    { score: 5, text: "Solves a daily problem I face, would use constantly" },
    { score: 4, text: "Solves a regular problem, would use frequently" },
    { score: 3, text: "Solves an occasional problem, would use sometimes" },
    { score: 2, text: "Solves a rare problem, would use rarely" },
    { score: 1, text: "No personal use case, wouldn't use it myself" },
  ],
  social: [
    {
      score: 5,
      text: "Addresses critical need, serves underserved communities, high joy",
    },
    {
      score: 4,
      text: "Addresses important need, good positive impact, meaningful",
    },
    {
      score: 3,
      text: "Addresses moderate need, some value, neutral contribution",
    },
    { score: 2, text: "Addresses minor need, minimal positive impact" },
    { score: 1, text: "No meaningful impact, no clear benefit to others" },
  ],
  business: [
    {
      score: 5,
      text: "People already pay for worse; clear differentiation; a revenue path you could start this month",
    },
    {
      score: 4,
      text: "Validated demand in an underserved niche, limited competition",
    },
    { score: 3, text: "Real demand signals; competitive but viable positioning" },
    {
      score: 2,
      text: "Weak market indicators or a crowded field; the differentiation is a story",
    },
    {
      score: 1,
      text: "No demand evidence; saturated market or no clear revenue path",
    },
  ],
};
