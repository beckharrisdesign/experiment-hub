/**
 * Claim verification — where a change and the record disagree.
 *
 * The one band that is a comparison rather than a retrieval, and the reason the
 * page exists. Two disagreements motivated it, both real:
 *
 * - `tell-the-story` leaves task 3.11 unchecked while `formatDateSpan` and
 *   `endDate` are live in `lib/notion-history.ts` and #399 merged them.
 * - `pdf-metadata-viewer-cloud` has read "Remaining: deploy PR #389" since
 *   2026-08-18, and #389 merged that same day.
 *
 * A finding never resolves the disagreement. It states both readings and cites
 * its evidence — the page has no way to know which source is right, and
 * pretending otherwise would make it another thing to distrust.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import type { TaskItem } from "./tasks";
import { resolveHistorySource } from "./history-source";

const run = promisify(execFile);

export type Finding = {
  taskId: string;
  /** What the change says about itself. */
  claims: string;
  /** What the repository or GitHub shows. */
  record: string;
  evidence: string[];
};

/** Identifiers distinctive enough that finding one is meaningful. */
const IDENTIFIER = /\b[a-z][a-zA-Z0-9]{5,}[A-Z][a-zA-Z0-9]*\b/g;
const PR_REF = /#(\d+)\b/g;
const REMAINING = /\bremaining\b|\bstill\b|\bthen re-|\bwaiting on\b|\bdeploy\b/i;
/** The task itself already accounts for the code existing. */
const ACKNOWLEDGES_CODE =
  /\bseam\b|stays wired|already (exists|there|wired)|is (already )?defined|in place|scaffold/i;

/**
 * Where each symbol lives, for every symbol at once.
 *
 * One `git grep` for the whole page rather than one per symbol: a change with
 * thirty open tasks otherwise fires close to two hundred subprocesses, which
 * turns a page render into a stall.
 */
async function locateSymbols(
  symbols: string[],
  cwd: string,
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (symbols.length === 0) return found;

  const patterns = symbols.flatMap((s) => ["-e", s]);
  let stdout = "";
  try {
    ({ stdout } = await run(
      "git",
      // The visualizer's own source is excluded: prose in these files describes
      // what changes claim, and matching that prose is never evidence about a
      // change.
      [
        "grep", "-I", "-n", "--no-color", ...patterns,
        "--", "lib", "app", "components", "scripts", ":(exclude)lib/change-visualizer",
      ],
      { cwd, maxBuffer: 16 * 1024 * 1024 },
    ));
  } catch {
    // Non-zero exit means no matches at all, which is a legitimate answer.
    return found;
  }

  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    const file = line.slice(0, line.indexOf(":"));
    for (const symbol of symbols) {
      if (!found.has(symbol) && line.includes(symbol)) found.set(symbol, file);
    }
  }
  return found;
}

async function prMerged(pr: number, cwd: string): Promise<string | null> {
  const { source, manifest } = await resolveHistorySource(cwd);

  if (source.kind === "manifest") return manifest?.merges[String(pr)] ?? null;
  if (source.kind === "none") return null;

  try {
    const { stdout } = await run(
      "git",
      // The parens are literal — a squash subject ends `(#389)`. Unescaped they
      // are an ERE group and `#389` is never at the end of the line.
      ["log", "--format=%aI%x09%s", `--grep=\\(#${pr}\\)$`, "--extended-regexp", "-n", "1"],
      { cwd, maxBuffer: 1024 * 1024 },
    );
    const line = stdout.split("\n").find((l) => l.trim().length > 0);
    if (!line) return null;
    return line.split("\t")[0] ?? null;
  } catch {
    return null;
  }
}

export async function findDrift(
  items: TaskItem[],
  cwd = process.cwd(),
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const openItems = items.filter(
    (i) => i.id.length > 0 && (i.state === "open" || i.state === "partial"),
  );

  // A. The task is open, but a symbol it names is already in the codebase.
  //
  // Unless the task already says so. `tell-the-story` 3.6 defers the Figma
  // adapter and explains that "the seam stays wired" — naming `gatherEvidence`
  // as existing code is the task being precise, not the record disagreeing with
  // it. Flagging that would train the reader to ignore the band.
  const symbolsByItem = new Map<string, string[]>();
  for (const item of openItems) {
    if (ACKNOWLEDGES_CODE.test(item.text)) continue;
    const symbols = [...new Set(item.text.match(IDENTIFIER) ?? [])].slice(0, 6);
    if (symbols.length) symbolsByItem.set(item.id, symbols);
  }
  const located = await locateSymbols(
    [...new Set([...symbolsByItem.values()].flat())],
    cwd,
  );

  for (const item of openItems) {
    const evidence = (symbolsByItem.get(item.id) ?? [])
      .filter((symbol) => located.has(symbol))
      // A task that already names the file a symbol lives in is citing prior
      // art, not claiming work it has not done — `generative-sandbox-build`
      // 3.3.1 points at an existing module to follow, and that module existing
      // is the premise of the task rather than evidence against it.
      //
      // Naming the symbol itself in this comment would make the search find it
      // here, in the detector's own source. It did, once.
      .filter((symbol) => !item.text.includes(located.get(symbol) as string))
      .map((symbol) => `${symbol} is defined in ${located.get(symbol)}`);

    if (evidence.length > 0) {
      findings.push({
        taskId: item.id,
        claims: `${item.id} is ${item.state === "partial" ? "only partly done" : "not done"}`,
        record: "the behaviour it describes is already in the codebase",
        evidence,
      });
    }

    // B. The task says work remains on a pull request that has since merged.
    if (REMAINING.test(item.text)) {
      const prs = [...new Set([...item.text.matchAll(PR_REF)].map((m) => Number(m[1])))];
      for (const pr of prs) {
        const mergedAt = await prMerged(pr, cwd);
        if (mergedAt) {
          findings.push({
            taskId: item.id,
            claims: `${item.id} still expects work on #${pr}`,
            record: `#${pr} merged on ${mergedAt.slice(0, 10)}`,
            evidence: [`a commit for #${pr} is on this branch, dated ${mergedAt.slice(0, 10)}`],
          });
        }
      }
    }
  }

  return findings;
}
