import { createHash, randomBytes } from 'node:crypto';

export const TOOL_VERSION = '0.1.0';

/** A problem with task/property configuration (exit code 2). */
export class ConfigError extends Error {
  constructor(problems) {
    const list = Array.isArray(problems) ? problems : [problems];
    super(`Configuration invalid:\n  - ${list.join('\n  - ')}`);
    this.name = 'ConfigError';
    this.problems = list;
  }
}

/** A preflight safety refusal (exit code 2 — the run never starts). */
export class SafetyError extends Error {
  constructor(problems) {
    const list = Array.isArray(problems) ? problems : [problems];
    super(`Safety check refused this run:\n  - ${list.join('\n  - ')}`);
    this.name = 'SafetyError';
    this.problems = list;
  }
}

/** An authentication reference that cannot be resolved (exit code 3). */
export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

/** JSON with object keys sorted, so equal content always hashes equal. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

/** Run IDs sort by time and never collide on a manual rerun. */
export function makeRunId(taskId, scenario, now = new Date()) {
  const ts = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${ts}-${taskId}-${scenario}-${randomBytes(2).toString('hex')}`;
}
