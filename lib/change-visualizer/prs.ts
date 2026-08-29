/**
 * Attributing pull requests to a change.
 *
 * The weakest link on the page, and known to be. `tell-the-story`'s eleven PRs
 * were originally found by matching the change name *and* the capability name
 * it introduced, which does not generalise. So this reports its own method and
 * says what it could not reach, rather than quietly under-counting.
 */
import { commitsForPath, type Commit } from "./git";

export type PrAttribution = {
  prs: { number: number; date: string; subject: string }[];
  /** How each was found, so the page can be honest about confidence. */
  method: "commits touching the change folder";
  /** Commits in the change folder that carry no PR number. */
  unattributedCommits: number;
};

export async function attributePrs(
  changeDirRepoRel: string,
  cwd = process.cwd(),
): Promise<PrAttribution> {
  const commits: Commit[] = await commitsForPath(changeDirRepoRel, cwd);

  const seen = new Map<number, { number: number; date: string; subject: string }>();
  let unattributed = 0;

  for (const commit of commits) {
    if (commit.pr === null) {
      unattributed += 1;
      continue;
    }
    if (!seen.has(commit.pr)) {
      seen.set(commit.pr, {
        number: commit.pr,
        date: commit.date,
        subject: commit.subject.replace(/\s*\(#\d+\)\s*$/, ""),
      });
    }
  }

  return {
    prs: [...seen.values()].sort((a, b) => a.date.localeCompare(b.date)),
    method: "commits touching the change folder",
    unattributedCommits: unattributed,
  };
}
