/**
 * Git history for a change's artifacts.
 *
 * Every date on the page comes from here rather than from a field someone has
 * to remember to update. Commands run through `execFile` — never a shell string
 * piped into `head`/`tail`, which truncates before the pipe sees it and yields
 * confidently wrong answers (see `reference_rtk_truncates_before_pipes`).
 */
import { execFile } from "child_process";
import { promisify } from "util";
import { resolveHistorySource } from "./history-source";

const run = promisify(execFile);

export type Commit = {
  sha: string;
  /** ISO author date. */
  date: string;
  subject: string;
  /** Squash-merge subjects end in `(#123)`; null when there is no number. */
  pr: number | null;
};

const PR_IN_SUBJECT = /\(#(\d+)\)\s*$/;

export function prFromSubject(subject: string): number | null {
  const match = PR_IN_SUBJECT.exec(subject.trim());
  return match ? Number(match[1]) : null;
}

/**
 * Commits touching a path, oldest first.
 *
 * `--follow` is deliberately omitted: a change folder that was renamed mid-flight
 * (the repo does this on scope pivots) should show the rename as history, not
 * silently stitch two identities together.
 */
export async function commitsForPath(
  repoRelPath: string,
  cwd = process.cwd(),
): Promise<Commit[]> {
  const { source, manifest } = await resolveHistorySource(cwd);

  if (source.kind === "manifest") return manifest?.paths[repoRelPath] ?? [];
  if (source.kind === "none") return [];

  return commitsFromGit(repoRelPath, cwd);
}

/** The raw read. Generation calls this directly — it always has a checkout. */
export async function commitsFromGit(
  repoRelPath: string,
  cwd = process.cwd(),
): Promise<Commit[]> {
  try {
    const { stdout } = await run(
      "git",
      ["log", "--reverse", "--format=%H%x09%aI%x09%s", "--", repoRelPath],
      { cwd, maxBuffer: 8 * 1024 * 1024 },
    );
    return stdout
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [sha, date, ...rest] = line.split("\t");
        const subject = rest.join("\t");
        return { sha, date, subject, pr: prFromSubject(subject) };
      });
  } catch {
    // A path with no history, or git unavailable. The page says "no dates"
    // rather than failing — a change can be real before it is committed.
    return [];
  }
}

/** Commits touching any path under a directory, oldest first, de-duplicated. */
export async function commitsForDir(
  repoRelDir: string,
  cwd = process.cwd(),
): Promise<Commit[]> {
  return commitsForPath(repoRelDir, cwd);
}

export function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/** Whole days between two ISO timestamps, floored, never negative. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}
