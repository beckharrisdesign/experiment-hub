/**
 * Assembling one change into a page.
 *
 * Everything here is read on demand from the repository and git. Nothing is
 * written back, and no field exists that a person has to remember to update —
 * a field like that is the thing that goes stale and produces the disagreements
 * this page is built to surface.
 */
import { promises as fs } from "fs";
import path from "path";
import { resolveChangeDir } from "@/lib/openspec-server";
import { commitsForPath, daysBetween, dayOf, type Commit } from "./git";
import { buildGates, GATE_ORDER, GATE_LABELS, type Gate, type GateId } from "./gates";
import { readCapabilities, type Capability } from "./specs";
import { parseFigmaRef, type FigmaRef } from "./design-ref";
import { attributePrs, type PrAttribution } from "./prs";
import { findDrift, type Finding } from "./drift";
import {
  parseTasks,
  evidenceKindFor,
  progress,
  type EvidenceKind,
  type ParsedTasks,
  type CheckState,
} from "./tasks";

export type Outcome = {
  id: string;
  state: CheckState;
  text: string;
  evidence: EvidenceKind;
};

export type TimelineEvent =
  | {
      kind: "work";
      date: string;
      stage: GateId;
      stageLabel: string;
      subjects: string[];
      prs: number[];
      /** Gates whose artifact first landed on this date. */
      gatesLanded: GateId[];
      revisitOf: GateId[];
    }
  | { kind: "gap"; days: number; from: string; to: string };

export type ChangePage = {
  id: string;
  archived: boolean;
  /** First paragraph under `## Human anchor`, or `## Why` when there is none. */
  intent: string | null;
  intentSource: "human anchor" | "why" | null;
  gates: Gate[];
  capabilities: Capability[];
  outcomes: Outcome[];
  /** False when §1 is workstreams rather than spec scenarios. */
  outcomesAreScenarios: boolean;
  progress: ReturnType<typeof progress> | null;
  prs: PrAttribution;
  figma: FigmaRef | null;
  assets: string[];
  events: TimelineEvent[];
  findings: Finding[];
};

async function readIfPresent(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

/** The anchor as written. Never paraphrased — it has to stay checkable. */
export function extractIntent(
  proposal: string,
): { text: string; source: "human anchor" | "why" } | null {
  const anchor = /##\s+Human anchor\s*\n([\s\S]*?)(?=\n##\s|\n?$)/.exec(proposal);
  if (anchor) {
    const quoted = anchor[1]
      .split("\n")
      .filter((l) => l.trim().startsWith(">"))
      .map((l) => l.replace(/^\s*>\s?/, "").trim())
      .filter(Boolean)
      .join(" ");
    if (quoted) return { text: quoted, source: "human anchor" };
  }
  const why = /##\s+Why\s*\n([\s\S]*?)(?=\n##\s|\n?$)/.exec(proposal);
  if (why) {
    const firstPara = why[1].trim().split(/\n\s*\n/)[0]?.replace(/\s+/g, " ").trim();
    if (firstPara) return { text: firstPara, source: "why" };
  }
  return null;
}

function stageForDate(gates: Gate[], date: string): GateId {
  let stage: GateId = "proposal";
  for (const gate of gates) {
    if (gate.firstDate && gate.firstDate <= date) stage = gate.id;
  }
  // Anything after tasks opened is build, until an archive record exists.
  const tasks = gates.find((g) => g.id === "tasks");
  const archive = gates.find((g) => g.id === "archive");
  if (tasks?.firstDate && date > tasks.firstDate) stage = "apply";
  if (archive?.firstDate && date >= archive.firstDate) stage = "archive";
  return stage;
}

function buildTimeline(commits: Commit[], gates: Gate[]): TimelineEvent[] {
  const byDay = new Map<string, Commit[]>();
  for (const commit of commits) {
    const day = dayOf(commit.date);
    byDay.set(day, [...(byDay.get(day) ?? []), commit]);
  }

  const days = [...byDay.keys()].sort();
  const events: TimelineEvent[] = [];

  days.forEach((day, index) => {
    if (index > 0) {
      const gap = daysBetween(days[index - 1], day);
      // A gap only earns a row when it is longer than a weekend's worth of
      // quiet. Silence is the finding, but two days is not silence.
      if (gap > 3) {
        events.push({ kind: "gap", days: gap, from: days[index - 1], to: day });
      }
    }

    const dayCommits = byDay.get(day) ?? [];
    const shas = new Set(dayCommits.map((c) => c.sha));
    const gatesLanded = GATE_ORDER.filter((id) => {
      const gate = gates.find((g) => g.id === id);
      return gate?.firstDate ? dayOf(gate.firstDate) === day : false;
    });
    const revisitOf = GATE_ORDER.filter((id) => {
      const gate = gates.find((g) => g.id === id);
      if (!gate || !gate.revisited) return false;
      return gate.commits.some((c) => shas.has(c.sha) && c.sha !== gate.commits[0]?.sha);
    });

    events.push({
      kind: "work",
      date: day,
      stage: stageForDate(gates, dayCommits[0].date),
      stageLabel: GATE_LABELS[stageForDate(gates, dayCommits[0].date)],
      subjects: dayCommits.map((c) => c.subject.replace(/\s*\(#\d+\)\s*$/, "")),
      prs: [...new Set(dayCommits.map((c) => c.pr).filter((n): n is number => n !== null))],
      gatesLanded,
      revisitOf,
    });
  });

  return events;
}

export async function loadChangePage(
  changeId: string,
  cwd = process.cwd(),
): Promise<ChangePage | null> {
  const dir = await resolveChangeDir(changeId);
  if (!dir) return null;

  const repoRel = path.relative(cwd, dir);
  const archived = repoRel.includes(`${path.sep}archive${path.sep}`);

  const [proposal, design, tasksMd] = await Promise.all([
    readIfPresent(path.join(dir, "proposal.md")),
    readIfPresent(path.join(dir, "design.md")),
    readIfPresent(path.join(dir, "tasks.md")),
  ]);

  const present = new Set<GateId>();
  if (proposal) present.add("proposal");
  if (design) present.add("design");
  if (tasksMd) present.add("tasks");
  const capabilities = await readCapabilities(dir);
  if (capabilities.length) present.add("specs");
  if (await readIfPresent(path.join(dir, "archive.md"))) present.add("archive");

  const gates = await buildGates({ changeDirRepoRel: repoRel, present }, cwd);
  const parsed: ParsedTasks | null = tasksMd ? parseTasks(tasksMd) : null;

  const outcomes: Outcome[] = parsed
    ? parsed.outcomes.map((o) => ({
        id: o.id,
        state: o.state,
        text: o.text.replace(/\s*\(→[^)]*\)\s*$/, "").trim(),
        evidence: evidenceKindFor(o.id, parsed.items),
      }))
    : [];

  const commits = await commitsForPath(repoRel, cwd);

  let assets: string[] = [];
  try {
    assets = (await fs.readdir(path.join(dir, "assets"))).filter((f) =>
      /\.(png|jpe?g|svg|webp)$/i.test(f),
    );
  } catch {
    // No assets directory is the common case, not an error.
  }

  const intent = proposal ? extractIntent(proposal) : null;

  return {
    id: changeId,
    archived,
    intent: intent?.text ?? null,
    intentSource: intent?.source ?? null,
    gates,
    capabilities,
    outcomes,
    outcomesAreScenarios: parsed?.outcomesAreScenarios ?? false,
    progress: parsed ? progress(parsed) : null,
    prs: await attributePrs(repoRel, cwd),
    figma: design ? parseFigmaRef(design) : null,
    assets,
    events: buildTimeline(commits, gates),
    findings: parsed ? await findDrift(parsed.items, cwd) : [],
  };
}

export type ChangeSummary = {
  id: string;
  archived: boolean;
  /** The stage it is sitting in, derived from which artifacts exist. */
  stage: GateId;
  stageLabel: string;
  capabilities: number;
};

/**
 * Enough about every change to list them, and **nothing that needs git**.
 *
 * The index has to work where the change pages currently cannot: the deployed
 * runtime has no `.git`, so anything date- or commit-derived comes back empty
 * there. Artifact presence is a filesystem read, so a stage is still honest.
 */
export async function listChanges(cwd = process.cwd()): Promise<ChangeSummary[]> {
  const summaries: ChangeSummary[] = [];

  for (const id of await listChangeIds(cwd)) {
    const dir = await resolveChangeDir(id);
    if (!dir) continue;

    const present = new Set<GateId>();
    if (await readIfPresent(path.join(dir, "proposal.md"))) present.add("proposal");
    if (await readIfPresent(path.join(dir, "design.md"))) present.add("design");
    if (await readIfPresent(path.join(dir, "tasks.md"))) present.add("tasks");
    if (await readIfPresent(path.join(dir, "archive.md"))) present.add("archive");
    const capabilities = await readCapabilities(dir);
    if (capabilities.length) present.add("specs");

    // The stage is the one after the last artifact that exists — a change with
    // tasks and no archive record is being built.
    let stage: GateId = "proposal";
    if (present.has("archive")) stage = "archive";
    else if (present.has("tasks")) stage = "apply";
    else {
      for (const gate of GATE_ORDER) {
        if (present.has(gate)) continue;
        stage = gate;
        break;
      }
    }

    summaries.push({
      id,
      archived: path.relative(cwd, dir).includes(`${path.sep}archive${path.sep}`),
      stage,
      stageLabel: GATE_LABELS[stage],
      capabilities: capabilities.length,
    });
  }

  return summaries;
}

/** Every change id the hub can render, active and archived. */
export async function listChangeIds(cwd = process.cwd()): Promise<string[]> {
  const root = path.join(cwd, "openspec", "changes");
  const ids: string[] = [];
  try {
    for (const entry of await fs.readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "archive") ids.push(entry.name);
    }
  } catch {
    return [];
  }
  try {
    for (const entry of await fs.readdir(path.join(root, "archive"), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const stripped = entry.name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      if (!ids.includes(stripped)) ids.push(stripped);
    }
  } catch {
    // No archive yet.
  }
  return ids.sort();
}
