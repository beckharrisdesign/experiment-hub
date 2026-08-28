/**
 * Stack state — an ordered list of module entries.
 *
 * Order is meaningful and `enabled: false` keeps its params, so muting a module
 * to compare does not throw its settings away. Both properties are load-bearing
 * requirements, not conveniences: see specs/transform-module-stack/spec.md.
 */
import { MODULE_BY_ID, MODULES, defaultParams, type ModuleDef } from './modules';

export interface StackEntry {
  /** Stable per-row id so React keys survive reordering. */
  uid: string;
  module: string;
  enabled: boolean;
  params: Record<string, number>;
}

export interface RenderRequest {
  sourceRef: string;
  stack: StackEntry[];
  preview: boolean;
}

let counter = 0;
export function newEntry(moduleId: string): StackEntry {
  const def = MODULE_BY_ID.get(moduleId);
  if (!def) throw new Error(`Unknown module: ${moduleId}`);
  counter += 1;
  return {
    uid: `${moduleId}-${counter}`,
    module: moduleId,
    enabled: true,
    params: defaultParams(def),
  };
}

export function defaultStack(): StackEntry[] {
  return MODULES.map((m) => newEntry(m.id));
}

export function move(stack: StackEntry[], from: number, to: number): StackEntry[] {
  if (to < 0 || to >= stack.length || from === to) return stack;
  const next = stack.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function resolve(entry: StackEntry): ModuleDef | undefined {
  return MODULE_BY_ID.get(entry.module);
}

/** Compact description used as the cache/identity key for a rendered result. */
export function describe(stack: StackEntry[]): string {
  return stack
    .filter((e) => e.enabled)
    .map((e) => `${e.module}(${Object.entries(e.params).map(([k, v]) => `${k}=${v}`).join(',')})`)
    .join(' → ');
}
