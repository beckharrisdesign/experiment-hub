#!/usr/bin/env node
/*
 * Task-effort audit CLI. See README.md in this directory.
 *
 *   run       --task <file> [--scenario normal] [--allow-writes] [--headed] [--slow-mo ms] [--fixture <variant>]
 *   validate  --task <file> [--scenario normal]
 *   approve   --run <runId> [--supersede] [--by <name>] [--note <text>]
 *   compare   --run <runId>
 *   list      [--limit 20] [--task <taskId>]
 *   baselines --task <taskId> [--scenario normal]
 *
 *   Global: --data-dir <dir> (default artifacts/task-effort-audit, or $TEA_DATA_DIR)
 *
 * Exit codes: 0 executed + verified · 1 run failed/incomplete/not verified ·
 *             2 configuration, safety refusal, or refused command · 3 authentication
 */
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { EXIT, executeRun, preflight } from './lib/runner.mjs';
import { COUNTED_ACTIONS, definitionHash } from './lib/config.mjs';
import { describeTarget } from './lib/ledger.mjs';
import { compareToBaseline } from './lib/compare.mjs';
import { renderComparison } from './lib/report.mjs';
import { ApprovalError, approveBaseline, listRuns, loadBaselines, loadRun, resolveDataDir, runDirOf, writeJson } from './lib/store.mjs';
import { AuthError, ConfigError, SafetyError } from './lib/util.mjs';

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) flags[key] = true;
    else {
      flags[key] = next;
      i++;
    }
  }
  return { cmd, flags };
}

const need = (flags, key) => {
  if (!flags[key] || flags[key] === true) throw new ConfigError(`missing --${key}`);
  return flags[key];
};

async function cmdRun(flags, dataDir) {
  const { run, runDir, exitCode } = await executeRun({
    taskPath: path.resolve(need(flags, 'task')),
    scenario: flags.scenario ?? 'normal',
    allowWrites: Boolean(flags['allow-writes']),
    headed: Boolean(flags.headed),
    slowMo: Number(flags['slow-mo'] ?? 0),
    fixtureVariant: typeof flags.fixture === 'string' ? flags.fixture : null,
    dataDir,
  });
  const rel = path.relative(process.cwd(), runDir);
  const ex = run.execution;
  console.log('');
  console.log(`── ${run.task.name} (${run.task.scenario}) ──`);
  console.log(`  A. execution     ${ex.status === 'completed' ? 'completed' : `STOPPED at "${ex.failure?.stepId}" — ${ex.failure?.label}`}`);
  console.log(`  B. verification  ${run.verification.status}`);
  console.log(`  C. comparison    ${run.comparison.status}${run.comparison.baselineRunId ? ` vs ${run.comparison.baselineRunId}` : ''}`);
  if (run.comparison.status === 'compared') {
    for (const m of run.comparison.metrics) {
      const flag = m.delta !== 0 ? '  ⚑ CHANGED — review' : '';
      console.log(`     ${m.label.padEnd(40)} ${String(m.baseline).padStart(3)} → ${String(m.current).padStart(3)} (${m.delta > 0 ? '+' : ''}${m.delta})${flag}`);
    }
  } else {
    for (const r of run.comparison.reasons) console.log(`     - ${r}`);
    console.log(`     required actions this run: ${run.metrics.path.actions}${ex.status !== 'completed' ? ' (partial, before stop)' : ''}`);
  }
  if (run.cleanup.residualChanges) console.log(`  ⚠ RESIDUAL TEST CHANGES MAY REMAIN: ${run.cleanup.detail}`);
  if (run.reportError) console.log(`  ⚠ ${run.reportError}`);
  console.log(`  findings: ${run.findings.length}`);
  console.log(`  report:   ${rel}/report.md`);
  console.log(`  ledger:   ${rel}/actions.json`);
  console.log(`  trace:    npx playwright show-trace ${rel}/trace.zip`);
  console.log(`  exit:     ${exitCode}`);
  if (exitCode === EXIT.OK && run.comparison.status === 'no-baseline') {
    console.log(`\n  To approve as baseline: node scripts/task-effort-audit/cli.mjs approve --run ${run.runId}`);
  }
  return exitCode;
}

async function cmdValidate(flags) {
  const scenario = flags.scenario ?? 'normal';
  const { task, property } = await preflight({ taskPath: path.resolve(need(flags, 'task')), scenario, allowWrites: true });
  const sc = task.scenarios[scenario];
  console.log(`${task.name} — ${property.name} (${property.environment})`);
  console.log(`definition hash ${definitionHash(task, scenario).slice(0, 16)} · comparison context ${task.comparisonContext}`);
  console.log(`mutations: ${task.allowedMutations.length ? `${task.allowedMutations.map((m) => m.id).join(', ')} (needs --allow-writes)` : 'none (read-only)'}`);
  for (const s of sc.steps) {
    const counts = COUNTED_ACTIONS.includes(s.do) ? (s.conditional ? 'counts if shown' : 'counts 1') : 'not counted';
    const tags = [s.phase && s.phase !== 'path' ? s.phase : null, s.annotations?.repeatedEntry ? 'repeated-entry' : null, s.annotations?.contextSwitch ? 'context-switch' : null, s.mutates ? `mutates ${s.mutates}` : null].filter(Boolean);
    console.log(`  ${s.id.padEnd(28)} ${s.do.padEnd(12)} ${counts.padEnd(16)} ${describeTarget(s.target) || s.to || ''}${tags.length ? `  [${tags.join(', ')}]` : ''}`);
  }
  console.log('valid ✓ (write authorization is checked again at run time)');
  return EXIT.OK;
}

async function cmdApprove(flags, dataDir) {
  try {
    const { record, history, warnings } = await approveBaseline(dataDir, need(flags, 'run'), {
      supersede: Boolean(flags.supersede),
      by: typeof flags.by === 'string' ? flags.by : 'unspecified',
      note: typeof flags.note === 'string' ? flags.note : '',
    });
    console.log(`Approved ${record.runId} as baseline for ${record.taskId}/${record.scenario} (history: ${history.length} approval(s))`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    return EXIT.OK;
  } catch (e) {
    if (e instanceof ApprovalError) {
      console.error(e.message);
      return EXIT.CONFIG;
    }
    throw e;
  }
}

async function cmdCompare(flags, dataDir) {
  const runId = need(flags, 'run');
  const run = await loadRun(dataDir, runId);
  if (!run) throw new ConfigError(`no run ${runId} under ${dataDir}`);
  const b = await loadBaselines(dataDir, run.task.id, run.task.scenario);
  const cmp = compareToBaseline(b?.current ?? null, run);
  const dir = runDirOf(dataDir, runId);
  const name = `comparison-vs-${cmp.baselineRunId ?? 'none'}`;
  await writeJson(path.join(dir, `${name}.json`), { comparedAt: new Date().toISOString(), runId, ...cmp });
  const md = `# Comparison — ${run.task.name} (${run.task.scenario})\n\nRun \`${runId}\` · execution ${run.execution.status} · verification ${run.verification.status}\n\n${renderComparison(cmp)}\n\nEvidence: see \`report.md\`, \`actions.json\`, \`trace.zip\` in this run directory.\n`;
  await writeFile(path.join(dir, `${name}.md`), md);
  console.log(md);
  console.log(`written: ${path.relative(process.cwd(), dir)}/${name}.{json,md}`);
  return EXIT.OK;
}

async function cmdList(flags, dataDir) {
  const runs = await listRuns(dataDir, { limit: Number(flags.limit ?? 20), taskId: typeof flags.task === 'string' ? flags.task : undefined });
  if (!runs.length) console.log(`no runs under ${dataDir}`);
  for (const r of runs) {
    const status = r.executionStatus === 'completed' ? 'completed' : `${r.executionStatus}${r.failureCategory ? ` (${r.failureCategory})` : ''}`;
    console.log(`${r.runId}  ${status.padEnd(28)} verified=${String(r.verification ?? '-').padEnd(7)} actions=${String(r.requiredActions ?? '-').padEnd(3)} ${r.comparison ?? ''}${r.changedMetrics?.length ? ` ⚑ ${r.changedMetrics.join(',')}` : ''}`);
  }
  return EXIT.OK;
}

async function cmdBaselines(flags, dataDir) {
  const b = await loadBaselines(dataDir, need(flags, 'task'), flags.scenario ?? 'normal');
  if (!b) {
    console.log('no baseline approved');
    return EXIT.OK;
  }
  console.log(`current: ${b.current.runId} (approved ${b.current.approvedAt} by ${b.current.approvedBy})`);
  for (const h of b.history) console.log(`  ${h.approvedAt}  ${h.action} ${h.runId}${h.supersedes ? ` (superseded ${h.supersedes})` : ''}${h.note ? ` — ${h.note}` : ''}`);
  return EXIT.OK;
}

async function main() {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  const dataDir = resolveDataDir(typeof flags['data-dir'] === 'string' ? flags['data-dir'] : undefined);
  const commands = { run: cmdRun, validate: cmdValidate, approve: cmdApprove, compare: cmdCompare, list: cmdList, baselines: cmdBaselines };
  if (!commands[cmd]) {
    console.error('usage: cli.mjs <run|validate|approve|compare|list|baselines> [flags] — see scripts/task-effort-audit/README.md');
    return EXIT.CONFIG;
  }
  try {
    return await commands[cmd](flags, dataDir);
  } catch (e) {
    if (e instanceof ConfigError || e instanceof SafetyError) {
      console.error(e.message);
      return EXIT.CONFIG;
    }
    if (e instanceof AuthError) {
      console.error(`Authentication problem: ${e.message}`);
      return EXIT.AUTH;
    }
    console.error(e);
    return EXIT.RUN_FAILED;
  }
}

process.exitCode = await main();
