import { promises as fs } from "fs";
import path from "path";
import type { Experiment } from "@/types";
import {
  resolveOpenSpecChangeId,
  type BhdPhase,
  type OpenSpecLifecycle,
  type OpenSpecPhaseArtifact,
} from "@/lib/openspec-shared";

const BHD_PHASE_FILES: { phase: BhdPhase; filename: string }[] = [
  { phase: "explore", filename: "explore.md" },
  { phase: "propose", filename: "propose.md" },
  { phase: "apply", filename: "apply.md" },
  { phase: "archive", filename: "archive.md" },
];

// experiment-hub-lite maps its artifact files onto the 4 BHD phase slots:
//   explore  → specs (first spec file in specs/)
//   propose  → proposal.md
//   apply    → design.md
//   archive  → tasks.md
const LITE_PHASE_FILES: { phase: BhdPhase; filename: string }[] = [
  { phase: "propose", filename: "proposal.md" },
  { phase: "apply", filename: "design.md" },
  { phase: "archive", filename: "tasks.md" },
];

const PHASE_ORDER: BhdPhase[] = ["explore", "propose", "apply", "archive"];

function changeDir(changeId: string): string {
  return path.join(process.cwd(), "openspec", "changes", changeId);
}

export async function openSpecChangeDirExists(
  changeId: string,
): Promise<boolean> {
  try {
    await fs.access(changeDir(changeId));
    return true;
  } catch {
    return false;
  }
}

/** Read specs/*.md files and join them, returning null if none found. */
async function readLiteSpecs(changeId: string): Promise<string | null> {
  const specsDir = path.join(changeDir(changeId), "specs");
  try {
    const files = await fs.readdir(specsDir);
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
    const parts: string[] = [];
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(specsDir, file), "utf8");
      if (content.trim()) parts.push(content.trim());
    }
    return parts.length > 0 ? parts.join("\n\n---\n\n") : null;
  } catch {
    return null;
  }
}

export async function loadOpenSpecLifecycle(
  experiment: Experiment,
): Promise<OpenSpecLifecycle | null> {
  const changeId = resolveOpenSpecChangeId(experiment);
  if (!(await openSpecChangeDirExists(changeId))) {
    return null;
  }

  const schema = experiment.openspecSchema ?? "bhd-experiment";
  const artifacts: OpenSpecPhaseArtifact[] = [];

  if (schema === "experiment-hub-lite") {
    // Load specs/*.md into the "explore" slot
    const specsContent = await readLiteSpecs(changeId);
    if (specsContent) {
      artifacts.push({ phase: "explore", content: specsContent });
    }
    // Load the remaining lite files into their mapped phases
    for (const { phase, filename } of LITE_PHASE_FILES) {
      const filePath = path.join(changeDir(changeId), filename);
      try {
        await fs.access(filePath);
      } catch {
        continue;
      }
      const content = await fs.readFile(filePath, "utf8");
      if (content.trim().length > 0) {
        artifacts.push({ phase, content });
      }
    }
  } else {
    for (const { phase, filename } of BHD_PHASE_FILES) {
      const filePath = path.join(changeDir(changeId), filename);
      try {
        await fs.access(filePath);
      } catch {
        continue;
      }
      const content = await fs.readFile(filePath, "utf8");
      if (content.trim().length > 0) {
        artifacts.push({ phase, content });
      }
    }
  }

  if (artifacts.length === 0) {
    return null;
  }

  let currentPhase: BhdPhase = "explore";
  for (const phase of [...PHASE_ORDER].reverse()) {
    if (artifacts.some((a) => a.phase === phase)) {
      currentPhase = phase;
      break;
    }
  }

  return {
    changeId,
    schema,
    currentPhase,
    artifacts,
  };
}
