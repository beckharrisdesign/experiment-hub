import { describe, it, expect } from "vitest";
import { calculateTotalScore, parseSOMValue } from "@/lib/scoring";
import type { ExperimentScores } from "@/types";

// ---------------------------------------------------------------------------
// calculateTotalScore
// ---------------------------------------------------------------------------

describe("calculateTotalScore", () => {
  const fullScores: ExperimentScores = {
    businessOpportunity: 4,
    personalImpact: 5,
    competitiveAdvantage: 3,
    platformCost: 4,
    socialImpact: 5,
  };

  it("sums all 5 dimensions", () => {
    expect(calculateTotalScore(fullScores)).toBe(21);
  });

  it("returns the minimum possible score (all 1s = 5)", () => {
    const min: ExperimentScores = {
      businessOpportunity: 1,
      personalImpact: 1,
      competitiveAdvantage: 1,
      platformCost: 1,
      socialImpact: 1,
    };
    expect(calculateTotalScore(min)).toBe(5);
  });

  it("returns the maximum possible score (all 5s = 25)", () => {
    const max: ExperimentScores = {
      businessOpportunity: 5,
      personalImpact: 5,
      competitiveAdvantage: 5,
      platformCost: 5,
      socialImpact: 5,
    };
    expect(calculateTotalScore(max)).toBe(25);
  });

  it("returns null for null input", () => {
    expect(calculateTotalScore(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(calculateTotalScore(undefined)).toBeNull();
  });

  // If any dimension is undefined (shouldn't happen at runtime with valid data,
  // but worth guarding), the function should return null rather than NaN.
  it("returns null when a dimension value is undefined (partial scores)", () => {
    const partial = { ...fullScores, socialImpact: undefined } as unknown as ExperimentScores;
    expect(calculateTotalScore(partial)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Total score colour thresholds (business rules)
// These are encoded in the UI but the raw scores come from calculateTotalScore.
// Documenting the thresholds here makes regressions immediately visible.
// ---------------------------------------------------------------------------

describe("calculateTotalScore – score range boundaries", () => {
  const makeScore = (v: number): ExperimentScores => ({
    businessOpportunity: v,
    personalImpact: v,
    competitiveAdvantage: v,
    platformCost: v,
    socialImpact: v,
  });

  it("a score of 5 (all 1s) is below the red threshold floor", () => {
    expect(calculateTotalScore(makeScore(1))).toBe(5);
  });

  it("a score of 9 is the top of the red band (5-9)", () => {
    // 1+1+1+1+5 = 9
    const scores: ExperimentScores = { businessOpportunity: 1, personalImpact: 1, competitiveAdvantage: 1, platformCost: 1, socialImpact: 5 };
    expect(calculateTotalScore(scores)).toBe(9);
  });

  it("a score of 10 is the bottom of the orange band (10-14)", () => {
    const scores: ExperimentScores = { businessOpportunity: 2, personalImpact: 2, competitiveAdvantage: 2, platformCost: 2, socialImpact: 2 };
    expect(calculateTotalScore(scores)).toBe(10);
  });

  it("a score of 15 is the bottom of the yellow band (15-19)", () => {
    const scores: ExperimentScores = { businessOpportunity: 3, personalImpact: 3, competitiveAdvantage: 3, platformCost: 3, socialImpact: 3 };
    expect(calculateTotalScore(scores)).toBe(15);
  });

  it("a score of 20 is the bottom of the green band (20-25)", () => {
    const scores: ExperimentScores = { businessOpportunity: 4, personalImpact: 4, competitiveAdvantage: 4, platformCost: 4, socialImpact: 4 };
    expect(calculateTotalScore(scores)).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// parseSOMValue
// ---------------------------------------------------------------------------

describe("parseSOMValue", () => {
  it("parses K suffix (thousands)", () => {
    expect(parseSOMValue("$50K")).toBe(50_000);
  });

  it("parses M suffix (millions)", () => {
    expect(parseSOMValue("$1.5M")).toBe(1_500_000);
  });

  it("parses B suffix (billions)", () => {
    expect(parseSOMValue("$2B")).toBe(2_000_000_000);
  });

  it("is case-insensitive for suffixes", () => {
    expect(parseSOMValue("$50k")).toBe(50_000);
    expect(parseSOMValue("$1.5m")).toBe(1_500_000);
    expect(parseSOMValue("$2b")).toBe(2_000_000_000);
  });

  it("handles values without a dollar sign", () => {
    expect(parseSOMValue("100K")).toBe(100_000);
  });

  it("handles a plain number with no suffix", () => {
    expect(parseSOMValue("1234")).toBe(1234);
  });

  it("returns 0 for null", () => {
    expect(parseSOMValue(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(parseSOMValue(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parseSOMValue("")).toBe(0);
  });

  it("returns 0 for a string with no numeric content", () => {
    expect(parseSOMValue("N/A")).toBe(0);
  });

  it("parses a midpoint string produced by parseMarketResearch", () => {
    // calculateMidpoint("50K", "150K") → "$100K"
    expect(parseSOMValue("$100K")).toBe(100_000);
  });

  it("parses fractional millions", () => {
    expect(parseSOMValue("$1.1M")).toBe(1_100_000);
  });
});
