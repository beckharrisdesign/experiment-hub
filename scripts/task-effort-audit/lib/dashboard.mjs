/*
 * Runs dashboard: one page (index.html at the data-dir root) showing every
 * task's latest run against its approved baseline, plus the run history, with
 * links into each run's report.html.
 *
 * Built only from index.jsonl, runs/<id>/run.json, and baselines/. It's
 * regenerated after every run and by `cli.mjs dashboard`. Like the per-run
 * reports, it carries no score of any kind.
 */
import { existsSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { listRuns, loadRun, readJson } from './store.mjs';
import { STYLE, chip, esc } from './report-html.mjs';

/**
 * Where a task stands, from its latest run. One ordering for the summary and
 * the table, so the counts at the top always describe the rows below.
 */
export const STATES = {
  stopped: { rank: 0, label: 'Stopped', tone: 'bad', note: 'The reviewed path did not complete. Review before reading anything into it.' },
  'not-verified': { rank: 1, label: 'Not verified', tone: 'bad', note: 'The path ran, but the intended end state was not confirmed.' },
  changed: { rank: 2, label: 'Changed', tone: 'warn', note: 'A metric moved against the baseline. A review signal, not a verdict.' },
  'not-comparable': { rank: 3, label: 'Not comparable', tone: 'warn', note: 'The latest run cannot be compared with the baseline.' },
  'no-baseline': { rank: 4, label: 'No baseline', tone: 'muted', note: 'Approve a completed, verified run to start comparing.' },
  'no-local-runs': { rank: 5, label: 'No local runs', tone: 'muted', note: 'A baseline is committed, but no run of it exists in this folder yet.' },
  unchanged: { rank: 6, label: 'Unchanged', tone: 'ok', note: 'Completed, verified, and no metric moved against the baseline.' },
};

export function stateOf(run) {
  if (!run) return 'no-local-runs';
  if (run.execution?.status !== 'completed') return 'stopped';
  if (run.verification?.status !== 'pass') return 'not-verified';
  const c = run.comparison?.status;
  if (c === 'compared') return run.comparison.changed?.length ? 'changed' : 'unchanged';
  if (c === 'not-comparable') return 'not-comparable';
  return 'no-baseline';
}

function readBaselines(dataDir) {
  const dir = path.join(dataDir, 'baselines');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
}

function summarizeRun(run, dataDir) {
  const actions = run.comparison?.metrics?.find((m) => m.key === 'path.actions');
  return {
    runId: run.runId,
    taskId: run.task.id,
    taskName: run.task.name,
    scenario: run.task.scenario,
    property: run.property.name,
    viewport: run.executionContext?.viewport ?? null,
    startedAt: run.executionContext?.startedAt ?? null,
    fixtureVariant: run.executionContext?.fixtureVariant ?? null,
    state: stateOf(run),
    execution: run.execution.status,
    failure: run.execution.failure ? { stepId: run.execution.failure.stepId, label: run.execution.failure.label } : null,
    verification: run.verification.status,
    actions: run.metrics?.path?.actions ?? null,
    baselineActions: actions?.baseline ?? null,
    changed: run.comparison?.changed ?? [],
    comparison: run.comparison?.status ?? null,
    reasons: run.comparison?.reasons ?? [],
    findings: run.findings?.length ?? 0,
    principles: run.principles?.evidence?.length ?? 0,
    hasReport: existsSync(path.join(dataDir, 'runs', run.runId, 'report.html')),
  };
}

/** Gather everything the page shows. Runs without a run.json are listed as interrupted. */
export async function collectDashboard(dataDir, { now = new Date() } = {}) {
  const indexed = await listRuns(dataDir, { limit: Number.MAX_SAFE_INTEGER });
  const runs = [];
  for (const r of indexed) {
    const run = await loadRun(dataDir, r.runId);
    if (run) runs.push(summarizeRun(run, dataDir));
    else runs.push({ runId: r.runId, taskId: r.taskId, taskName: r.taskId, scenario: r.scenario, state: 'stopped', execution: r.executionStatus ?? 'interrupted', verification: 'unknown', actions: null, changed: [], hasReport: false, interrupted: true });
  }

  const tasks = new Map();
  const key = (t, s) => `${t}--${s}`;
  for (const r of runs) {
    const k = key(r.taskId, r.scenario);
    if (!tasks.has(k)) tasks.set(k, { taskId: r.taskId, scenario: r.scenario, latest: r, runCount: 0, baseline: null });
    tasks.get(k).runCount += 1; // runs are newest first, so the first one seen is the latest
  }
  for (const file of readBaselines(dataDir)) {
    const b = await readJson(file);
    const k = key(b.current.taskId, b.current.scenario);
    if (!tasks.has(k)) tasks.set(k, { taskId: b.current.taskId, scenario: b.current.scenario, latest: null, runCount: 0, baseline: null });
    tasks.get(k).baseline = {
      runId: b.current.runId,
      approvedAt: b.current.approvedAt,
      actions: b.current.metrics?.path?.actions ?? null,
      approvals: b.history?.length ?? 1,
    };
  }

  const rows = [...tasks.values()]
    .map((t) => ({ ...t, state: t.latest ? t.latest.state : 'no-local-runs' }))
    .sort((a, b) => STATES[a.state].rank - STATES[b.state].rank || String(a.latest?.taskName ?? a.taskId).localeCompare(String(b.latest?.taskName ?? b.taskId)) || a.scenario.localeCompare(b.scenario));

  return { generatedAt: now.toISOString(), rows, runs };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const fmtDelta = (d) => (d > 0 ? `+${d}` : `${d}`);
const fmtTime = (iso) => (iso ? iso.replace('T', ' ').replace(/:\d\d(\.\d+)?Z$/, '') : '');
const viewportLabel = (v) => (!v ? '' : v.width <= 480 ? `Phone ${v.width}×${v.height}` : `Desktop ${v.width}×${v.height}`);

function runLink(run, linkFor) {
  const href = run && linkFor(run);
  return href ? `<a href="${esc(href)}">${esc(run.runId)}</a>` : `<code>${esc(run?.runId ?? '')}</code>`;
}

function stateChip(state) {
  const s = STATES[state];
  return chip(s.label, s.tone);
}

function taskRow(t, linkFor) {
  const r = t.latest;
  const name = r?.taskName ?? t.taskId;
  const scenario = t.scenario !== 'normal' ? ` <span class="muted">(${esc(t.scenario)} scenario)</span>` : '';
  const vp = r?.viewport ? `<br><span class="muted">${esc(viewportLabel(r.viewport))} · ${esc(r.property)}</span>` : '';
  let detail = '';
  if (!r) detail = 'Committed baseline, no local runs.';
  else if (t.state === 'stopped') detail = r.failure ? `Stopped at <code>${esc(r.failure.stepId)}</code>: ${esc(r.failure.label)}.` : 'Interrupted. No run record.';
  else if (t.state === 'not-verified') detail = `Verification ${esc(r.verification)}.`;
  else if (t.state === 'changed') detail = `Changed: ${r.changed.map((c) => `<code>${esc(c)}</code>`).join(', ')}.`;
  else if (t.state === 'not-comparable') detail = esc(r.reasons[0] ?? '');
  const actions = r?.actions ?? '';
  const base = t.baseline?.actions ?? '';
  const delta = r && t.baseline && r.state !== 'stopped' && r.comparison === 'compared' ? fmtDelta(r.actions - t.baseline.actions) : '';
  return `<tr class="state-${esc(t.state)}">
  <td data-label="Task"><strong>${esc(name)}</strong>${scenario}${vp}</td>
  <td data-label="Latest result">${stateChip(t.state)}${detail ? `<br><span class="muted">${detail}</span>` : ''}</td>
  <td class="num" data-label="Actions">${esc(actions)}</td><td class="num" data-label="Baseline">${esc(base)}</td><td class="num" data-label="Change">${esc(delta)}</td>
  <td data-label="Report">${r ? `${r.hasReport && linkFor(r) ? `<a href="${esc(linkFor(r))}">Open report</a>` : 'No report'}<br><span class="muted nowrap">${esc(fmtTime(r.startedAt))}</span>` : ''}</td>
</tr>`;
}

function runsTable(runs, linkFor) {
  const rows = runs
    .map(
      (r) => `<tr>
  <td>${runLink(r, linkFor)}</td>
  <td>${esc(r.taskName)}${r.scenario !== 'normal' ? ` <span class="muted">(${esc(r.scenario)})</span>` : ''}${r.fixtureVariant ? ` <span class="muted">fixture ${esc(r.fixtureVariant)}</span>` : ''}</td>
  <td>${stateChip(r.state)}</td>
  <td class="num">${esc(r.actions ?? '')}</td>
  <td>${r.changed?.length ? r.changed.map((c) => `<code>${esc(c)}</code>`).join(' ') : ''}</td>
</tr>`,
    )
    .join('');
  return `<div class="scroll"><table>
  <thead><tr><th>Run</th><th>Task</th><th>Result</th><th class="num">Actions</th><th>Changed metrics</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>`;
}

const DASH_STYLE = `
.scroll { overflow-x: auto; } .scroll table { min-width: 640px; }
.summary { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 0 0 16px; padding: 0; list-style: none; }
.summary li { display: flex; gap: 8px; align-items: baseline; }
.summary strong { font-size: 20px; font-variant-numeric: tabular-nums; }
tr.state-stopped td:first-child, tr.state-not-verified td:first-child { box-shadow: inset 3px 0 var(--bad); }
tr.state-changed td:first-child, tr.state-not-comparable td:first-child { box-shadow: inset 3px 0 var(--warn); }
.chip-ok { color: var(--ok); } .nowrap { white-space: nowrap; }
/* Phone: each task becomes a card, so the counts stay on screen. */
@media (max-width: 640px) {
  .scroll table.tasks { min-width: 0; }
  table.tasks thead { display: none; }
  table.tasks, table.tasks tbody, table.tasks tr, table.tasks td { display: block; }
  table.tasks tr { border-bottom: 1px solid var(--border); padding: 8px 0; }
  table.tasks td { border: 0; padding: 4px 0; text-align: left; }
  table.tasks td.num { display: inline-block; width: 32%; }
  table.tasks td.num::before { content: attr(data-label); display: block; font-size: 12px; color: var(--fg2); }
  tr.state-stopped td:first-child, tr.state-not-verified td:first-child, tr.state-changed td:first-child, tr.state-not-comparable td:first-child { box-shadow: none; }
  tr.state-stopped, tr.state-not-verified { box-shadow: inset 3px 0 var(--bad); padding-left: 8px; }
  tr.state-changed, tr.state-not-comparable { box-shadow: inset 3px 0 var(--warn); padding-left: 8px; }
}
`;

/**
 * @param {any} data from collectDashboard
 * @param {{ linkFor?: (run: any) => string | null, standalone?: boolean, title?: string }} [opts]
 *   linkFor maps a run to its report href (null = no link).
 */
export function renderDashboard(data, { linkFor = (r) => (r.hasReport ? `runs/${r.runId}/report.html` : null), standalone = true, title = 'Task-effort audit runs' } = {}) {
  const counts = {};
  for (const t of data.rows) counts[t.state] = (counts[t.state] ?? 0) + 1;
  const summary = Object.keys(STATES)
    .filter((s) => counts[s])
    .map((s) => `<li><strong>${counts[s]}</strong> ${stateChip(s)}</li>`)
    .join('');
  const legend = Object.entries(STATES)
    .filter(([s]) => counts[s])
    .map(([, v]) => `<li>${chip(v.label, v.tone)} ${esc(v.note)}</li>`)
    .join('');

  const body = `<main>
<header>
  <p class="muted">Task-effort audit</p>
  <h1>Runs</h1>
  <p class="meta">${data.rows.length} task${data.rows.length === 1 ? '' : 's'} · ${data.runs.length} run${data.runs.length === 1 ? '' : 's'} · generated ${esc(fmtTime(data.generatedAt))}</p>
  <div class="callout callout-info"><p>Interface-imposed work along reviewed paths, compared with approved baselines. Not user research: it says nothing about emotion, human task time, or discoverability. A change is a review signal, not a verdict.</p></div>
</header>
<section aria-labelledby="h-tasks">
  <h2 id="h-tasks">Latest run per task</h2>
  <ul class="summary" aria-label="Tasks by result">${summary}</ul>
  <div class="scroll"><table class="tasks">
    <thead><tr><th>Task</th><th>Latest result</th><th class="num">Actions</th><th class="num">Baseline</th><th class="num">Change</th><th>Report (UTC)</th></tr></thead>
    <tbody>${data.rows.map((t) => taskRow(t, linkFor)).join('')}</tbody>
  </table></div>
  <ul class="muted legend">${legend}</ul>
</section>
<section aria-labelledby="h-runs">
  <h2 id="h-runs">All runs</h2>
  <p class="muted">Newest first. Every manual rerun gets its own id; nothing is retried or deleted automatically.</p>
  ${data.runs.length ? runsTable(data.runs, linkFor) : '<p>No runs yet.</p>'}
</section>
<footer>
  <p>Built from <code>index.jsonl</code>, each run's <code>run.json</code>, and <code>baselines/</code>. Regenerate with <code>pnpm audit:effort dashboard</code>.</p>
  <p>Linked reports embed screenshots, which can contain sensitive information. They are not sanitized.</p>
</footer>
</main>`;

  const head = `<title>${esc(title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex">
<style>${STYLE}${DASH_STYLE}</style>`;
  if (!standalone) return `${head}\n${body}\n`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${body}
</body>
</html>
`;
}

/** Write <dataDir>/index.html. Returns its path. */
export async function writeDashboard(dataDir) {
  const data = await collectDashboard(dataDir);
  const file = path.join(dataDir, 'index.html');
  await writeFile(file, renderDashboard(data));
  return file;
}
