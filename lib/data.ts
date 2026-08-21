import { promises as fs } from "fs";
import path from "path";
import type { Experiment, Prototype, Documentation } from "@/types";
import { slugify } from "@/lib/utils";
import {
  getExperimentsFromSupabase,
  getExperimentByIdFromSupabase,
  getPrototypesFromSupabase,
  getPrototypeByExperimentIdFromSupabase,
  getDocumentationFromSupabase,
  getDocumentationByExperimentIdFromSupabase,
} from "@/lib/supabase";
import {
  hasNotionExperiments,
  getExperimentsFromNotion,
  getExperimentBySlugFromNotion,
} from "@/lib/notion-experiments";

function hasSupabase() {
  return !!(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

// Notion is the source of truth for experiments; Supabase is the one fallback
// behind it. There is no JSON snapshot tier any more — it was removed on
// 2026-08-21 because a nine-month-stale file silently standing in for live data
// is worse than an outage you can see. Experiment statuses and visibility are
// edited in Notion and nowhere else.
function logNotionFallback(source: string, error: unknown) {
  console.error(
    `[data] Notion read failed in ${source}; falling back to Supabase:`,
    error,
  );
}

function logSupabaseFailure(source: string, error: unknown) {
  console.error(`[data] Supabase read failed in ${source}:`, error);
}

/**
 * Thrown when every configured source failed or none is configured. Callers
 * surface this rather than rendering a stale or empty catalog: app/page.tsx
 * logs and rethrows into the error boundary, which is the visible-outage
 * behaviour we want.
 */
function noSourceAvailable(source: string): never {
  throw new Error(
    `[data] ${source}: no data source available. Notion and Supabase both ` +
      `failed or are unconfigured, and there is no JSON fallback.`,
  );
}

export async function getExperiments(): Promise<Experiment[]> {
  if (hasNotionExperiments()) {
    try {
      return await getExperimentsFromNotion();
    } catch (error) {
      logNotionFallback("getExperiments", error);
    }
  }
  if (hasSupabase()) {
    try {
      return await getExperimentsFromSupabase();
    } catch (error) {
      logSupabaseFailure("getExperiments", error);
      throw error;
    }
  }
  noSourceAvailable("getExperiments");
}

export async function getPrototypes(): Promise<Prototype[]> {
  if (hasSupabase()) {
    try {
      return await getPrototypesFromSupabase();
    } catch (error) {
      logSupabaseFailure("getPrototypes", error);
      throw error;
    }
  }
  noSourceAvailable("getPrototypes");
}

export async function getDocumentation(): Promise<Documentation[]> {
  if (hasSupabase()) {
    try {
      return await getDocumentationFromSupabase();
    } catch (error) {
      logSupabaseFailure("getDocumentation", error);
      throw error;
    }
  }
  noSourceAvailable("getDocumentation");
}

export async function getExperimentById(
  id: string,
): Promise<Experiment | null> {
  if (hasNotionExperiments()) {
    try {
      // On a miss, fall through so experiments not yet in Notion still resolve.
      const fromNotion = await getExperimentBySlugFromNotion(id);
      if (fromNotion) return fromNotion;
    } catch (error) {
      logNotionFallback("getExperimentById", error);
    }
  }
  if (hasSupabase()) {
    try {
      return await getExperimentByIdFromSupabase(id);
    } catch (error) {
      logSupabaseFailure("getExperimentById", error);
      throw error;
    }
  }
  noSourceAvailable("getExperimentById");
}

export async function getExperimentBySlug(
  slug: string,
): Promise<Experiment | null> {
  if (hasNotionExperiments()) {
    try {
      // On a miss, fall through so experiments not yet in Notion still resolve.
      const bySlug = await getExperimentBySlugFromNotion(slug);
      if (bySlug) return bySlug;
      const all = await getExperimentsFromNotion();
      const byName = all.find((exp) => slugify(exp.name) === slug);
      if (byName) return byName;
    } catch (error) {
      logNotionFallback("getExperimentBySlug", error);
    }
  }
  if (hasSupabase()) {
    try {
      const byId = await getExperimentByIdFromSupabase(slug);
      if (byId) return byId;
      const all = await getExperimentsFromSupabase();
      return all.find((exp) => slugify(exp.name) === slug) ?? null;
    } catch (error) {
      logSupabaseFailure("getExperimentBySlug", error);
      throw error;
    }
  }
  noSourceAvailable("getExperimentBySlug");
}

export async function getPrototypeByExperimentId(
  experimentId: string,
): Promise<Prototype | null> {
  if (hasSupabase()) {
    try {
      return await getPrototypeByExperimentIdFromSupabase(experimentId);
    } catch (error) {
      logSupabaseFailure("getPrototypeByExperimentId", error);
      throw error;
    }
  }
  noSourceAvailable("getPrototypeByExperimentId");
}

export async function getDocumentationByExperimentId(
  experimentId: string,
): Promise<Documentation | null> {
  if (hasSupabase()) {
    try {
      return await getDocumentationByExperimentIdFromSupabase(experimentId);
    } catch (error) {
      logSupabaseFailure("getDocumentationByExperimentId", error);
      throw error;
    }
  }
  noSourceAvailable("getDocumentationByExperimentId");
}

export async function readMarketResearch(
  experimentDirectory: string,
): Promise<string | null> {
  try {
    const mrPath = path.join(
      process.cwd(),
      experimentDirectory,
      "docs",
      "market-research.md",
    );
    const content = await fs.readFile(mrPath, "utf8");
    return content;
  } catch {
    return null;
  }
}

/** Allowed doc names for readExperimentDoc (no path traversal). */
const ALLOWED_DOCS = ["landing-page-content"] as const;

export async function readLearnings(
  experimentDirectory: string,
): Promise<string | null> {
  try {
    const learningsPath = path.join(
      process.cwd(),
      experimentDirectory,
      "docs",
      "learnings.md",
    );
    const content = await fs.readFile(learningsPath, "utf8");
    return content;
  } catch {
    return null;
  }
}

export async function readExperimentDoc(
  experimentDirectory: string,
  docSlug: string,
): Promise<string | null> {
  if (!ALLOWED_DOCS.includes(docSlug as (typeof ALLOWED_DOCS)[number])) {
    return null;
  }
  try {
    const filename = `${docSlug}.md`;
    const docPath = path.join(
      process.cwd(),
      experimentDirectory,
      "docs",
      filename,
    );
    const content = await fs.readFile(docPath, "utf8");
    return content;
  } catch {
    return null;
  }
}

/**
 * Batch-read the experiment files the landing page consumes. The presence
 * booleans (PRD/prototype/landing) left with the presence columns
 * (scoring-impact-rubric fast-follow).
 */
export async function checkExperimentFiles(
  experimentDirectory: string,
): Promise<{
  mrContent: string | null;
  learningsContent: string | null;
}> {
  const [mrContent, learningsContent] = await Promise.all([
    readMarketResearch(experimentDirectory).catch(() => null),
    readLearnings(experimentDirectory).catch(() => null),
  ]);

  return { mrContent, learningsContent };
}

/**
 * Extract key information from PRD markdown
 */
export function parsePRD(prdContent: string) {
  const lines = prdContent.split("\n");
  const sections: Record<string, string[]> = {};
  let currentSection = "";

  for (const line of lines) {
    if (line.startsWith("## ")) {
      currentSection = line.replace("## ", "").trim();
      sections[currentSection] = [];
    } else if (currentSection && line.trim() && line.trim() !== "---") {
      sections[currentSection].push(line);
    }
  }

  return {
    overview: sections["Overview"]?.join("\n") || "",
    problemStatement: sections["Problem Statement"]?.join("\n") || "",
    goals: sections["Goals & Objectives"]?.join("\n") || "",
    targetUser: sections["Target User"]?.join("\n") || "",
    coreFeatures: sections["Core Features"]?.join("\n") || "",
    userStories: sections["User Stories"]?.join("\n") || "",
    technicalRequirements: sections["Technical Requirements"]?.join("\n") || "",
    successMetrics: sections["Success Metrics"]?.join("\n") || "",
    validationPlan:
      sections["Validation Plan (Landing Page)"]?.join("\n") || "",
    fullContent: prdContent,
  };
}

/**
 * Convert value string (e.g., "50K", "1.5M") to number
 */
function parseValue(value: string): number {
  const num = parseFloat(value);
  const suffix = value.toUpperCase().replace(/[\d.]/g, "");
  let multiplier = 1;
  if (suffix === "K") multiplier = 1000;
  else if (suffix === "M") multiplier = 1000000;
  else if (suffix === "B") multiplier = 1000000000;
  return num * multiplier;
}

/**
 * Format number back to string with appropriate suffix
 */
function formatValue(num: number): string {
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

/**
 * Calculate midpoint of a range and return formatted string
 */
function calculateMidpoint(low: string, high: string): string {
  try {
    const lowNum = parseValue(low);
    const highNum = parseValue(high);
    const midpoint = (lowNum + highNum) / 2;
    return formatValue(midpoint);
  } catch {
    // If parsing fails, return the low value
    return `$${low}`;
  }
}

/**
 * Extract key information from Market Research markdown
 */
export function parseMarketResearch(mrContent: string) {
  const lines = mrContent.split("\n");
  const sections: Record<string, string[]> = {};
  let currentSection = "";

  for (const line of lines) {
    if (line.startsWith("## ")) {
      currentSection = line.replace("## ", "").trim();
      sections[currentSection] = [];
    } else if (currentSection && line.trim() && line.trim() !== "---") {
      sections[currentSection].push(line);
    }
  }

  // Extract TAM/SAM/SOM from Executive Summary, Market Size Analysis, or Growth Trajectory sections.
  // Growth Trajectory is included so that the Year 2 fallback regex can match
  // lines like "- Year 2: 0.2% market share = $840K - $1.4M".
  const summarySection = sections["Executive Summary"]?.join("\n") || "";
  const marketSizeSection = sections["Market Size Analysis"]?.join("\n") || "";
  const growthSection = sections["Growth Trajectory"]?.join("\n") || "";
  const combinedSection =
    summarySection + "\n" + marketSizeSection + "\n" + growthSection;

  const tamMatch = combinedSection.match(
    /TAM[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i,
  );
  const samMatch = combinedSection.match(
    /SAM[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i,
  );
  // Exclude year-specific SOM lines (Year 1/2/3) so the generic match isn't accidentally
  // populated with a year-scoped figure and then mislabeled in the UI.
  const somMatch = combinedSection.match(
    /SOM(?!\s*\(Year)[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i,
  );

  // Extract methodology descriptions from exec summary bullet parentheticals
  // Matches: - **TAM**: $15M - $40M (competitor-anchored description here)
  const tamDescMatch = summarySection.match(
    /\*\*TAM\*\*[^:]*:\s*\$?[\d.]+[BMK]?(?:\s*-\s*\$?[\d.]+[BMK]?)?\s*\(([^)]+)\)/i,
  );
  const samDescMatch = summarySection.match(
    /\*\*SAM\*\*[^:]*:\s*\$?[\d.]+[BMK]?(?:\s*-\s*\$?[\d.]+[BMK]?)?\s*\(([^)]+)\)/i,
  );

  // Extract Year 1, Year 2, and Year 3 SOM.
  // Year 1 and Year 3 typically appear in the Executive Summary as "SOM (Year N): $X - $Y".
  // Year 2 rarely appears in the exec summary, so also check the Growth Trajectory table
  // which uses the format "- Year 2: 0.2% market share = $840K - $1.4M".
  const somYear1Match = combinedSection.match(
    /SOM\s*\(Year\s*1\)[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i,
  );
  const somYear2Match =
    combinedSection.match(
      /SOM\s*\(Year\s*2\)[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i,
    ) ??
    combinedSection.match(
      /[-*]\s*Year\s*2[^=\n]+=\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i,
    );
  const somYear3Match = combinedSection.match(
    /SOM\s*\(Year\s*3\)[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i,
  );

  // Calculate midpoint for ranges, or use single value
  const somYear1 = somYear1Match
    ? somYear1Match[2]
      ? calculateMidpoint(somYear1Match[1], somYear1Match[2])
      : `$${somYear1Match[1]}`
    : null;
  const somYear2 = somYear2Match
    ? somYear2Match[2]
      ? calculateMidpoint(somYear2Match[1], somYear2Match[2])
      : `$${somYear2Match[1]}`
    : null;
  const somYear3 = somYear3Match
    ? somYear3Match[2]
      ? calculateMidpoint(somYear3Match[1], somYear3Match[2])
      : `$${somYear3Match[1]}`
    : null;

  // Extract Market Opportunity Assessment (MOA)
  const moaMatch = combinedSection.match(
    /Market Opportunity Assessment[^:]*:\s*\*\*([^*]+)\*\*/i,
  );
  const moa = moaMatch ? moaMatch[1].trim() : null;

  // Extract Go/No-Go Recommendation
  const goNoGoMatch = combinedSection.match(
    /Go\/No-Go Recommendation[^:]*:\s*\*\*([^*]+)\*\*/i,
  );
  const goNoGo = goNoGoMatch ? goNoGoMatch[1].trim() : null;

  return {
    executiveSummary: sections["Executive Summary"]?.join("\n") || "",
    marketOpportunity: sections["Market Opportunity"]?.join("\n") || "",
    competitiveLandscape: sections["Competitive Landscape"]?.join("\n") || "",
    // Recommendation: new slim format uses "## Recommendation"; old format uses
    // "## Go/No-Go Recommendation" or "## Recommendations". Fall through all three.
    recommendation:
      sections["Recommendation"]?.join("\n") ||
      sections["Go/No-Go Recommendation"]?.join("\n") ||
      sections["Recommendations"]?.join("\n") ||
      "",
    tam: tamMatch
      ? tamMatch[2]
        ? `$${tamMatch[1]} - $${tamMatch[2]}`
        : `$${tamMatch[1]}`
      : null,
    sam: samMatch
      ? samMatch[2]
        ? `$${samMatch[1]} - $${samMatch[2]}`
        : `$${samMatch[1]}`
      : null,
    som: somMatch
      ? somMatch[2]
        ? `$${somMatch[1]} - $${somMatch[2]}`
        : `$${somMatch[1]}`
      : null,
    tamDesc: tamDescMatch ? tamDescMatch[1] : null,
    samDesc: samDescMatch ? samDescMatch[1] : null,
    somYear1: somYear1,
    somYear2: somYear2,
    somYear3: somYear3,
    moa: moa,
    goNoGo: goNoGo,
    fullContent: mrContent,
  };
}
