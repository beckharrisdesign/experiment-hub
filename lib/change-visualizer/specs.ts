/**
 * Capabilities and their requirements.
 *
 * Twelve of the forty-six changes in this repo carry more than one capability,
 * so a single spine is the exception rather than the rule. Requirements are the
 * durable per-capability unit — tasks are frequently not mapped to a capability
 * at all, and inventing that mapping would be worse than saying so.
 */
import { promises as fs } from "fs";
import path from "path";

export type Capability = {
  name: string;
  requirements: string[];
  scenarios: string[];
};

const REQUIREMENT = /^###\s+Requirement:\s*(.+)$/;
const SCENARIO = /^####\s+Scenario:\s*(.+)$/;

export function parseSpec(markdown: string): Pick<Capability, "requirements" | "scenarios"> {
  const requirements: string[] = [];
  const scenarios: string[] = [];
  for (const line of markdown.split("\n")) {
    const req = REQUIREMENT.exec(line);
    if (req) requirements.push(req[1].trim());
    const scenario = SCENARIO.exec(line);
    if (scenario) scenarios.push(scenario[1].trim());
  }
  return { requirements, scenarios };
}

export async function readCapabilities(changeDir: string): Promise<Capability[]> {
  const specsDir = path.join(changeDir, "specs");
  let entries: string[];
  try {
    entries = await fs.readdir(specsDir);
  } catch {
    return [];
  }

  const capabilities: Capability[] = [];
  for (const name of entries.sort()) {
    const specPath = path.join(specsDir, name, "spec.md");
    try {
      const content = await fs.readFile(specPath, "utf8");
      capabilities.push({ name, ...parseSpec(content) });
    } catch {
      // A capability folder without a spec.md is not a capability yet.
    }
  }
  return capabilities;
}
