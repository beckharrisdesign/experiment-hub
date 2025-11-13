import { promises as fs } from "fs";
import path from "path";
import type { Experiment, Prototype, Documentation } from "@/types";
import { slugify } from "@/lib/utils";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJsonFile<T>(filename: string): Promise<T[]> {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    // If file doesn't exist, return empty array
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function getExperiments(): Promise<Experiment[]> {
  return readJsonFile<Experiment>("experiments.json");
}

export async function getPrototypes(): Promise<Prototype[]> {
  return readJsonFile<Prototype>("prototypes.json");
}

export async function getDocumentation(): Promise<Documentation[]> {
  return readJsonFile<Documentation>("documentation.json");
}

export async function getExperimentById(id: string): Promise<Experiment | null> {
  const experiments = await getExperiments();
  return experiments.find((exp) => exp.id === id) || null;
}

export async function getExperimentBySlug(slug: string): Promise<Experiment | null> {
  const experiments = await getExperiments();
  return (
    experiments.find((exp) => slugify(exp.name) === slug) || null
  );
}

export async function getPrototypeByExperimentId(
  experimentId: string
): Promise<Prototype | null> {
  const prototypes = await getPrototypes();
  return prototypes.find((proto) => proto.experimentId === experimentId) || null;
}

export async function getDocumentationByExperimentId(
  experimentId: string
): Promise<Documentation | null> {
  const docs = await getDocumentation();
  return docs.find((doc) => doc.experimentId === experimentId) || null;
}

export async function hasPRD(experimentDirectory: string): Promise<boolean> {
  try {
    // experimentDirectory already includes "experiments/" prefix
    const prdPath = path.join(process.cwd(), experimentDirectory, "docs", "PRD.md");
    await fs.access(prdPath);
    return true;
  } catch {
    return false;
  }
}

export async function hasMarketResearch(experimentDirectory: string): Promise<boolean> {
  try {
    const mrPath = path.join(process.cwd(), experimentDirectory, "docs", "market-research.md");
    await fs.access(mrPath);
    return true;
  } catch {
    return false;
  }
}

export async function hasPrototype(experimentDirectory: string): Promise<boolean> {
  try {
    // experimentDirectory already includes "experiments/" prefix
    const prototypePath = path.join(process.cwd(), experimentDirectory, "prototype");
    const stats = await fs.stat(prototypePath);
    
    if (!stats.isDirectory()) {
      return false;
    }
    
    // Check if there are actual files (not just .gitkeep or empty directory)
    const files = await fs.readdir(prototypePath);
    const actualFiles = files.filter(
      (file) => file !== ".gitkeep" && !file.startsWith(".")
    );
    
    // Return true only if there are actual files in the prototype directory
    return actualFiles.length > 0;
  } catch {
    return false;
  }
}

export async function readPRD(experimentDirectory: string): Promise<string | null> {
  try {
    const prdPath = path.join(process.cwd(), experimentDirectory, "docs", "PRD.md");
    const content = await fs.readFile(prdPath, "utf8");
    return content;
  } catch {
    return null;
  }
}

export async function readMarketResearch(experimentDirectory: string): Promise<string | null> {
  try {
    const mrPath = path.join(process.cwd(), experimentDirectory, "docs", "market-research.md");
    const content = await fs.readFile(mrPath, "utf8");
    return content;
  } catch {
    return null;
  }
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
    } else if (currentSection && line.trim()) {
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
    fullContent: prdContent,
  };
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
    } else if (currentSection && line.trim()) {
      sections[currentSection].push(line);
    }
  }
  
  // Extract TAM/SAM/SOM from Executive Summary or Market Size Analysis section
  const summarySection = sections["Executive Summary"]?.join("\n") || "";
  const marketSizeSection = sections["Market Size Analysis"]?.join("\n") || "";
  const combinedSection = summarySection + "\n" + marketSizeSection;
  
  const tamMatch = combinedSection.match(/TAM[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i);
  const samMatch = combinedSection.match(/SAM[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i);
  const somMatch = combinedSection.match(/SOM[^:]*:\s*\$?([\d.]+[BMK]?)\s*-?\s*\$?([\d.]+[BMK]?)?/i);
  
  return {
    executiveSummary: sections["Executive Summary"]?.join("\n") || "",
    tam: tamMatch ? (tamMatch[2] ? `${tamMatch[1]} - ${tamMatch[2]}` : tamMatch[1]) : null,
    sam: samMatch ? (samMatch[2] ? `${samMatch[1]} - ${samMatch[2]}` : samMatch[1]) : null,
    som: somMatch ? (somMatch[2] ? `${somMatch[1]} - ${somMatch[2]}` : somMatch[1]) : null,
    goNoGo: sections["Go/No-Go Recommendation"]?.join("\n") || sections["Recommendations"]?.join("\n") || "",
    fullContent: mrContent,
  };
}
