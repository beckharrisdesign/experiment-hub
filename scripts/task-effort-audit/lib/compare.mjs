/*
 * Baseline compatibility and comparison.
 *
 * A comparison is only made between a verified, completed baseline and a
 * verified, completed current run of the same task definition. Anything else
 * says "not comparable" and why. A stopped run shows its partial execution
 * separately — never as completed-path deltas.
 */
import { METRIC_LABELS, flattenMetrics } from './ledger.mjs';

export const LIMITATIONS = [
  'Counts interface-imposed work along one reviewed path — not human task time, emotion, discoverability, or real-user completion.',
  'Repeated-entry and context-switch counts come from reviewed annotations; the runner does not discover them.',
  'A change in count is a review signal, not a verdict: added steps can serve legitimate purposes.',
  'Product changes can break the reviewed path instead of changing a count; that stops the run for review.',
];

/** Reasons the current run can't be compared to the baseline (empty = comparable). */
export function compatibilityProblems(baseline, run) {
  const r = [];
  if (baseline.taskId !== run.task.id || baseline.scenario !== run.task.scenario) {
    r.push(`baseline is for ${baseline.taskId}/${baseline.scenario}, run is ${run.task.id}/${run.task.scenario}`);
  }
  if (baseline.definitionHash !== run.task.definitionHash) {
    r.push(
      `task definition changed since the baseline (${baseline.definitionHash.slice(0, 10)} → ${run.task.definitionHash.slice(0, 10)}). ` +
        'Differences could come from the script rather than the product — approve a new baseline from a run of the current definition.',
    );
  }
  if (baseline.comparisonContext !== run.task.comparisonContext) {
    r.push(`comparison context changed (${baseline.comparisonContext} → ${run.task.comparisonContext})`);
  }
  if (baseline.propertyContextHash !== run.property.contextHash) {
    r.push('property context (id / baseUrl / environment) differs from the baseline');
  }
  if (run.execution.status !== 'completed') {
    const f = run.execution.failure;
    r.push(`current run did not complete the reference path (stopped at "${f?.stepId}", ${f?.label ?? 'unknown'}) — partial execution is shown separately`);
  } else if (run.verification.status !== 'pass') {
    r.push(`current run's final state was not verified (verification: ${run.verification.status})`);
  }
  return r;
}

function toolingNotes(baseline, run) {
  const a = baseline.tooling ?? {};
  const b = run.executionContext.tooling ?? {};
  return ['playwright', 'browser', 'tool']
    .filter((k) => a[k] && b[k] && a[k] !== b[k])
    .map((k) => `${k} version differs (${a[k]} → ${b[k]}); counts should not depend on it, but review if they move`);
}

/** Compare a run against the current baseline record (or null). */
export function compareToBaseline(baseline, run) {
  const partial =
    run.execution.status !== 'completed'
      ? {
          stoppedAtStep: run.execution.failure?.stepId ?? null,
          category: run.execution.failure?.label ?? null,
          stepsExecuted: run.execution.stepsExecuted,
          stepsPlanned: run.execution.stepsPlanned,
          actionsBeforeStop: run.metrics.path.actions + run.metrics.recovery.actions,
          note: 'Actions counted before the stop. Not a completed-path count; not compared to the baseline.',
        }
      : null;

  if (!baseline) {
    return { status: 'no-baseline', baselineRunId: null, reasons: ['no approved baseline for this task/scenario'], notes: [], metrics: [], partial, limitations: LIMITATIONS };
  }
  const reasons = compatibilityProblems(baseline, run);
  if (reasons.length) {
    return { status: 'not-comparable', baselineRunId: baseline.runId, reasons, notes: [], metrics: [], partial, limitations: LIMITATIONS };
  }

  const b = flattenMetrics(baseline.metrics);
  const c = flattenMetrics(run.metrics);
  const metrics = Object.keys(METRIC_LABELS)
    .filter((k) => run.task.scenarioKind === 'recovery' || !k.startsWith('recovery.'))
    .map((k) => ({ key: k, label: METRIC_LABELS[k], baseline: b[k], current: c[k], delta: c[k] - b[k] }));

  const before = new Set(baseline.findingKeys);
  const now = new Set(run.findings.map((f) => f.key));
  return {
    status: 'compared',
    baselineRunId: baseline.runId,
    reasons: [],
    notes: toolingNotes(baseline, run),
    metrics,
    changed: metrics.filter((m) => m.delta !== 0).map((m) => m.key),
    findings: {
      new: [...now].filter((k) => !before.has(k)),
      resolved: [...before].filter((k) => !now.has(k)),
      unchanged: [...now].filter((k) => before.has(k)),
    },
    partial: null,
    limitations: LIMITATIONS,
  };
}
