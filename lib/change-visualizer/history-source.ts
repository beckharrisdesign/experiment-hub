/**
 * Where a change's history comes from.
 *
 * The page reads git. The deployed runtime has no git, so it read nothing and
 * rendered a change that looked finished and said nothing — every date a dash,
 * every pull request count zero. This decides once per process which source can
 * answer, and everything date- or commit-derived goes through it.
 *
 * A **shallow** checkout counts as no git at all. Partial history is worse than
 * none here: it produces a plausible answer that is wrong, which is the failure
 * this whole page exists to catch other people making.
 */
import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

export type ManifestCommit = {
  sha: string;
  date: string;
  subject: string;
  pr: number | null;
};

export type HistoryManifest = {
  /** The commit the manifest was built from. */
  commit: string;
  /** That commit's committer date — not wall-clock, so regeneration is stable. */
  commitDate: string;
  /** Repo-relative path → its commits, oldest first. */
  paths: Record<string, ManifestCommit[]>;
  /** Pull request number → merge date. */
  merges: Record<string, string>;
};

export type HistorySource =
  | { kind: "repository" }
  | { kind: "manifest"; commit: string; commitDate: string }
  | { kind: "none" };

export const MANIFEST_PATH = path.join("data", "change-history.json");

async function gitIsUsable(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await run("git", ["rev-parse", "--is-shallow-repository"], {
      cwd,
      maxBuffer: 1024,
    });
    return stdout.trim() === "false";
  } catch {
    return false;
  }
}

export async function readManifest(cwd: string): Promise<HistoryManifest | null> {
  try {
    const raw = await fs.readFile(path.join(cwd, MANIFEST_PATH), "utf8");
    const parsed = JSON.parse(raw) as HistoryManifest;
    if (!parsed.paths || !parsed.commit) return null;
    return parsed;
  } catch {
    return null;
  }
}

type Resolved = { source: HistorySource; manifest: HistoryManifest | null };

const cache = new Map<string, Promise<Resolved>>();

async function resolve(cwd: string): Promise<Resolved> {
  if (await gitIsUsable(cwd)) return { source: { kind: "repository" }, manifest: null };

  const manifest = await readManifest(cwd);
  if (manifest) {
    return {
      source: {
        kind: "manifest",
        commit: manifest.commit,
        commitDate: manifest.commitDate,
      },
      manifest,
    };
  }
  return { source: { kind: "none" }, manifest: null };
}

export function resolveHistorySource(cwd = process.cwd()): Promise<Resolved> {
  const existing = cache.get(cwd);
  if (existing) return existing;
  const pending = resolve(cwd);
  cache.set(cwd, pending);
  return pending;
}

/** Test seam — forget which source answered. */
export function __resetHistorySource(): void {
  cache.clear();
}

/** One line for the page: an empty history must not read like an unreadable one. */
export function describeSource(source: HistorySource): string {
  switch (source.kind) {
    case "repository":
      return "History read from the repository.";
    case "manifest":
      return `History read from a manifest built at ${source.commitDate.slice(0, 10)} (${source.commit.slice(0, 7)}).`;
    case "none":
      return "No history source available — dates and pull requests cannot be shown.";
  }
}
