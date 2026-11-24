/*
 * Safety rules. Three layers:
 *
 *  1. Definition checks — always on. Refuse prohibited actions (payments,
 *     outbound messages, deletion), credential-looking config, and fixture
 *     calls outside the declared fixture API.
 *  2. Run authorization — a task that changes state needs an explicit
 *     allowedMutations list, a property approved for writes in a local/test
 *     environment, and the runtime --allow-writes flag. Never production.
 *  3. Request guard — during the run every non-GET browser request is checked:
 *     read-only runs block all writes; write runs only allow same-origin writes
 *     during a step that declares the mutation.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const ALLOWED_MUTATION_KINDS = ['update', 'create'];

/** Labels on counted actions that the runner refuses to touch, whatever the config says. */
export const PROHIBITED_ACTION = /\b(delete|remove|erase|destroy|pay|payment|purchase|buy|checkout|place order|subscribe|send|transfer|deactivate|close account|cancel subscription)\b/i;

const CREDENTIAL_KEY = /(pass(word|wd)?|secret|token|api[_-]?key|cookie|authorization|credential|session[_-]?id)/i;
const CREDENTIAL_VALUE = /^(bearer\s|basic\s|sk-|sk_live_|sk_test_|ghp_|github_pat_|xox[bp]-|eyJ[A-Za-z0-9_-]{10,}\.)/i;

function walk(value, visit, trail = []) {
  if (Array.isArray(value)) return value.forEach((v, i) => walk(v, visit, [...trail, i]));
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      visit(k, v, [...trail, k]);
      walk(v, visit, [...trail, k]);
    }
  }
}

/** Credential-looking keys or values anywhere in a raw config. */
export function credentialProblems(raw, label) {
  const p = [];
  walk(raw, (key, value, trail) => {
    // pathEnv names an env var holding a file path — a reference, not a credential.
    if (CREDENTIAL_KEY.test(key) && key !== 'pathEnv') {
      p.push(`${label} ${trail.join('.')}: key looks like a credential — never put credentials in task configuration; use an auth profile reference`);
    }
    if (typeof value === 'string' && CREDENTIAL_VALUE.test(value.trim())) {
      p.push(`${label} ${trail.join('.')}: value looks like a credential — never put credentials in task configuration`);
    }
  });
  return p;
}

function targetText(t) {
  if (!t) return '';
  return [t.name, t.label, t.text, t.placeholder, t.testId, targetText(t.within)].filter(Boolean).join(' ');
}

function isLoopback(url) {
  const h = new URL(url).hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
}

/** Layer 1. Always enforced; returns problems (empty = acceptable). */
export function definitionSafetyProblems(task, property, rawTask = task, rawProperty = property) {
  const p = [...credentialProblems(rawTask, 'task'), ...credentialProblems(rawProperty, 'property')];

  for (const m of task.allowedMutations) {
    if (!ALLOWED_MUTATION_KINDS.includes(m.kind)) {
      p.push(`allowedMutations "${m.id}": kind "${m.kind}" is prohibited — v1 only allows ${ALLOWED_MUTATION_KINDS.join(' / ')} of bounded test data (no deletion, payments, or outbound messages)`);
    }
  }

  for (const [name, sc] of Object.entries(task.scenarios)) {
    for (const s of sc.steps) {
      const text = targetText(s.target);
      if (['click', 'press', 'check', 'select'].includes(s.do) && PROHIBITED_ACTION.test(text)) {
        p.push(`scenario "${name}" step "${s.id}": target "${text}" matches a prohibited action (delete/pay/send/…) — v1 never executes these`);
      }
      if (s.do === 'fill' && /pass(word|code)?/i.test(text)) {
        p.push(`scenario "${name}" step "${s.id}": typing into a password field is not allowed — authenticate with a storageState auth profile instead`);
      }
    }
  }

  if (property.environment === 'local' && !isLoopback(property.baseUrl)) {
    p.push(`property "${property.id}": environment "local" but baseUrl ${property.baseUrl} is not a loopback address`);
  }

  const calls = [...task.setup.map((c) => ['setup', c]), ...task.cleanup.map((c) => ['cleanup', c])];
  for (const [phase, c] of calls) {
    const label = `${phase} ${c.method} ${c.path}`;
    if (!['GET', 'POST', 'PUT'].includes(c.method)) {
      p.push(`${label}: method ${c.method} is not allowed for fixture calls (no DELETE — cleanup must not perform destructive actions)`);
    }
    if (!property.fixtureApi) {
      p.push(`${label}: property "${property.id}" declares no fixtureApi — setup/cleanup calls are only for approved fixture helpers`);
    } else if (!c.path.startsWith(property.fixtureApi.pathPrefix)) {
      p.push(`${label}: path is outside the property's fixtureApi prefix ${property.fixtureApi.pathPrefix}`);
    }
    if (property.environment === 'production') {
      p.push(`${label}: fixture calls are never made against a production property`);
    }
  }
  return p;
}

export function declaresWrites(task) {
  return (
    task.allowedMutations.length > 0 ||
    Object.values(task.scenarios).some((sc) => sc.steps.some((s) => s.mutates))
  );
}

/** Layer 2. Returns problems for this particular run request. */
export function runAuthorizationProblems(task, property, { allowWrites = false } = {}) {
  if (!declaresWrites(task)) return [];
  const p = [];
  if (property.environment === 'production') {
    p.push(`task "${task.id}" changes state and property "${property.id}" is production — write scenarios never run against production`);
  }
  if (!property.writesApproved) {
    p.push(`property "${property.id}" is not approved for writes (writesApproved: false) — only approved test environments/accounts may be changed`);
  }
  if (!allowWrites) {
    p.push(`task "${task.id}" declares mutations (${task.allowedMutations.map((m) => m.id).join(', ')}) — rerun with --allow-writes to opt in`);
  }
  return p;
}

/**
 * Layer 3. `decide` is called for every browser request; violations and
 * performed mutations are recorded for the run record.
 */
export function createRequestGuard({ task, property, allowWrites, getCurrentStep }) {
  const origin = new URL(property.baseUrl).origin;
  const writesOn = allowWrites && declaresWrites(task);
  const violations = [];
  const mutations = [];
  const origins = new Set(); // every origin the browser contacted — evidence for the run record

  function decide({ method, url }) {
    const m = method.toUpperCase();
    try {
      origins.add(new URL(url).origin);
    } catch {
      /* data: / blob: URLs */
    }
    if (SAFE_METHODS.has(m)) return { allow: true };
    if (property.readOnlyRequestAllowlist.some((prefix) => url.startsWith(prefix))) {
      return { allow: true, reason: 'allowlisted non-mutating request' };
    }
    const step = getCurrentStep();
    const at = step ? step.id : '(between steps)';
    let reason = null;
    if (!writesOn) reason = 'write request blocked: this run is read-only';
    else if (new URL(url).origin !== origin) reason = `write request to another origin (${new URL(url).origin}) blocked`;
    else if (!step || !step.mutates) reason = `write request during step "${at}", which declares no mutation`;

    if (reason) {
      violations.push({ stepId: at, method: m, url, reason });
      return { allow: false, reason };
    }
    mutations.push({ stepId: step.id, mutationId: step.mutates, method: m, path: new URL(url).pathname });
    return { allow: true };
  }

  return { decide, violations, mutations, origins };
}
