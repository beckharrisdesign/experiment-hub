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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ARCHIVE_INDEX_TTL_MS = 5_000;
let archiveIndex: { at: number; entries: Promise<string[]> } | null = null;

/**
 * Listing of `openspec/changes/archive/`, memoized briefly.
 *
 * The home page resolves a lifecycle per experiment inside a single
 * `Promise.all`, and most experiments have no change folder at all — so an
 * un-memoized lookup fires one `readdir` per experiment, concurrently. Caching
 * the *promise* (not just its result) collapses that burst into one read: the
 * concurrent callers all await the same in-flight listing.
 *
 * The TTL keeps a dev session honest — archive something and the hub reflects
 * it within a few seconds. In production the archive is fixed per deployment.
 */
function archiveEntries(): Promise<string[]> {
  const now = Date.now();
  if (archiveIndex && now - archiveIndex.at < ARCHIVE_INDEX_TTL_MS) {
    return archiveIndex.entries;
  }
  const entries = fs
    .readdir(path.join(CHANGES_ROOT(), "archive"))
    .catch(() => [] as string[]);
  archiveIndex = { at: now, entries };
  return entries;
}

/** Test seam — drop the memoized archive listing. */
export function __resetArchiveIndex(): void {
  archiveIndex = null;
}

/**
 * Resolve a change directory, falling back to the archive.
 *
 * Archiving a change must not erase an experiment's lifecycle story from the
 * hub — the phases of a parked or finished experiment are the most interesting
 * thing about it. Archived folders are named `YYYY-MM-DD-<changeId>`, so match
 * on the suffix and prefer the most recent when a change was archived twice.
 */
export async function resolveChangeDir(changeId: string): Promise<string | null> {
  // Change ids are slugs, never paths. The id can arrive via the Notion /
  // Supabase experiment rows (openspecChangeId, experiment.id), so reject
  // anything that could escape openspec/changes/ before it touches path.join.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(changeId)) return null;

  const active = path.join(CHANGES_ROOT(), changeId);
  try {
    await fs.access(active);
    return active;
  } catch {
    // fall through to the archive
  }

  // Match the full `YYYY-MM-DD-<changeId>` shape, not a bare suffix: a change
  // called `maker` must not resolve to `2026-08-14-pomodoro-maker`. Sorting is
  // safe because the date prefix is fixed-width and ISO — the last entry is the
  // most recent archiving of this id.
  const archived = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${escapeRegExp(changeId)}$`);
  const match = (await archiveEntries())
    .filter((name) => archived.test(name))
    .sort()
    .pop();

  return match ? path.join(CHANGES_ROOT(), "archive", match) : null;
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
