/**
 * Draft-history generator (repo-local CLI — NOT a hub route).
 *
 * Assembles month-grained candidate History milestones for an experiment from
 * real repository evidence: path-scoped git commits (full file lists, so the
 * rollup can tell the experiment's own work from hub-wide changes that merely
 * sweep the folder) and merged PRs matched by title/paths.
 *
 * This file imports NO Notion client and performs NO writes — that is the
 * structural guarantee behind "the generator never publishes" (spec Req 4).
 * Publishing is a separate, insert-only script (scripts/append-history.ts),
 * and every entry is approved by Katy in Notion before it can render.
 *
 * Figma versions (spec's fourth source) are a wired seam: `gatherEvidence`
 * returns `figmaVersions: []` until the §3.6 adapter lands, and the rollup
 * already folds them in, so no rollup change is needed then.
 *
 * Usage:
 *   tsx scripts/draft-history.ts <slug> [--json]
 *     (default) prints a human-readable review block
 *     --json    prints machine-readable candidates for the append writer
 */
import { execFileSync } from "node:child_process";
import {
  rollupByMonth,
  type CommitRecord,
  type PrRecord,
  type RollupSources,
  type RollupCandidate,
} from "@/lib/history-rollup";

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

/** Repo-relative path prefixes that belong to an experiment. */
function experimentPaths(slug: string): string[] {
  return [`experiments/${slug}/`, `public/landing/${slug}/`];
}

/** Commit hashes (any) that touched the experiment's paths, oldest first. */
function commitHashesForExperiment(slug: string): string[] {
  const out = git([
    "log",
    "--format=%H",
    "--reverse",
    "--",
    ...experimentPaths(slug),
  ]);
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** Full changed-file list for a commit (includes the root commit via --root). */
function filesForCommit(hash: string): string[] {
  const out = git([
    "diff-tree",
    "--no-commit-id",
    "--name-only",
    "-r",
    "--root",
    hash,
  ]);
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

function metaForCommit(hash: string): { dateIso: string; subject: string } {
  const out = git(["show", "-s", "--date=short", "--format=%ad%n%s", hash]);
  const [dateIso = "", subject = ""] = out.split("\n");
  return { dateIso: dateIso.trim(), subject: subject.trim() };
}

/** Commit records (with full file lists) for the experiment. */
export function gatherCommits(slug: string): CommitRecord[] {
  return commitHashesForExperiment(slug).map((hash) => {
    const { dateIso, subject } = metaForCommit(hash);
    return { hash, dateIso, subject, files: filesForCommit(hash) };
  });
}

/**
 * Merged PRs matched to the experiment by a TITLE search on the slug.
 *
 * `in:title` is deliberate. A bare full-text search matches any PR that merely
 * mentions the slug in a body or comment — cross-references, shared-file
 * touches — and pulls in dozens of unrelated PRs, which would grossly overstate
 * the experiment's activity. Title-scoping keeps it to PRs actually about this
 * experiment (`feat(slug): …`, `docs(slug): …`). Katy still reviews every draft.
 */
export function gatherPrs(slug: string): PrRecord[] {
  let raw: string;
  try {
    raw = execFileSync(
      "gh",
      [
        "pr",
        "list",
        "--state",
        "merged",
        "--search",
        `${slug} in:title`,
        "--json",
        "number,title,mergedAt",
        "--limit",
        "200",
      ],
      { encoding: "utf8" },
    );
  } catch {
    // gh unavailable/unauthenticated (e.g. a sandbox without a token): degrade
    // to commits-only rather than fail the whole draft.
    process.stderr.write(
      "[draft-history] gh unavailable — proceeding with commits only.\n",
    );
    return [];
  }
  const rows = JSON.parse(raw) as Array<{
    number: number;
    title: string;
    mergedAt: string;
  }>;
  return rows.map((r) => ({
    number: r.number,
    title: r.title,
    mergedAtIso: (r.mergedAt ?? "").slice(0, 10),
  }));
}

/** All wired sources for an experiment. Figma is [] until §3.6. */
export function gatherEvidence(slug: string): RollupSources {
  return {
    commits: gatherCommits(slug),
    prs: gatherPrs(slug),
    figmaVersions: [],
  };
}

/** Candidate milestones for an experiment, oldest first. */
export function generateCandidates(slug: string): RollupCandidate[] {
  return rollupByMonth(gatherEvidence(slug), slug);
}

function renderReview(slug: string, candidates: RollupCandidate[]): string {
  if (candidates.length === 0) {
    return `No tracked activity found for "${slug}". Nothing to draft.\n`;
  }
  const lines = [
    `Draft History candidates for "${slug}" — ${candidates.length} month(s).`,
    `Every line is a DRAFT for you to rewrite and approve in Notion. Nothing`,
    `is written to Notion by this script.`,
    ``,
  ];
  for (const c of candidates) {
    lines.push(`${c.date}  ${c.milestone}`);
    lines.push(`            (${c.source})`);
  }
  return lines.join("\n") + "\n";
}

function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith("--"));
  if (!slug) {
    process.stderr.write("Usage: tsx scripts/draft-history.ts <slug> [--json]\n");
    process.exit(1);
    return;
  }
  const candidates = generateCandidates(slug);
  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify({ slug, candidates }, null, 2) + "\n");
  } else {
    process.stdout.write(renderReview(slug, candidates));
  }
}

// Run only when invoked directly, not when imported by the append writer.
if (process.argv[1] && process.argv[1].endsWith("draft-history.ts")) {
  main();
}
