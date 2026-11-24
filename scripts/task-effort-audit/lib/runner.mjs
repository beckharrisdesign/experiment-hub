/*
 * Deterministic execution of one reviewed task scenario.
 *
 * Never calls an LLM. Never repairs a selector, retries, or looks for another
 * route: if the reviewed path can't continue, it stops, captures evidence, and
 * classifies what is known.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

import { COUNTED_ACTIONS, definitionHash, loadTask, propertyContextHash, resolveTemplate } from './config.mjs';
import { createLedger, computeMetrics, describeTarget } from './ledger.mjs';
import { StopError, classifyFailure } from './classify.mjs';
import { buildFindings } from './findings.mjs';
import { compareToBaseline } from './compare.mjs';
import { createRequestGuard, declaresWrites, definitionSafetyProblems, runAuthorizationProblems } from './safety.mjs';
import { appendIndex, loadBaselines, runDirOf, writeJson } from './store.mjs';
import { renderReport } from './report.mjs';
import { AuthError, ConfigError, SafetyError, TOOL_VERSION, makeRunId } from './util.mjs';

export const EXIT = { OK: 0, RUN_FAILED: 1, CONFIG: 2, AUTH: 3 };

const require = createRequire(import.meta.url);
const SETTLE_MS = 150; // lets a request fired by an action reach the guard before the next step

function locate(scope, t) {
  const base = t.within ? locate(scope, t.within) : scope;
  if (t.role) return base.getByRole(t.role, { name: t.name, exact: t.exact ?? true });
  if (t.label) return base.getByLabel(t.label, { exact: t.exact ?? true });
  if (t.text) return base.getByText(t.text, { exact: t.exact ?? true });
  if (t.testId) return base.getByTestId(t.testId);
  if (t.placeholder) return base.getByPlaceholder(t.placeholder, { exact: t.exact ?? true });
  return base.locator(t.css);
}

async function pollUntil(read, want, timeout) {
  const end = Date.now() + timeout;
  let last;
  for (;;) {
    last = await read().catch(() => undefined);
    if (last === want) return last;
    if (Date.now() > end) {
      const e = new Error(`expected ${JSON.stringify(want)}, observed ${JSON.stringify(last ?? null)}`);
      e.name = 'AssertionError';
      throw e;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

function subsetMismatch(actual, expected) {
  for (const [k, v] of Object.entries(expected)) {
    if (JSON.stringify(actual?.[k]) !== JSON.stringify(v)) return `${k}: expected ${JSON.stringify(v)}, observed ${JSON.stringify(actual?.[k] ?? null)}`;
  }
  return null;
}

function toolingVersions(browserVersion) {
  let gitCommit = null;
  try {
    gitCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    /* not a git checkout */
  }
  return {
    tool: TOOL_VERSION,
    node: process.version,
    playwright: require('@playwright/test/package.json').version,
    browser: browserVersion ? `chromium ${browserVersion}` : null,
    os: `${os.platform()} ${os.release()}`,
    gitCommit,
  };
}

function resolveAuth(property, authRef) {
  const profile = property.authProfiles[authRef];
  if (profile.type === 'none') return { profile, storageState: undefined };
  const file = process.env[profile.pathEnv];
  if (!file) throw new AuthError(`auth profile "${authRef}" needs env var ${profile.pathEnv} pointing at a Playwright storageState file (keep it under artifacts/task-effort-audit/auth/, gitignored)`);
  if (!existsSync(file)) throw new AuthError(`auth profile "${authRef}": storageState file from ${profile.pathEnv} does not exist`);
  return { profile, storageState: file };
}

/**
 * Validate everything that can be checked before a browser starts.
 * Throws ConfigError / SafetyError / AuthError.
 */
export async function preflight({ taskPath, scenario = 'normal', allowWrites = false, fixtureVariant = null }) {
  const loaded = await loadTask(taskPath);
  const { task, property } = loaded;
  if (!task.scenarios[scenario]) {
    throw new ConfigError(`scenario "${scenario}" not in task (has: ${Object.keys(task.scenarios).join(', ')})`);
  }
  const safety = [
    ...definitionSafetyProblems(task, property, loaded.rawTask, loaded.rawProperty),
    ...runAuthorizationProblems(task, property, { allowWrites }),
  ];
  if (safety.length) throw new SafetyError(safety);
  if (fixtureVariant && (!property.fixture || property.environment !== 'local')) {
    throw new ConfigError(`--fixture needs a local property with a "fixture" entry; "${property.id}" has none`);
  }
  const auth = resolveAuth(property, task.authRef);
  return { ...loaded, auth };
}

/**
 * Run one scenario. Resolves to { run, runDir, exitCode }. Config/safety/auth
 * problems throw before any run directory is created.
 * @param {Record<string, any>} opts
 * @returns {Promise<{ run: any, runDir: string, exitCode: number }>}
 */
export async function executeRun(opts) {
  const { scenario = 'normal', allowWrites = false, headed = false, slowMo = 0, fixtureVariant = null, dataDir, log = console.log, now = () => new Date() } = opts;
  const pre = await preflight({ ...opts, scenario });
  const { task, property, auth } = pre;
  const sc = task.scenarios[scenario];
  const verifySteps = sc.verify ?? task.verify ?? [];
  const limits = task.limits;

  const startedAt = now();
  const runId = makeRunId(task.id, scenario, startedAt);
  const runDir = runDirOf(dataDir, runId);
  const shotDir = path.join(runDir, 'screenshots');
  await mkdir(shotDir, { recursive: true });
  const tag = `[${property.id}] ${task.id}/${scenario}`;

  const writesOn = allowWrites && declaresWrites(task);
  const run = {
    schemaVersion: 1,
    runId,
    tool: { name: 'task-effort-audit', version: TOOL_VERSION },
    task: {
      id: task.id,
      name: task.name,
      scenario,
      scenarioKind: sc.kind,
      goal: task.goal,
      userRole: task.userRole,
      familiarity: task.familiarity,
      definitionHash: definitionHash(task, scenario),
      comparisonContext: task.comparisonContext,
      taskFile: path.relative(process.cwd(), pre.taskPath),
    },
    property: { id: property.id, name: property.name, baseUrl: property.baseUrl, environment: property.environment, contextHash: propertyContextHash(property) },
    executionContext: {
      startedAt: startedAt.toISOString(),
      finishedAt: null,
      headed,
      viewport: task.viewport,
      locale: task.locale,
      authRef: task.authRef,
      allowWrites: writesOn,
      fixtureVariant,
      nonUiSteps: [
        ...task.setup.map((c) => `setup: ${c.method} ${c.path}${c.note ? ` — ${c.note}` : ''}`),
        `start: load ${task.startingState.path} (not counted)`,
        ...verifySteps.filter((s) => s.do === 'httpJson').map((s) => `verify: GET ${s.path} (state check outside the UI)`),
        ...task.cleanup.map((c) => `cleanup: ${c.method} ${c.path}${c.note ? ` — ${c.note}` : ''}`),
      ],
      tooling: toolingVersions(null),
    },
    execution: { status: 'stopped', stepsPlanned: sc.steps.length, stepsExecuted: 0, failure: null, diagnostics: {} },
    verification: { status: 'unknown', assertions: [], note: 'not run' },
    metrics: computeMetrics([]),
    safety: { mode: writesOn ? 'writes-allowed' : 'read-only', allowedMutations: task.allowedMutations.map((m) => m.id), mutationsPerformed: [], blockedRequests: [] },
    cleanup: { status: 'not-needed', residualChanges: false, detail: '' },
    findings: [],
    comparison: null,
    artifacts: { ledger: 'actions.json', report: 'report.md', trace: 'trace.zip', screenshots: [] },
  };

  await appendIndex(dataDir, { event: 'started', runId, taskId: task.id, scenario, propertyId: property.id, startedAt: run.executionContext.startedAt, runDir: path.relative(process.cwd(), runDir) });
  log(`${tag} › run ${runId}`);

  // The ledger is written after every step, so a crash or report failure never
  // loses it. Writes are chained so an earlier snapshot can't land last.
  let ledgerWrites = Promise.resolve();
  const writeLedger = (entries) => {
    const body = `${JSON.stringify({ runId, entries }, null, 2)}\n`;
    ledgerWrites = ledgerWrites.then(() => writeFile(path.join(runDir, 'actions.json'), body)).catch(() => {});
    return ledgerWrites;
  };
  const ledger = createLedger({ onChange: writeLedger });
  let shotN = 0;
  const shoot = async (pg, label) => {
    if (!pg || pg.isClosed()) return null;
    const rel = `screenshots/${String(++shotN).padStart(2, '0')}-${label}.png`;
    try {
      await pg.screenshot({ path: path.join(runDir, rel) });
      run.artifacts.screenshots.push(rel);
      return rel;
    } catch {
      return null;
    }
  };

  let fixture = null;
  let browser = null;
  let context = null;
  let setupRan = false;
  let currentStep = null;
  let failureScreenshot = null;
  const t0 = Date.now();
  const deadline = t0 + limits.maxDurationMs;
  const saved = {};
  const guard = createRequestGuard({ task, property, allowWrites: writesOn, getCurrentStep: () => currentStep });
  const baseUrl = property.baseUrl;

  const timeoutLeft = () => Math.min(limits.stepTimeoutMs, deadline - Date.now());
  const value = (s) => resolveTemplate(s, { data: task.testData, saved });
  const fixtureCall = async (c) => {
    const res = await fetch(new URL(c.path, baseUrl), { method: c.method });
    if (!res.ok) throw new Error(`${c.method} ${c.path} → HTTP ${res.status}`);
  };

  try {
    // ---- environment ------------------------------------------------------
    try {
      if (fixtureVariant) {
        const mod = await import(pathToFileURL(path.resolve(path.dirname(pre.propertyPath), property.fixture.module)).href);
        fixture = await mod.startFixture({ port: Number(new URL(baseUrl).port), variant: fixtureVariant });
        log(`${tag} › started local fixture (${fixtureVariant}) on ${fixture.url}`);
      }
      // TEA_CHROMIUM_PATH: use a preinstalled Chromium when Playwright's own
      // download doesn't match (e.g. a cloud container). Recorded in tooling.
      browser = await chromium.launch({ headless: !headed, slowMo, executablePath: process.env.TEA_CHROMIUM_PATH || undefined });
      run.executionContext.tooling = toolingVersions(browser.version());
      context = await browser.newContext({ viewport: task.viewport, locale: task.locale, storageState: auth.storageState });
      await context.tracing.start({ screenshots: true, snapshots: true });
      await context.route('**/*', (route) => {
        const req = route.request();
        const d = guard.decide({ method: req.method(), url: req.url() });
        return d.allow ? route.continue() : route.abort('blockedbyclient');
      });
      for (const c of task.setup) {
        log(`${tag} › setup ${c.method} ${c.path}`);
        await fixtureCall(c);
        setupRan = true;
      }
    } catch (e) {
      throw Object.assign(new StopError('environment', `environment setup failed: ${e.message}`), { setupPhase: true });
    }

    const pages = { main: await context.newPage() };
    let active = 'main';
    try {
      await pages.main.goto(new URL(task.startingState.path, baseUrl).href, { timeout: limits.stepTimeoutMs });
    } catch (e) {
      throw new StopError('environment', `could not load starting state ${task.startingState.path}: ${e.message.split('\n')[0]}`);
    }
    const authCheck = async (pg) => {
      const pf = auth.profile;
      if (pf.loginUrlPattern && new RegExp(pf.loginUrlPattern).test(pg.url())) {
        throw new StopError('authentication', `redirected to a login URL (${pg.url()})`);
      }
    };
    await authCheck(pages.main);
    if (auth.profile.signedInCheck) {
      const ok = await locate(pages.main, auth.profile.signedInCheck).waitFor({ state: 'visible', timeout: limits.stepTimeoutMs }).then(() => true, () => false);
      if (!ok) throw new StopError('authentication', `signed-in check not visible: ${describeTarget(auth.profile.signedInCheck)}`);
    }
    await shoot(pages.main, 'start');

    // ---- reviewed path ----------------------------------------------------
    let counted = 0;
    for (const [i, step] of sc.steps.entries()) {
      currentStep = step;
      const phase = step.phase ?? 'path';
      const pg = pages[step.page ?? active];
      log(`${tag} › step ${i + 1}/${sc.steps.length} ${step.do} ${describeTarget(step.target) || step.to || ''}${phase !== 'path' ? ` [${phase}]` : ''}`);
      const at = Date.now() - t0;
      try {
        if (Date.now() >= deadline) throw new StopError('timeout', `maxDurationMs ${limits.maxDurationMs} reached before step "${step.id}"`);
        const isAction = COUNTED_ACTIONS.includes(step.do);

        if (step.conditional) {
          const appears = await locate(pg, step.conditional.ifVisible)
            .waitFor({ state: 'visible', timeout: Math.min(step.conditional.waitMs, Math.max(1, deadline - Date.now())) })
            .then(() => true, () => false);
          if (!appears) {
            ledger.record({ step, phase, outcome: 'skipped', at, page: step.page ?? active, conditional: { performed: false, reason: step.conditional.reason } });
            run.execution.stepsExecuted = i + 1;
            continue;
          }
        }
        if (isAction && counted >= limits.maxActions) {
          throw new StopError('safety-stop', `maxActions ${limits.maxActions} reached — step "${step.id}" would exceed it`);
        }

        let logged;
        const loc = step.target ? locate(pg, step.target) : null;
        const to = timeoutLeft();
        switch (step.do) {
          case 'click':
          case 'press': {
            const act = () => (step.do === 'click' ? loc.click({ timeout: to }) : loc ? loc.press(step.value, { timeout: to }) : pg.keyboard.press(step.value));
            if (step.opensPage) {
              const [np] = await Promise.all([context.waitForEvent('page', { timeout: to }), act()]);
              await np.waitForLoadState('domcontentloaded', { timeout: to });
              pages[step.opensPage] = np;
              active = step.opensPage; // a new tab takes focus, as in a real browser
            } else await act();
            if (step.do === 'press') logged = step.value;
            break;
          }
          case 'fill': {
            const v = value(step.value);
            await loc.fill(v.value, { timeout: to });
            logged = v.loggable ? v.value : '[redacted: runtime value]';
            break;
          }
          case 'select': {
            const v = value(step.value);
            await loc.selectOption(v.value, { timeout: to });
            logged = v.loggable ? v.value : '[redacted: runtime value]';
            break;
          }
          case 'check':
            await loc.check({ timeout: to });
            break;
          case 'uncheck':
            await loc.uncheck({ timeout: to });
            break;
          case 'switchPage':
            await pages[step.to].bringToFront();
            active = step.to;
            break;
          case 'read': {
            await loc.waitFor({ state: 'visible', timeout: to });
            saved[step.saveAs] = ((await loc.textContent()) ?? '').trim();
            logged = `[captured into saved.${step.saveAs}, ${saved[step.saveAs].length} chars]`;
            break;
          }
          case 'waitFor':
          case 'assertVisible':
            await loc.waitFor({ state: 'visible', timeout: to });
            break;
          case 'assertText':
          case 'expectError':
            await loc.waitFor({ state: 'visible', timeout: to });
            if (step.value !== undefined) await pollUntil(async () => ((await loc.textContent()) ?? '').trim(), value(step.value).value, to);
            break;
          case 'assertValue':
            await pollUntil(() => loc.inputValue({ timeout: to }), value(step.value).value, to);
            break;
          case 'scroll':
            await pg.mouse.wheel(0, (step.direction === 'up' ? -1 : 1) * (step.amount ?? 600));
            break;
          case 'screenshot':
            break;
          default:
            throw new StopError('unknown', `unsupported step "${step.do}"`);
        }
        if (isAction) {
          counted += 1;
          await pages[active].waitForTimeout(SETTLE_MS);
        }
        if (guard.violations.length) {
          const v = guard.violations[guard.violations.length - 1];
          throw new StopError('safety-stop', `${v.reason} (${v.method} ${v.url})`);
        }
        await authCheck(pages[active]);

        const checkpoint = step.screenshot || step.annotations || step.conditional || step.mutates || step.opensPage || step.do === 'expectError' || step.do === 'screenshot';
        const shot = checkpoint ? await shoot(pages[active], step.id) : null;
        ledger.record({ step, phase, outcome: 'done', value: logged, at, page: step.page ?? active, screenshot: shot, conditional: step.conditional ? { performed: true, reason: step.conditional.reason } : undefined });
        run.execution.stepsExecuted = i + 1;
      } catch (e) {
        failureScreenshot = await shoot(pages[active], `failure-${step.id}`);
        const f = classifyFailure({ step, error: e, remainingMs: deadline - Date.now(), stepTimeoutMs: limits.stepTimeoutMs });
        ledger.record({ step, phase, outcome: 'failed', at, page: step.page ?? active, screenshot: failureScreenshot, error: f.observed });
        run.execution.failure = f;
        log(`${tag} ✗ stopped at "${step.id}": ${f.label} — ${f.observed}`);
        break;
      }
    }
    currentStep = null;

    // ---- independent verification ----------------------------------------
    if (!run.execution.failure) {
      run.execution.status = 'completed';
      await shoot(pages[active], 'path-end');
      log(`${tag} › verifying final state (${verifySteps.length} step(s))`);
      const vp = pages.main;
      await vp.bringToFront();
      let verifyFailed = false;
      for (const step of verifySteps) {
        currentStep = step;
        const at = Date.now() - t0;
        const to = Math.max(1, timeoutLeft());
        const loc = step.target ? locate(vp, step.target) : null;
        try {
          if (step.do === 'reload') await vp.reload({ timeout: to });
          else if (step.do === 'goto') await vp.goto(new URL(step.path, baseUrl).href, { timeout: to });
          else if (step.do === 'httpJson') {
            const res = await context.request.get(new URL(step.path, baseUrl).href, { timeout: to });
            const body = await res.json();
            const expected = Object.fromEntries(Object.entries(step.expect).map(([k, v]) => [k, typeof v === 'string' ? value(v).value : v]));
            const mismatch = subsetMismatch(body, expected);
            if (mismatch) throw Object.assign(new Error(mismatch), { name: 'AssertionError' });
          } else if (step.do === 'assertVisible' || step.do === 'waitFor') await loc.waitFor({ state: 'visible', timeout: to });
          else if (step.do === 'assertText') {
            await loc.waitFor({ state: 'visible', timeout: to });
            await pollUntil(async () => ((await loc.textContent()) ?? '').trim(), value(step.value).value, to);
          } else if (step.do === 'assertValue') await pollUntil(() => loc.inputValue({ timeout: to }), value(step.value).value, to);
          else if (step.do === 'read') saved[step.saveAs] = ((await loc.textContent({ timeout: to })) ?? '').trim();
          const entry = ledger.record({ step, phase: 'verify', outcome: 'done', at, page: 'main' });
          if (step.do !== 'goto' && step.do !== 'reload') run.verification.assertions.push({ stepId: step.id, do: step.do, outcome: 'passed', ledgerIndex: entry.index });
        } catch (e) {
          const f = classifyFailure({ step, error: e, remainingMs: deadline - Date.now(), stepTimeoutMs: limits.stepTimeoutMs });
          const shot = await shoot(vp, `verify-failed-${step.id}`);
          const entry = ledger.record({ step, phase: 'verify', outcome: 'failed', at, page: 'main', screenshot: shot, error: f.observed });
          run.verification.assertions.push({ stepId: step.id, do: step.do, outcome: 'failed', category: f.category, observed: f.observed, screenshot: shot, ledgerIndex: entry.index });
          verifyFailed = true;
          log(`${tag} ✗ verification "${step.id}" failed: ${f.observed}`);
          break;
        }
      }
      currentStep = null;
      if (verifyFailed) {
        const last = run.verification.assertions.at(-1);
        // An environment problem during verify means we don't know; a failed assertion means we know it failed.
        run.verification.status = last.category === 'product-assertion' ? 'fail' : 'unknown';
        run.verification.note = last.category === 'product-assertion' ? `"${last.stepId}" did not hold` : `verification could not run (${last.category})`;
      } else {
        run.verification.status = 'pass';
        run.verification.note = `${run.verification.assertions.length} independent assertion(s) held`;
        await shoot(vp, 'verified');
      }
    } else {
      run.verification.note = 'not run — the reference path did not complete';
    }
  } catch (e) {
    // Stops before the path began: environment / authentication.
    const f = classifyFailure({ step: null, error: e });
    run.execution.failure = { ...f, stepId: e.setupPhase ? '(setup)' : '(start)' };
    run.verification.note = 'not run — the reference path did not start';
    log(`${tag} ✗ ${f.label}: ${f.observed}`);
  } finally {
    run.execution.diagnostics = { browserDurationMs: Date.now() - t0, note: 'Browser/runtime duration — diagnostic only; never human task time.' };
    if (context) {
      await context.tracing.stop({ path: path.join(runDir, 'trace.zip') }).catch(() => {});
    }
    if (browser) await browser.close().catch(() => {});

    run.safety.mutationsPerformed = guard.mutations;
    run.safety.blockedRequests = guard.violations;
    run.safety.requestOrigins = [...guard.origins].filter((o) => o !== 'null');
    if (setupRan || guard.mutations.length) {
      if (!task.cleanup.length) {
        run.cleanup = guard.mutations.length
          ? { status: 'not-defined', residualChanges: true, detail: `${guard.mutations.length} write(s) made and the task defines no cleanup` }
          : { status: 'not-defined', residualChanges: false, detail: 'no cleanup defined; no writes were made' };
      } else {
        try {
          for (const c of task.cleanup) {
            log(`${tag} › cleanup ${c.method} ${c.path}`);
            await fixtureCall(c);
          }
          run.cleanup = { status: 'done', residualChanges: false, detail: `${task.cleanup.length} cleanup call(s) succeeded` };
        } catch (e) {
          run.cleanup = { status: 'failed', residualChanges: guard.mutations.length > 0 || setupRan, detail: `cleanup failed: ${e.message}` };
          log(`${tag} ⚠ CLEANUP FAILED — residual test changes may remain: ${e.message}`);
        }
      }
    }
    if (fixture) await fixture.close();
  }

  // ---- record -------------------------------------------------------------
  run.executionContext.finishedAt = now().toISOString();
  run.metrics = computeMetrics(ledger.entries);
  run.findings = buildFindings({
    taskId: task.id,
    scenario,
    entries: ledger.entries,
    failure: run.execution.failure,
    verification: run.verification,
    blockedRequests: run.safety.blockedRequests,
    cleanup: run.cleanup,
    failureScreenshot,
  });
  const baselines = await loadBaselines(dataDir, task.id, scenario);
  run.comparison = compareToBaseline(baselines?.current ?? null, run);

  const authStop = run.execution.failure?.category === 'authentication';
  const ok = run.execution.status === 'completed' && run.verification.status === 'pass';
  run.exitCode = authStop ? EXIT.AUTH : ok ? EXIT.OK : EXIT.RUN_FAILED;

  await writeLedger(ledger.entries);
  await writeJson(path.join(runDir, 'run.json'), run);
  try {
    await writeFile(path.join(runDir, 'report.md'), renderReport(run));
  } catch (e) {
    run.reportError = `report generation failed: ${e.message} — run.json, actions.json, screenshots and trace are intact`;
    await writeJson(path.join(runDir, 'run.json'), run);
  }
  await appendIndex(dataDir, {
    event: 'finished',
    runId,
    taskId: task.id,
    scenario,
    propertyId: property.id,
    finishedAt: run.executionContext.finishedAt,
    executionStatus: run.execution.status,
    failureCategory: run.execution.failure?.category ?? null,
    verification: run.verification.status,
    requiredActions: run.metrics.path.actions,
    comparison: run.comparison.status,
    changedMetrics: run.comparison.changed ?? [],
    exitCode: run.exitCode,
    runDir: path.relative(process.cwd(), runDir),
  });
  return { run, runDir, exitCode: run.exitCode };
}

export { ConfigError, SafetyError, AuthError };
