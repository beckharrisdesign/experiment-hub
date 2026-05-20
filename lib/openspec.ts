import { promises as fs } from "fs";
import path from "path";
import type { Experiment } from "@/types";

export type BhdPhase = "explore" | "propose" | "apply" | "archive";

const PHASE_FILES: { phase: BhdPhase; filename: string }[] = [
  { phase: "explore", filename: "explore.md" },
  { phase: "propose", filename: "propose.md" },
  { phase: "apply", filename: "apply.md" },
  { phase: "archive", filename: "archive.md" },
];

const PHASE_ORDER: BhdPhase[] = ["explore", "propose", "apply", "archive"];

export type OpenSpecPhaseArtifact = {
  phase: BhdPhase;
  content: string;
};

export type OpenSpecLifecycle = {
  changeId: string;
  schema: string;
  currentPhase: BhdPhase;
  artifacts: OpenSpecPhaseArtifact[];
};

export function resolveOpenSpecChangeId(experiment: Experiment): string {
  return experiment.openspecChangeId ?? experiment.id;
}

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
    try {
      const content = await fs.readFile(
        path.join(changeDir(changeId), filename),
        "utf8",
      );
      if (content.trim().length > 0) {
        artifacts.push({ phase, content });
      }
    } catch {
      // phase file optional until created
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

export function formatBhdPhaseLabel(phase: BhdPhase): string {
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}
