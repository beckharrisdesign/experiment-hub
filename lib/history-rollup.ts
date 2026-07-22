/**
 * Pure rollup logic for the experiment-history draft generator.
 *
 * Turns real repository evidence — path-scoped commits and merged PRs — into
 * month-grained candidate milestones. This module holds the honesty-critical
 * rules and imports nothing (no Notion client, no filesystem, no shell), so
 * every rule below is unit-tested in isolation:
 *
 *   - A commit counts as this experiment's work only if a strict majority of
 *     its changed files sit inside the experiment's paths. Hub-wide changes
 *     that merely sweep the folder (CI, deploy, framework migrations) are
 *     excluded — counting them would show an experiment "active" in a month it
 *     was not. A 50/50 commit is ambiguous and is not counted.
 *   - A month with no experiment-scoped activity yields no candidate. Silence
 *     is accurate; inventing a milestone would misrepresent a stalled project.
 *   - Milestones are count-based assemblies of real evidence — countable
 *     counts, real PR numbers — never prose invented about intent.
 *
 * "Synthetic" describes the assembly. Every published sentence is still
 * Katy's to approve and rewrite in Notion.
 */

export interface CommitRecord {
  hash: string;
  /** Commit date, `YYYY-MM-DD`. */
  dateIso: string;
  subject: string;
  /** All file paths the commit changed (repo-relative). */
  files: string[];
}

export interface PrRecord {
  number: number;
  title: string;
  /** Merge date, `YYYY-MM-DD`. */
  mergedAtIso: string;
}

/**
 * A named Figma version or numbered iteration page. Seam for §3.6 — the live
 * Figma source adapter is not wired yet, so the generator passes []. The
 * rollup already folds these in so adding the adapter needs no rollup change.
 */
export interface FigmaVersionRecord {
  label: string;
  /** Version date, `YYYY-MM-DD`. */
  createdAtIso: string;
}

export interface RollupSources {
  commits: CommitRecord[];
  prs: PrRecord[];
  figmaVersions?: FigmaVersionRecord[];
}

export interface RollupCandidate {
  /** `YYYY-MM`. */
  month: string;
  /** Representative date for Notion, first of the month: `YYYY-MM-01`. */
  date: string;
  /** Draft milestone sentence — count-based, for Katy to rewrite. */
  milestone: string;
  /** Provenance string, e.g. "4 commits; PRs #300, #302". */
  source: string;
}

/** The paths that belong to an experiment, by slug. */
function experimentPathPrefixes(slug: string): string[] {
  return [`experiments/${slug}/`, `public/landing/${slug}/`];
}

/**
 * Conventional-commit types that are platform/infrastructure work, never an
 * experiment's own progress — even when they touch its files. A shared-auth
 * refactor or a CI change that sweeps a landing folder is not the founder
 * working on that experiment; counting it would show a stalled project as
 * active. Overridden only when the commit's scope explicitly names the
 * experiment (e.g. `refactor(best-day-ever): …`).
 */
const PLATFORM_TYPES = new Set(["ci", "build", "chore", "refactor", "perf"]);

/** Parses a conventional-commit `type(scope):` prefix; fields are "" if absent. */
export function parseConventionalPrefix(subject: string): {
  type: string;
  scope: string;
} {
  const match = /^(\w+)(?:\(([^)]*)\))?!?:/.exec(subject ?? "");
  return { type: match?.[1] ?? "", scope: match?.[2] ?? "" };
}

const MONTH_RE = /^(\d{4}-\d{2})/;

/** `YYYY-MM` for an ISO date, or null if unparseable. */
function monthOf(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const match = MONTH_RE.exec(iso);
  return match ? match[1] : null;
}

/**
 * Whether a commit is this experiment's own work rather than a hub-wide change
 * that incidentally touched its folder. True when a strict majority of the
 * commit's changed files are inside the experiment's paths. A CI/deploy/
 * framework commit that sweeps the folder alongside many unrelated files falls
 * below the majority and is excluded; so does the repo-init commit that
 * scaffolds every experiment at once. An exactly-half (50/50) commit is
 * ambiguous and is not counted — the conservative choice for honesty-critical
 * logic that must never overstate activity.
 */
export function isExperimentScoped(commit: CommitRecord, slug: string): boolean {
  const prefixes = experimentPathPrefixes(slug);
  const files = commit.files ?? [];
  const scoped = files.filter((f) => prefixes.some((p) => f.startsWith(p)));

  const { type, scope } = parseConventionalPrefix(commit.subject);
  // An explicit experiment scope is the author saying "this is that
  // experiment's work" — trust it over every heuristic below.
  if (scope === slug) return scoped.length > 0;

  if (scoped.length === 0) return false;
  // A platform commit type sweeping the folder is not experiment progress.
  if (PLATFORM_TYPES.has(type)) return false;
  return scoped.length / files.length > 0.5;
}

/** Only the commits that are this experiment's own work. */
export function filterExperimentCommits(
  commits: CommitRecord[],
  slug: string,
): CommitRecord[] {
  return commits.filter((c) => isExperimentScoped(c, slug));
}

/** Assembles a count-based draft milestone from a month's real evidence. */
export function formatMilestone(parts: {
  commitCount: number;
  prNumbers: number[];
  figmaCount: number;
}): string {
  const clauses: string[] = [];
  if (parts.commitCount > 0) {
    clauses.push(
      `${parts.commitCount} commit${parts.commitCount === 1 ? "" : "s"}`,
    );
  }
  if (parts.prNumbers.length > 0) {
    const list = parts.prNumbers.map((n) => `#${n}`).join(", ");
    clauses.push(
      `${parts.prNumbers.length} PR${parts.prNumbers.length === 1 ? "" : "s"} (${list})`,
    );
  }
  if (parts.figmaCount > 0) {
    clauses.push(
      `${parts.figmaCount} Figma iteration${parts.figmaCount === 1 ? "" : "s"}`,
    );
  }
  // Draft voice — a factual assembly Katy rewrites into a real sentence.
  return `Pushed ${joinClauses(clauses)}.`;
}

function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) return "no tracked activity";
  if (clauses.length === 1) return clauses[0];
  return `${clauses.slice(0, -1).join(", ")} and ${clauses[clauses.length - 1]}`;
}

/**
 * Month-grained candidates from real evidence, oldest first. Commits are
 * filtered to experiment-scoped first; a month with no scoped commit, PR, or
 * Figma version produces no candidate (the quiet-month rule).
 */
export function rollupByMonth(
  sources: RollupSources,
  slug: string,
): RollupCandidate[] {
  const scopedCommits = filterExperimentCommits(sources.commits, slug);
  const figmaVersions = sources.figmaVersions ?? [];

  const byMonth = new Map<
    string,
    { commits: number; prNumbers: number[]; figma: number }
  >();

  const bucket = (month: string) => {
    let b = byMonth.get(month);
    if (!b) {
      b = { commits: 0, prNumbers: [], figma: 0 };
      byMonth.set(month, b);
    }
    return b;
  };

  for (const c of scopedCommits) {
    const m = monthOf(c.dateIso);
    if (m) bucket(m).commits += 1;
  }
  for (const pr of sources.prs) {
    const m = monthOf(pr.mergedAtIso);
    if (m) bucket(m).prNumbers.push(pr.number);
  }
  for (const fv of figmaVersions) {
    const m = monthOf(fv.createdAtIso);
    if (m) bucket(m).figma += 1;
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => {
      const prNumbers = [...b.prNumbers].sort((x, y) => x - y);
      return {
        month,
        date: `${month}-01`,
        milestone: formatMilestone({
          commitCount: b.commits,
          prNumbers,
          figmaCount: b.figma,
        }),
        source: describeSource(b.commits, prNumbers, b.figma),
      };
    });
}

function describeSource(
  commits: number,
  prNumbers: number[],
  figma: number,
): string {
  const parts: string[] = [];
  if (commits > 0) parts.push(`${commits} commit${commits === 1 ? "" : "s"}`);
  if (prNumbers.length > 0) {
    parts.push(`PRs ${prNumbers.map((n) => `#${n}`).join(", ")}`);
  }
  if (figma > 0) parts.push(`${figma} Figma version${figma === 1 ? "" : "s"}`);
  return parts.join("; ");
}

/**
 * Drops candidates whose month is already covered by an existing History row.
 * This is the accumulation watermark: the monthly job appends only months it
 * has not appended before, so a re-run is a no-op and Katy's approved wording
 * never churns. Coverage is derived from existing rows, not separate state.
 */
export function filterUncoveredMonths(
  candidates: RollupCandidate[],
  coveredMonths: Iterable<string>,
): RollupCandidate[] {
  const covered = new Set(coveredMonths);
  return candidates.filter((c) => !covered.has(c.month));
}
