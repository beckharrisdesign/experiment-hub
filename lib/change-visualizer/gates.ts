/**
 * The stage rail.
 *
 * Three things the first draft of this got wrong, all of them visible in the
 * repo's own history:
 *
 * 1. Gates are not monotonic. An artifact committed again after a later gate
 *    opened is a *revisit*, and reporting only its first date hides the most
 *    interesting thing that happened.
 * 2. Two gates can share one commit. `#304` committed `design.md` and the spec
 *    together; the record holds one moment where the schema expects two
 *    approvals, and the page must not imply a sequence it cannot see.
 * 3. A gate can predate the rule that would have governed it. `tell-the-story`'s
 *    design merged 43 minutes before the Figma gate did. That is not a miss.
 */
import { commitsForPath, type Commit } from "./git";

export type GateId = "proposal" | "specs" | "design" | "tasks" | "apply" | "archive";

export type GateState = "passed" | "current" | "pending";

export type Gate = {
  id: GateId;
  /** Plain-language label. `specs`, `apply` and `archive` are OpenSpec's words. */
  label: string;
  state: GateState;
  firstDate: string | null;
  lastDate: string | null;
  /** Touched again after a later gate had already opened. */
  revisited: boolean;
  /** Gate ids committed in the same commit as this one. */
  sharedCommitWith: GateId[];
  /** The artifact predates the rule that would have required it. */
  predatesRule: { rule: string; ruleDate: string } | null;
  commits: Commit[];
};

export const GATE_ORDER: GateId[] = [
  "proposal",
  "specs",
  "design",
  "tasks",
  "apply",
  "archive",
];

/**
 * Display mapping, decided at the design gate. The artifact ids underneath are
 * untouched — `openspec status` stays the source of truth. A reader who has
 * never used OpenSpec cannot be expected to know that "apply" means the code is
 * being written.
 */
export const GATE_LABELS: Record<GateId, string> = {
  proposal: "proposal",
  specs: "requirements",
  design: "design",
  tasks: "tasks",
  apply: "build",
  archive: "archived",
};

const ARTIFACT_PATH: Record<GateId, string | null> = {
  proposal: "proposal.md",
  specs: "specs",
  design: "design.md",
  tasks: "tasks.md",
  apply: null,
  archive: "archive.md",
};

/**
 * When a rule that gates an artifact started being enforced.
 *
 * Fifteen archived changes are older than the Figma gate. Scoring them as
 * misses would be wrong, so the rail reports "predates the rule" instead.
 */
export const RULE_STARTS: { gate: GateId; rule: string; date: string }[] = [
  {
    gate: "design",
    rule: "Figma as-is + proposed pair",
    // #305, merged 2026-07-20T19:10:11Z — 43 minutes after #304 landed
    // tell-the-story's design.
    date: "2026-07-20T19:10:11Z",
  },
];

export type GateInput = {
  changeDirRepoRel: string;
  /** Artifact ids the CLI reports as complete. */
  present: Set<GateId>;
};

export async function buildGates(
  input: GateInput,
  cwd = process.cwd(),
): Promise<Gate[]> {
  const commitsByGate = new Map<GateId, Commit[]>();

  for (const gate of GATE_ORDER) {
    const rel = ARTIFACT_PATH[gate];
    if (!rel) {
      commitsByGate.set(gate, []);
      continue;
    }
    commitsByGate.set(
      gate,
      await commitsForPath(`${input.changeDirRepoRel}/${rel}`, cwd),
    );
  }

  // `apply` has no artifact of its own — it is the stretch of work after tasks
  // opened, so its commits are everything in the change folder that is not one
  // of the planning artifacts landing for the first time.
  const firstDates = new Map<GateId, string>();
  for (const gate of GATE_ORDER) {
    const commits = commitsByGate.get(gate) ?? [];
    if (commits.length) firstDates.set(gate, commits[0].date);
  }

  const gates: Gate[] = GATE_ORDER.map((id) => {
    const commits = commitsByGate.get(id) ?? [];
    const firstDate = commits.length ? commits[0].date : null;
    const lastDate = commits.length ? commits[commits.length - 1].date : null;

    // Revisited: touched again after some *later* gate had already opened.
    const laterFirsts = GATE_ORDER.slice(GATE_ORDER.indexOf(id) + 1)
      .map((g) => firstDates.get(g))
      .filter((d): d is string => Boolean(d));
    const earliestLater = laterFirsts.sort()[0];
    const revisited =
      Boolean(earliestLater) &&
      commits.some((c) => c.date > (earliestLater as string));

    // Shared commit: another gate's artifact landed in the same commit.
    const firstSha = commits.length ? commits[0].sha : null;
    const sharedCommitWith = firstSha
      ? GATE_ORDER.filter(
          (g) =>
            g !== id &&
            (commitsByGate.get(g) ?? []).some((c) => c.sha === firstSha),
        )
      : [];

    const rule = RULE_STARTS.find((r) => r.gate === id);
    const predatesRule =
      rule && firstDate && firstDate < rule.date
        ? { rule: rule.rule, ruleDate: rule.date }
        : null;

    return {
      id,
      label: GATE_LABELS[id],
      state: "pending" as GateState,
      firstDate,
      lastDate,
      revisited,
      sharedCommitWith,
      predatesRule,
      commits,
    };
  });

  // State: everything the CLI reports complete is passed; the first gate after
  // the last passed one is current. An archived change has no current gate.
  const archived = input.present.has("archive");
  let currentAssigned = archived;
  for (const gate of gates) {
    if (input.present.has(gate.id)) {
      gate.state = "passed";
      continue;
    }
    if (!currentAssigned) {
      gate.state = "current";
      currentAssigned = true;
    }
  }
  if (archived) {
    for (const gate of gates) if (gate.state === "current") gate.state = "passed";
  }

  return gates;
}

export function currentGate(gates: Gate[]): Gate | null {
  return gates.find((g) => g.state === "current") ?? null;
}
