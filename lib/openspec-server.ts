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

const CHANGES_ROOT = () => path.join(process.cwd(), "openspec", "changes");

/**
 * Resolve a change directory, falling back to the archive.
 *
 * Archiving a change must not erase an experiment's lifecycle story from the
 * hub — the phases of a parked or finished experiment are the most interesting
 * thing about it. Archived folders are named `YYYY-MM-DD-<changeId>`, so match
 * on the suffix and prefer the most recent when a change was archived twice.
 */
async function resolveChangeDir(changeId: string): Promise<string | null> {
  const active = path.join(CHANGES_ROOT(), changeId);
  try {
    await fs.access(active);
    return active;
  } catch {
    // fall through to the archive
  }

  const archiveRoot = path.join(CHANGES_ROOT(), "archive");
  let entries: string[];
  try {
    entries = await fs.readdir(archiveRoot);
  } catch {
    return null;
  }

  const match = entries
    .filter((name) => name.endsWith(`-${changeId}`))
    .sort()
    .pop();

  return match ? path.join(archiveRoot, match) : null;
}

export async function openSpecChangeDirExists(
  changeId: string,
): Promise<boolean> {
  return (await resolveChangeDir(changeId)) !== null;
}

export async function loadOpenSpecLifecycle(
  experiment: Experiment,
): Promise<OpenSpecLifecycle | null> {
  const changeId = resolveOpenSpecChangeId(experiment);
  const dir = await resolveChangeDir(changeId);
  if (!dir) {
    return null;
  }

  const artifacts: OpenSpecPhaseArtifact[] = [];

  for (const { phase, filename } of PHASE_FILES) {
    const filePath = path.join(dir, filename);
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
