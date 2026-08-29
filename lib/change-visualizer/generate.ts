/**
 * Building the change-history manifest.
 *
 * A library function with a thin CLI over it (`scripts/generate-change-history.ts`),
 * so tests can build a manifest in-process instead of spawning a toolchain —
 * spawning it inside a full test run is slow and flaky, and a flaky test about
 * determinism is worse than no test at all.
 *
 * Built *through* the reader the pages use (`commitsFromGit`), never a second
 * implementation: one parser, two sources.
 */
import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { commitsFromGit, prFromSubject } from "./git";
import { listChangeIds } from "./index";
import { resolveChangeDir } from "@/lib/openspec-server";
import {
  MANIFEST_PATH,
  type HistoryManifest,
  type ManifestCommit,
} from "./history-source";

const run = promisify(execFile);

/** Artifacts the readers ask about, relative to a change directory. */
const ARTIFACTS = ["proposal.md", "specs", "design.md", "tasks.md", "archive.md"];

export class ShallowCheckoutError extends Error {}

async function assertUsableCheckout(cwd: string): Promise<void> {
  let shallow: string;
  try {
    ({ stdout: shallow } = await run("git", ["rev-parse", "--is-shallow-repository"], { cwd }));
  } catch {
    throw new ShallowCheckoutError(
      "no git repository here. This must run against a full checkout.",
    );
  }
  if (shallow.trim() !== "false") {
    throw new ShallowCheckoutError(
      "this is a shallow clone, so most history is missing. Partial history yields " +
        "a plausible answer that is wrong. Fetch it with `git fetch --unshallow`, " +
        "or set fetch-depth: 0 on the checkout.",
    );
  }
}

/** Every merged pull request in the repository, by number. */
async function collectMerges(cwd: string): Promise<Record<string, string>> {
  const { stdout } = await run("git", ["log", "--format=%aI%x09%s"], {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
  });
  const merges: Record<string, string> = {};
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    const [date, ...rest] = line.split("\t");
    const pr = prFromSubject(rest.join("\t"));
    // `git log` is newest-first, so the last assignment is the earliest commit
    // carrying that number.
    if (pr !== null) merges[String(pr)] = date;
  }
  return merges;
}

export async function buildChangeHistory(cwd = process.cwd()): Promise<HistoryManifest> {
  await assertUsableCheckout(cwd);

  const { stdout: head } = await run("git", ["log", "-1", "--format=%H%x09%cI"], { cwd });
  const [commit, commitDate] = head.trim().split("\t");

  const paths: Record<string, ManifestCommit[]> = {};
  for (const id of await listChangeIds(cwd)) {
    const dir = await resolveChangeDir(id, cwd);
    if (!dir) continue;
    const repoRel = path.relative(cwd, dir);

    for (const target of [repoRel, ...ARTIFACTS.map((a) => `${repoRel}/${a}`)]) {
      const commits = await commitsFromGit(target, cwd);
      // An artifact that does not exist has no commits; an empty array would
      // bloat the manifest and say nothing.
      if (commits.length > 0) paths[target] = commits;
    }
  }

  return {
    commit,
    commitDate,
    // Sorted so a diff means the history changed, not that a map reordered.
    paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
    merges: Object.fromEntries(
      Object.entries(await collectMerges(cwd)).sort(([a], [b]) => Number(a) - Number(b)),
    ),
  };
}

export function serializeChangeHistory(manifest: HistoryManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export async function writeChangeHistory(
  manifest: HistoryManifest,
  cwd = process.cwd(),
): Promise<string> {
  const out = path.join(cwd, MANIFEST_PATH);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, serializeChangeHistory(manifest), "utf8");
  return out;
}
