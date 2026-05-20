import { promises as fs } from "fs";
import path from "path";
import type { Experiment } from "@/types";
import {
  resolveOpenSpecChangeId,
  type BhdPhase,
  type OpenSpecLifecycle,
  type OpenSpecPhaseArtifact,
} from "@/lib/openspec-shared";

const PHASE_FILES: { phase: BhdPhase; filename: string }[] = [
  { phase: "explore", filename: "explore.md" },
  { phase: "propose", filename: "propose.md" },
  { phase: "apply", filename: "apply.md" },
  { phase: "archive", filename: "archive.md" },
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

export async function loadOpenSpecLifecycle(
  experiment: Experiment,
): Promise<OpenSpecLifecycle | null> {
  const changeId = resolveOpenSpecChangeId(experiment);
  if (!(await openSpecChangeDirExists(changeId))) {
    return null;
  }

  const artifacts: OpenSpecPhaseArtifact[] = [];

  for (const { phase, filename } of PHASE_FILES) {
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
    schema: experiment.openspecSchema ?? "bhd-experiment",
    currentPhase,
    artifacts,
  };
}
