/*
 * Task and property configuration: schema, semantic checks, and the
 * definition hash that decides baseline compatibility.
 *
 * The format is documented in ../README.md § "Configuration".
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ConfigError, canonicalJson, sha256 } from './util.mjs';
import { loadCatalog, principleProblems } from './principles.mjs';

// ---------------------------------------------------------------------------
// Step vocabularies — the counting rules hang off these lists
// ---------------------------------------------------------------------------

/** One of these = one task action (README § Counting rules). */
export const COUNTED_ACTIONS = ['click', 'fill', 'select', 'check', 'uncheck', 'press', 'switchPage'];
/** Assertions and reads — never counted. */
export const ASSERTIONS = ['assertVisible', 'assertText', 'assertValue', 'expectError'];
/** Allowed in a scenario's steps but never counted. */
export const UNCOUNTED_PATH_STEPS = ['read', 'waitFor', 'scroll', 'screenshot', ...ASSERTIONS];
/** Only allowed in `verify` — they would bypass the UI work if used in the path. */
export const VERIFY_ONLY = ['goto', 'reload', 'httpJson'];

export const CONTEXT_BOUNDARIES = [
  'new-browser-tab',
  'different-site',
  'different-application',
  'different-product-area',
  'external-document',
];

const NEEDS_TARGET = ['click', 'fill', 'select', 'check', 'uncheck', 'read', 'waitFor', ...ASSERTIONS];
const TEMPLATE = /\{\{\s*(data|saved|env)\.([A-Za-z0-9_]+)\s*\}\}/g;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const Target = z.lazy(() =>
  z
    .object({
      role: z.string().optional(),
      name: z.string().optional(),
      exact: z.boolean().optional(),
      label: z.string().optional(),
      text: z.string().optional(),
      testId: z.string().optional(),
      placeholder: z.string().optional(),
      css: z.string().optional(),
      within: Target.optional(),
    })
    .strict()
    .refine(
      (t) => ['role', 'label', 'text', 'testId', 'placeholder', 'css'].filter((k) => t[k] !== undefined).length === 1,
      { message: 'target needs exactly one of role | label | text | testId | placeholder | css' },
    ),
);

const Annotations = z
  .object({
    repeatedEntry: z.object({ source: z.string().min(1), explanation: z.string().min(1) }).strict().optional(),
    contextSwitch: z
      .object({ from: z.string().min(1), to: z.string().min(1), boundary: z.enum(CONTEXT_BOUNDARIES) })
      .strict()
      .optional(),
    suggestion: z.string().optional(),
  })
  .strict();

const Step = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'step id must be kebab-case'),
    do: z.enum([...COUNTED_ACTIONS, ...UNCOUNTED_PATH_STEPS, ...VERIFY_ONLY]),
    target: Target.optional(),
    value: z.string().optional(),
    path: z.string().optional(),
    expect: z.record(z.string(), z.unknown()).optional(),
    saveAs: z.string().regex(/^[A-Za-z0-9_]+$/).optional(),
    page: z.string().optional(),
    opensPage: z.string().optional(),
    to: z.string().optional(),
    phase: z.enum(['path', 'error-induction', 'recovery']).optional(),
    mutates: z.string().optional(),
    conditional: z
      .object({ ifVisible: Target, waitMs: z.number().int().positive().max(10_000), reason: z.string().min(1) })
      .strict()
      .optional(),
    annotations: Annotations.optional(),
    // MVDS principle ids this step is evidence for (labels only; see principles.mjs).
    principles: z.array(z.string()).optional(),
    direction: z.enum(['up', 'down']).optional(),
    amount: z.number().int().positive().optional(),
    screenshot: z.boolean().optional(),
    note: z.string().optional(),
  })
  .strict();

const FixtureCall = z
  .object({
    type: z.literal('fixtureApi'),
    method: z.string(),
    path: z.string().startsWith('/'),
    note: z.string().optional(),
  })
  .strict();

const Scenario = z
  .object({
    kind: z.enum(['normal', 'recovery']),
    description: z.string().optional(),
    steps: z.array(Step).min(1),
    verify: z.array(Step).optional(),
    principles: z.array(z.string()).optional(),
  })
  .strict();

export const TaskSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'task id must be kebab-case'),
    name: z.string().min(1),
    propertyRef: z.string().min(1),
    userRole: z.string().min(1),
    familiarity: z.string().min(1),
    goal: z.string().min(1),
    startingState: z.object({ path: z.string().startsWith('/'), description: z.string().min(1) }).strict(),
    testData: z.record(z.string(), z.string()).default({}),
    fixtureRef: z.string().optional(),
    viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
    locale: z.string().min(2),
    authRef: z.string().min(1),
    limits: z
      .object({
        maxDurationMs: z.number().int().positive(),
        maxActions: z.number().int().positive(),
        stepTimeoutMs: z.number().int().positive().default(5000),
      })
      .strict(),
    allowedMutations: z
      .array(z.object({ id: z.string().min(1), kind: z.string(), description: z.string().min(1) }).strict())
      .default([]),
    comparisonContext: z.string().min(1),
    setup: z.array(FixtureCall).default([]),
    verify: z.array(Step).optional(),
    cleanup: z.array(FixtureCall).default([]),
    scenarios: z.record(z.string().regex(/^[a-z0-9-]+$/), Scenario),
    notes: z.string().optional(),
  })
  .strict();

const AuthProfile = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none'), note: z.string().optional() }).strict(),
  z
    .object({
      type: z.literal('storageState'),
      pathEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'pathEnv names an environment variable'),
      signedInCheck: Target.optional(),
      loginUrlPattern: z.string().optional(),
      note: z.string().optional(),
    })
    .strict(),
]);

export const PropertySchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1),
    baseUrl: z.string().url(),
    environment: z.enum(['local', 'test', 'production']),
    writesApproved: z.boolean().default(false),
    writesApprovalNote: z.string().optional(),
    fixture: z.object({ module: z.string(), note: z.string().optional() }).strict().optional(),
    fixtureApi: z.object({ pathPrefix: z.string().startsWith('/') }).strict().optional(),
    readOnlyRequestAllowlist: z.array(z.string().url()).default([]),
    // Reviewed side-effect requests (e.g. page-view counters) to block quietly
    // instead of letting audit traffic write to a live property's analytics.
    suppressRequests: z.array(z.string().url()).default([]),
    authProfiles: z.record(z.string(), AuthProfile),
    notes: z.string().optional(),
  })
  .strict();

function zodProblems(prefix, error) {
  return error.issues.map((i) => `${prefix}${i.path.length ? ` ${i.path.join('.')}` : ''}: ${i.message}`);
}

// ---------------------------------------------------------------------------
// Semantic checks the schema can't express
// ---------------------------------------------------------------------------

function templateRefs(str) {
  return [...String(str ?? '').matchAll(TEMPLATE)].map((m) => ({ ns: m[1], key: m[2] }));
}

function isIndependentVerify(steps) {
  // Independent = an assertion made after a reload/goto (fresh state from the
  // server, not the toast left by the path), or a direct state read via httpJson.
  let fresh = false;
  for (const s of steps) {
    if (s.do === 'reload' || s.do === 'goto') fresh = true;
    if (s.do === 'httpJson') return true;
    if (fresh && ASSERTIONS.includes(s.do)) return true;
  }
  return false;
}

/** Returns a list of problems; empty means the task is internally consistent. */
export function semanticProblems(task, property) {
  const p = [];
  if (!property.authProfiles[task.authRef]) {
    p.push(`authRef "${task.authRef}" is not one of the property's authProfiles (${Object.keys(property.authProfiles).join(', ')})`);
  }
  const mutationIds = new Set(task.allowedMutations.map((m) => m.id));

  for (const [name, sc] of Object.entries(task.scenarios)) {
    const where = (s) => `scenario "${name}" step "${s.id}"`;
    const ids = new Set();
    const saved = new Set();
    const pages = new Set(['main']);
    let sawExpectError = false;
    let sawRecovery = false;

    for (const s of sc.steps) {
      if (ids.has(s.id)) p.push(`${where(s)}: duplicate step id`);
      ids.add(s.id);
      if (VERIFY_ONLY.includes(s.do)) {
        p.push(`${where(s)}: "${s.do}" is only allowed in verify — the reviewed path must be performed through the UI`);
      }
      if (NEEDS_TARGET.includes(s.do) && !s.target) p.push(`${where(s)}: "${s.do}" needs a target`);
      if (['fill', 'select', 'press', 'assertText', 'assertValue'].includes(s.do) && s.value === undefined) {
        p.push(`${where(s)}: "${s.do}" needs a value`);
      }
      if (s.do === 'read' && !s.saveAs) p.push(`${where(s)}: read needs saveAs`);
      if (s.do === 'switchPage' && !s.to) p.push(`${where(s)}: switchPage needs "to"`);
      if (s.do === 'switchPage' && s.to && !pages.has(s.to)) p.push(`${where(s)}: switchPage to unknown page "${s.to}"`);
      if (s.page && !pages.has(s.page)) p.push(`${where(s)}: page "${s.page}" is not opened by an earlier step`);
      if (s.opensPage) {
        if (!['click', 'press'].includes(s.do)) p.push(`${where(s)}: opensPage only applies to click/press`);
        pages.add(s.opensPage);
      }
      if (s.conditional && !COUNTED_ACTIONS.includes(s.do)) {
        p.push(`${where(s)}: conditional only applies to counted actions`);
      }
      const ann = s.annotations ?? {};
      if (ann.repeatedEntry && !['fill', 'select'].includes(s.do)) {
        p.push(`${where(s)}: repeatedEntry annotation only applies to fill/select (a field-entry operation)`);
      }
      if (ann.contextSwitch && !COUNTED_ACTIONS.includes(s.do)) {
        p.push(`${where(s)}: contextSwitch annotation must sit on the action that crosses the boundary`);
      }
      if (s.mutates && !mutationIds.has(s.mutates)) {
        p.push(`${where(s)}: mutates "${s.mutates}" is not listed in allowedMutations`);
      }
      if (s.phase && s.phase !== 'path' && sc.kind !== 'recovery') {
        p.push(`${where(s)}: phase "${s.phase}" is only allowed in a recovery scenario`);
      }
      if (s.do === 'expectError') sawExpectError = true;
      if (s.phase === 'recovery') {
        sawRecovery = true;
        if (!sawExpectError) p.push(`${where(s)}: recovery steps must follow the expectError step that confirms the intended error`);
      }
      for (const ref of [...templateRefs(s.value), ...templateRefs(s.path)]) {
        if (ref.ns === 'data' && !(ref.key in task.testData)) p.push(`${where(s)}: {{data.${ref.key}}} is not in testData`);
        if (ref.ns === 'saved' && !saved.has(ref.key)) p.push(`${where(s)}: {{saved.${ref.key}}} is not saved by an earlier read step`);
      }
      if (s.saveAs) saved.add(s.saveAs);
    }

    if (sc.kind === 'recovery' && (!sawExpectError || !sawRecovery)) {
      p.push(`scenario "${name}": a recovery scenario needs an expectError step (the controlled error) followed by phase "recovery" steps`);
    }

    const verify = sc.verify ?? task.verify ?? [];
    if (verify.length === 0) {
      p.push(`scenario "${name}": no verify steps — completion requires an independent success assertion`);
    } else {
      for (const s of verify) {
        if (COUNTED_ACTIONS.includes(s.do)) {
          p.push(`scenario "${name}" verify step "${s.id}": "${s.do}" is not allowed in verify — use goto/reload + assertions or httpJson`);
        }
        if (s.do === 'httpJson' && (!s.path || !s.expect)) p.push(`scenario "${name}" verify step "${s.id}": httpJson needs path and expect`);
      }
      if (!isIndependentVerify(verify)) {
        p.push(
          `scenario "${name}": verify has no independent assertion — assert after a reload/goto, or use httpJson. ` +
            'A message shown at the end of the path is not proof of the final state.',
        );
      }
    }
  }
  return p;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Editorial fields never change what runs, so editing them must not break a
 * baseline: top-level `name` and `notes`, and any `description`, `note`, or
 * `principles` tag. Everything else — including annotations — is part of the definition.
 * Locator `target.name` is NOT editorial and stays in.
 */
function stripEditorial(value, depth = 0) {
  if (Array.isArray(value)) return value.map((v) => stripEditorial(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      // `principles` are evidence labels: they never change what runs or counts.
      if (k === 'description' || k === 'note' || k === 'principles') continue;
      if (depth === 0 && (k === 'name' || k === 'notes' || k === 'propertyRef')) continue;
      out[k] = stripEditorial(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** The part of a task that determines one scenario's execution. */
export function scenarioDefinition(task, scenarioName) {
  const { scenarios, verify, ...rest } = task;
  const sc = scenarios[scenarioName];
  return { ...rest, scenarioName, scenario: { ...sc, verify: sc.verify ?? verify ?? [] } };
}

export function definitionHash(task, scenarioName) {
  return sha256(canonicalJson(stripEditorial(scenarioDefinition(task, scenarioName))));
}

export function propertyContextHash(property) {
  return sha256(canonicalJson({ id: property.id, baseUrl: property.baseUrl, environment: property.environment }));
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Parse + validate already-loaded JSON. Throws ConfigError. */
export function parseTaskAndProperty(rawTask, rawProperty, catalog = loadCatalog()) {
  const t = TaskSchema.safeParse(rawTask);
  const pr = PropertySchema.safeParse(rawProperty);
  const problems = [
    ...(t.success ? [] : zodProblems('task', t.error)),
    ...(pr.success ? [] : zodProblems('property', pr.error)),
  ];
  if (problems.length) throw new ConfigError(problems);
  const sem = [...semanticProblems(t.data, pr.data), ...principleProblems(t.data, catalog)];
  if (sem.length) throw new ConfigError(sem);
  return { task: t.data, property: pr.data };
}

async function readJson(file, label) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    throw new ConfigError(`${label} file not found: ${file}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new ConfigError(`${label} file is not valid JSON (${file}): ${e.message}`);
  }
}

/** Load a task file and the property it references. */
export async function loadTask(taskPath) {
  const rawTask = await readJson(taskPath, 'Task');
  const propertyPath = path.resolve(path.dirname(taskPath), rawTask.propertyRef ?? '');
  const rawProperty = await readJson(propertyPath, 'Property');
  return { ...parseTaskAndProperty(rawTask, rawProperty), rawTask, rawProperty, taskPath, propertyPath };
}

/** Resolve {{data.x}}, {{saved.x}}, {{env.X}}. Returns the value and whether it is safe to log. */
export function resolveTemplate(str, { data = {}, saved = {}, env = process.env } = {}) {
  let loggable = true;
  const value = String(str).replace(TEMPLATE, (_, ns, key) => {
    if (ns === 'data') return data[key] ?? '';
    loggable = false;
    if (ns === 'saved') return saved[key] ?? '';
    return env[key] ?? '';
  });
  return { value, loggable };
}
