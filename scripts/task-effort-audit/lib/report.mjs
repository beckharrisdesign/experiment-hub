/*
 * Markdown report: short enough to read in under a minute. Everything in it is
 * derived from run.json; if this throws, run.json, actions.json, screenshots
 * and the trace are already on disk.
 */

const fmtDelta = (d) => (d > 0 ? `+${d}` : d < 0 ? `${d}` : '0');

export function renderComparison(cmp) {
  const lines = [];
  if (cmp.status === 'no-baseline') {
    lines.push('**Baseline:** none approved yet — approve this run with `approve` if it is the reference.');
  } else if (cmp.status === 'not-comparable') {
    lines.push(`**Baseline:** \`${cmp.baselineRunId}\` — **not comparable**`);
    for (const r of cmp.reasons) lines.push(`- ${r}`);
  } else {
    lines.push(`**Baseline:** \`${cmp.baselineRunId}\` — compared`, '');
    lines.push('| Metric | Baseline | Current | Δ |', '|---|---:|---:|---:|');
    for (const m of cmp.metrics) {
      const mark = m.delta !== 0 ? ' **⚑**' : '';
      lines.push(`| ${m.label} | ${m.baseline} | ${m.current} | ${fmtDelta(m.delta)}${mark} |`);
    }
    if (cmp.changed.length) {
      lines.push('', '> ⚑ Changed metrics are **review signals**, not verdicts — an added step can serve a legitimate purpose.');
    }
    const f = cmp.findings;
    lines.push('', `Findings vs baseline — new: ${f.new.length ? f.new.map((k) => `\`${k}\``).join(', ') : 'none'}; resolved: ${f.resolved.length ? f.resolved.map((k) => `\`${k}\``).join(', ') : 'none'}; unchanged: ${f.unchanged.length}`);
    for (const n of cmp.notes) lines.push(`- Note: ${n}`);
  }
  if (cmp.partial) {
    const p = cmp.partial;
    lines.push(
      '',
      '### Partial execution (not a completed path)',
      `Stopped at step \`${p.stoppedAtStep}\` (${p.category}) after ${p.stepsExecuted}/${p.stepsPlanned} steps; ${p.actionsBeforeStop} action(s) before the stop. ${p.note}`,
    );
  }
  return lines.join('\n');
}

export function renderReport(run) {
  const ex = run.execution;
  const execLine =
    ex.status === 'completed'
      ? 'completed the reference path'
      : `**stopped** at step \`${ex.failure?.stepId}\` — ${ex.failure?.label}`;
  const ctx = run.executionContext;
  const L = [];
  L.push(`# Task-effort audit — ${run.task.name}`);
  L.push('');
  L.push(`\`${run.runId}\` · ${run.property.name} (${run.property.environment}) · scenario **${run.task.scenario}** · ${ctx.startedAt}${ctx.fixtureVariant ? ` · fixture \`${ctx.fixtureVariant}\`` : ''}`);
  L.push('');
  L.push('> Regression audit of interface-imposed work along a reviewed path. Not user research; says nothing about emotion, human task time, or discoverability.');
  L.push('');
  if (run.cleanup?.residualChanges) {
    L.push(`> **⚠ RESIDUAL TEST CHANGES MAY REMAIN:** ${run.cleanup.detail}`, '');
  }
  L.push('| | |', '|---|---|');
  L.push(`| **A. Execution** | ${execLine} (${ex.stepsExecuted}/${ex.stepsPlanned} steps) |`);
  L.push(`| **B. Verified completion** | **${run.verification.status}**${run.verification.note ? ` — ${run.verification.note}` : ''} |`);
  L.push(`| **C. Comparison** | ${run.comparison ? run.comparison.status : 'not run'} |`);
  L.push(`| Required actions | ${run.metrics.path.actions}${ex.status !== 'completed' ? ' (partial — before stop)' : ''} |`);
  L.push(`| Repeated-entry fields / context switches | ${run.metrics.path.repeatedEntryFields} / ${run.metrics.path.contextSwitches} (from annotations) |`);
  if (run.task.scenarioKind === 'recovery') L.push(`| Recovery actions | ${run.metrics.recovery.actions} (separate from path) |`);
  L.push(`| Safety | ${run.safety.mode}; blocked requests: ${run.safety.blockedRequests.length} |`);
  L.push('');
  if (ex.failure) {
    L.push(`**Why it stopped (observed):** ${ex.failure.observed}`);
    L.push(`**Root cause:** ${ex.failure.rootCause}. ${ex.failure.reviewNote}`);
    L.push('');
  }
  if (run.comparison) {
    L.push('## Against baseline', '', renderComparison(run.comparison), '');
  }
  L.push('## Findings', '');
  if (!run.findings.length) L.push('None.');
  for (const f of run.findings) {
    const ev = f.evidence.map((e) => `\`${e.ref}\``).join(', ');
    L.push(`- **${f.id}** \`${f.key}\` *(${f.kind})* — ${f.statement}`);
    L.push(`  Evidence: ${ev}${f.reviewRequired ? ` · **Review:** ${f.reviewNote}` : ''}`);
    if (f.suggestion) L.push(`  _${f.suggestion.label}:_ ${f.suggestion.text}`);
  }
  L.push('');
  L.push('## Limitations', '');
  for (const l of run.comparison?.limitations ?? []) L.push(`- ${l}`);
  L.push(`- Browser duration ${ex.diagnostics.browserDurationMs} ms is diagnostic only — not human task time.`);
  L.push('');
  L.push('## Artifacts', '');
  L.push(`Ledger \`actions.json\` · record \`run.json\` · trace \`trace.zip\` (\`npx playwright show-trace trace.zip\`) · ${run.artifacts.screenshots.length} screenshot(s) in \`screenshots/\``);
  L.push('');
  L.push('_Screenshots and traces can contain sensitive information. They are not sanitized._');
  return `${L.join('\n')}\n`;
}
