/*
 * On-disk layout (default root: artifacts/task-effort-audit/, gitignored):
 *
 *   index.jsonl                         append-only run events (started/finished)
 *   runs/<runId>/run.json               run record
 *   runs/<runId>/actions.json           ordered action ledger
 *   runs/<runId>/report.md              human summary
 *   runs/<runId>/screenshots/*.png      checkpoint + failure screenshots
 *   runs/<runId>/trace.zip              Playwright trace
 *   baselines/<taskId>--<scenario>.json { current, history[] } — history is append-only
 *
 * Nothing here is ever deleted automatically.
 */
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_DATA_DIR = 'artifacts/task-effort-audit';

export function resolveDataDir(explicit) {
  return path.resolve(explicit ?? process.env.TEA_DATA_DIR ?? DEFAULT_DATA_DIR);
}

export const runDirOf = (dataDir, runId) => path.join(dataDir, 'runs', runId);

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tmp, file);
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function appendIndex(dataDir, event) {
  await mkdir(dataDir, { recursive: true });
  await appendFile(path.join(dataDir, 'index.jsonl'), `${JSON.stringify(event)}\n`);
}

export async function readIndex(dataDir) {
  const file = path.join(dataDir, 'index.jsonl');
  if (!existsSync(file)) return [];
  return (await readFile(file, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** Latest known state per run, newest first. A run with only "started" is shown as interrupted. */
export async function listRuns(dataDir, { limit = 20, taskId } = {}) {
  const byRun = new Map();
  for (const ev of await readIndex(dataDir)) {
    const prev = byRun.get(ev.runId) ?? {};
    byRun.set(ev.runId, { ...prev, ...ev });
  }
  return [...byRun.values()]
    .filter((r) => !taskId || r.taskId === taskId)
    .sort((a, b) => String(b.runId).localeCompare(String(a.runId)))
    .slice(0, limit)
    .map((r) => (r.event === 'started' ? { ...r, executionStatus: 'interrupted (no finish recorded)' } : r));
}

export async function loadRun(dataDir, runId) {
  const file = path.join(runDirOf(dataDir, runId), 'run.json');
  if (!existsSync(file)) return null;
  return readJson(file);
}

const baselineFile = (dataDir, taskId, scenario) => path.join(dataDir, 'baselines', `${taskId}--${scenario}.json`);

export async function loadBaselines(dataDir, taskId, scenario) {
  const file = baselineFile(dataDir, taskId, scenario);
  if (!existsSync(file)) return null;
  return readJson(file);
}

export class ApprovalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApprovalError';
  }
}

/** Refusal reasons for promoting this run (empty = may be approved). */
export function approvalProblems(run, existing, { supersede = false } = {}) {
  const p = [];
  if (run.execution.status !== 'completed') p.push(`run did not complete the reference path (status: ${run.execution.status})`);
  if (run.verification.status !== 'pass') p.push(`run's final state was not verified (verification: ${run.verification.status})`);
  if (existing?.current?.runId === run.runId) p.push('this run is already the current baseline');
  else if (existing?.current && !supersede) {
    p.push(
      `a baseline already exists (run ${existing.current.runId}, approved ${existing.current.approvedAt}). ` +
        'Pass --supersede to make this run current; the earlier baseline stays in history.',
    );
  }
  return p;
}

/** Explicit promotion. Never called by the runner. */
export async function approveBaseline(dataDir, runId, { supersede = false, by = 'unspecified', note = '', now = new Date() } = {}) {
  const run = await loadRun(dataDir, runId);
  if (!run) throw new ApprovalError(`no run.json for run ${runId} under ${dataDir}`);
  const existing = await loadBaselines(dataDir, run.task.id, run.task.scenario);
  const problems = approvalProblems(run, existing, { supersede });
  if (problems.length) throw new ApprovalError(`Refusing to approve ${runId}:\n  - ${problems.join('\n  - ')}`);

  const record = {
    taskId: run.task.id,
    scenario: run.task.scenario,
    runId: run.runId,
    approvedAt: now.toISOString(),
    approvedBy: by,
    note,
    definitionHash: run.task.definitionHash,
    comparisonContext: run.task.comparisonContext,
    propertyId: run.property.id,
    propertyContextHash: run.property.contextHash,
    metrics: run.metrics,
    findingKeys: run.findings.map((f) => f.key),
    verification: run.verification.status,
    tooling: run.executionContext.tooling,
    fixtureVariant: run.executionContext.fixtureVariant ?? null,
  };
  const history = [
    ...(existing?.history ?? []),
    { action: 'approved', runId, approvedAt: record.approvedAt, approvedBy: by, note, supersedes: existing?.current?.runId ?? null },
  ];
  await writeJson(baselineFile(dataDir, run.task.id, run.task.scenario), { current: record, history });
  return { record, history, warnings: run.cleanup?.residualChanges ? ['run left residual test changes — see run.json#cleanup'] : [] };
}
