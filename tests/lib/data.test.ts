import { describe, it, expect } from "vitest";
import { parsePRD, parseMarketResearch } from "@/lib/data";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FULL_PRD = `# Experiment Name PRD

## Overview
This experiment tests a new concept for makers.

## Problem Statement
Users struggle with seed organization.

## Goals & Objectives
- Increase engagement
- Reduce friction

## Target User
Makers and creators aged 25-45.

## Core Features
- Feature one
- Feature two

## User Stories
- As a user, I want to track my seeds

## Technical Requirements
- Node.js backend
- SQLite database

## Success Metrics
- 100 signups in first month

## Validation Plan (Landing Page)
- Create landing page with waitlist form
`;

// Market research with realistic exec summary format
const FULL_MARKET_RESEARCH = `# Market Research

## Executive Summary
- **TAM**: $15M - $40M (competitor-anchored, based on adjacent tool revenue)
- **SAM**: $500K - $1.5M (target segment methodology, hobbyist gardeners)
- **SOM (Year 1)**: $50K - $150K
- **SOM (Year 3)**: $500K - $1.5M
- **Market Opportunity Assessment**: **Strong**
- **Go/No-Go Recommendation**: **Go**

## Market Size Analysis
- TAM: $15M - $40M
- SAM: $500K - $1.5M
- SOM: $50K - $150K

## Growth Trajectory
- Year 1: 0.1% market share = $50K - $150K
- Year 2: 0.2% market share = $840K - $1.4M
- Year 3: 0.5% market share = $500K - $1.5M

## Go/No-Go Recommendation
Based on analysis, this is a Go.
`;

// ---------------------------------------------------------------------------
// parsePRD
// ---------------------------------------------------------------------------

describe("parsePRD", () => {
  it("extracts all 9 named sections from a complete PRD", () => {
    const result = parsePRD(FULL_PRD);
    expect(result.overview).toContain("This experiment tests a new concept");
    expect(result.problemStatement).toContain("Users struggle with seed organization");
    expect(result.goals).toContain("Increase engagement");
    expect(result.targetUser).toContain("Makers and creators");
    expect(result.coreFeatures).toContain("Feature one");
    expect(result.userStories).toContain("track my seeds");
    expect(result.technicalRequirements).toContain("Node.js backend");
    expect(result.successMetrics).toContain("100 signups");
    expect(result.validationPlan).toContain("waitlist form");
  });

  it("always returns the original markdown as fullContent", () => {
    const result = parsePRD(FULL_PRD);
    expect(result.fullContent).toBe(FULL_PRD);
  });

  it("returns empty string for a missing section", () => {
    const partial = `## Overview\nSome content.\n`;
    const result = parsePRD(partial);
    expect(result.problemStatement).toBe("");
    expect(result.goals).toBe("");
    expect(result.validationPlan).toBe("");
  });

  it("returns all empty strings for empty input", () => {
    const result = parsePRD("");
    expect(result.overview).toBe("");
    expect(result.problemStatement).toBe("");
    expect(result.goals).toBe("");
    expect(result.fullContent).toBe("");
  });

  it("ignores blank lines within sections", () => {
    const prd = `## Overview\nFirst line.\n\nSecond line after blank.\n`;
    const result = parsePRD(prd);
    // Blank lines are filtered; non-blank lines are joined
    expect(result.overview).toContain("First line.");
    expect(result.overview).toContain("Second line after blank.");
  });

  it("does not include content before the first ## heading", () => {
    const prd = `# Title\nPreamble text\n## Overview\nActual content.\n`;
    const result = parsePRD(prd);
    expect(result.overview).toContain("Actual content.");
    expect(result.overview).not.toContain("Preamble");
  });

  it("is case-sensitive for section names", () => {
    // 'overview' (lowercase) should NOT match 'Overview'
    const prd = `## overview\nLowercase content.\n`;
    const result = parsePRD(prd);
    expect(result.overview).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseMarketResearch — TAM / SAM / SOM ranges
// ---------------------------------------------------------------------------

describe("parseMarketResearch – TAM/SAM/SOM extraction", () => {
  it("extracts TAM as a formatted range string", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.tam).toBe("$15M - $40M");
  });

  it("extracts SAM as a formatted range string", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.sam).toBe("$500K - $1.5M");
  });

  it("extracts SOM (non-year-scoped) as a formatted range string", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.som).toBe("$50K - $150K");
  });

  it("does not confuse year-scoped SOM lines with the top-level SOM field", () => {
    // Year 1/2/3 SOM lines should not populate `som`
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    // Top-level SOM comes from the Market Size Analysis section
    expect(result.som).not.toContain("Year");
  });

  it("returns null TAM/SAM/SOM when section is absent", () => {
    const result = parseMarketResearch("## Executive Summary\nNo market data here.\n");
    expect(result.tam).toBeNull();
    expect(result.sam).toBeNull();
    expect(result.som).toBeNull();
  });

  it("handles a single-value TAM (no range)", () => {
    const mr = `## Executive Summary\n- TAM: $10M\n`;
    const result = parseMarketResearch(mr);
    expect(result.tam).toBe("$10M");
  });

  it("handles B (billion) suffix", () => {
    const mr = `## Executive Summary\n- TAM: $2B - $5B\n`;
    const result = parseMarketResearch(mr);
    expect(result.tam).toBe("$2B - $5B");
  });
});

// ---------------------------------------------------------------------------
// parseMarketResearch — Year SOM midpoints
// ---------------------------------------------------------------------------

describe("parseMarketResearch – Year SOM midpoints", () => {
  it("calculates Year 1 SOM midpoint correctly", () => {
    // ($50K + $150K) / 2 = $100K
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.somYear1).toBe("$100K");
  });

  it("calculates Year 3 SOM midpoint correctly", () => {
    // ($500K + $1.5M) / 2 = ($500000 + $1500000) / 2 = $1000000 → $1.0M
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.somYear3).toBe("$1.0M");
  });

  it("extracts Year 2 SOM from Growth Trajectory fallback format", () => {
    // "- Year 2: 0.2% market share = $840K - $1.4M"
    // ($840K + $1.4M) / 2 = (840000 + 1400000) / 2 = 1120000 → $1.1M
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.somYear2).toBe("$1.1M");
  });

  it("returns null Year SOM values when absent", () => {
    const result = parseMarketResearch("## Executive Summary\nNo SOM data.\n");
    expect(result.somYear1).toBeNull();
    expect(result.somYear2).toBeNull();
    expect(result.somYear3).toBeNull();
  });

  it("uses single value (no midpoint) when only one side of range is present", () => {
    const mr = `## Executive Summary\n- SOM (Year 1): $100K\n`;
    const result = parseMarketResearch(mr);
    expect(result.somYear1).toBe("$100K");
  });
});

// ---------------------------------------------------------------------------
// parseMarketResearch — MOA and Go/No-Go
// ---------------------------------------------------------------------------

describe("parseMarketResearch – MOA and Go/No-Go", () => {
  it("extracts the Market Opportunity Assessment value", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.moa).toBe("Strong");
  });

  it("extracts the Go/No-Go Recommendation value", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.goNoGo).toBe("Go");
  });

  it("returns null MOA when not present", () => {
    const result = parseMarketResearch("## Executive Summary\nNo MOA here.\n");
    expect(result.moa).toBeNull();
  });

  it("returns null goNoGo when not present", () => {
    const result = parseMarketResearch("## Executive Summary\nNo recommendation.\n");
    expect(result.goNoGo).toBeNull();
  });

  it("is case-insensitive when matching MOA and Go/No-Go", () => {
    const mr = `## Executive Summary\nmarket opportunity assessment: **Moderate**\ngo/no-go recommendation: **No-Go**\n`;
    const result = parseMarketResearch(mr);
    expect(result.moa).toBe("Moderate");
    expect(result.goNoGo).toBe("No-Go");
  });
});

// ---------------------------------------------------------------------------
// parseMarketResearch — methodology descriptions
// ---------------------------------------------------------------------------

describe("parseMarketResearch – methodology descriptions", () => {
  it("extracts TAM methodology from parenthetical in exec summary", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.tamDesc).toBe("competitor-anchored, based on adjacent tool revenue");
  });

  it("extracts SAM methodology from parenthetical in exec summary", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.samDesc).toBe("target segment methodology, hobbyist gardeners");
  });

  it("returns null tamDesc when no parenthetical present", () => {
    const mr = `## Executive Summary\n- **TAM**: $15M - $40M\n`;
    const result = parseMarketResearch(mr);
    expect(result.tamDesc).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseMarketResearch — fullContent and executiveSummary
// ---------------------------------------------------------------------------

describe("parseMarketResearch – pass-through fields", () => {
  it("returns original markdown as fullContent", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.fullContent).toBe(FULL_MARKET_RESEARCH);
  });

  it("returns the executive summary section text", () => {
    const result = parseMarketResearch(FULL_MARKET_RESEARCH);
    expect(result.executiveSummary).toContain("TAM");
    expect(result.executiveSummary).toContain("Go/No-Go Recommendation");
  });

  it("returns empty string for executiveSummary when section is absent", () => {
    const result = parseMarketResearch("## Market Size Analysis\nSome data.\n");
    expect(result.executiveSummary).toBe("");
  });
});
