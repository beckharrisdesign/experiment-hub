/*
 * MVDS principle tags.
 *
 * A step, verify step, or scenario may carry `principles: [id, …]` naming the
 * MVDS principles it gathers evidence for. Tags are labels on evidence: they
 * never change what runs or what counts, so they stay out of the definition
 * hash (config.mjs) and editing them never breaks a baseline.
 *
 * Every tag must resolve against the committed MVDS catalog
 * (../mvds-principles.json, refreshed by sync-mvds-principles.mjs). Principles
 * MVDS already enforces in code (token, layout, story-coverage rules) are
 * rejected: the audit observes running interfaces, and a runtime tag on a
 * source-code rule would be a claim the audit can't support.
 */
import { readFileSync } from 'node:fs';

const CATALOG_URL = new URL('../mvds-principles.json', import.meta.url);

/** Load the committed catalog. */
export function loadCatalog() {
  return JSON.parse(readFileSync(CATALOG_URL, 'utf8'));
}

function problemsForList(ids, where, byId) {
  const p = [];
  const seen = new Set();
  for (const id of ids ?? []) {
    if (seen.has(id)) p.push(`${where}: duplicate principle "${id}"`);
    seen.add(id);
    const principle = byId.get(id);
    if (!principle) {
      p.push(`${where}: principle "${id}" is not in the MVDS principle catalog (scripts/task-effort-audit/mvds-principles.json). Check the id, or re-sync the catalog`);
    } else if (principle.checkKind !== 'guiding') {
      p.push(`${where}: principle "${id}" is enforced in code by MVDS (check:principles). Tag only guiding principles, which need runtime evidence`);
    }
  }
  return p;
}

/** Validation problems for every tag in a task (empty = all resolve). */
export function principleProblems(task, catalog) {
  const byId = new Map(catalog.principles.map((p) => [p.id, p]));
  const p = [];
  for (const s of task.verify ?? []) p.push(...problemsForList(s.principles, `verify step "${s.id}"`, byId));
  for (const [name, sc] of Object.entries(task.scenarios)) {
    p.push(...problemsForList(sc.principles, `scenario "${name}"`, byId));
    for (const s of sc.steps) p.push(...problemsForList(s.principles, `scenario "${name}" step "${s.id}"`, byId));
    for (const s of sc.verify ?? []) p.push(...problemsForList(s.principles, `scenario "${name}" verify step "${s.id}"`, byId));
  }
  return p;
}

/** Resolve ids to the fields a report needs. Unknown ids are dropped (validation rejects them earlier). */
export function resolvePrinciples(ids, catalog) {
  if (!catalog || !ids?.length) return [];
  const byId = new Map(catalog.principles.map((p) => [p.id, p]));
  return [...new Set(ids)]
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => ({ id: p.id, title: p.title, source: { kind: p.source?.kind, name: p.source?.name, url: p.source?.url ?? null, ref: p.source?.ref ?? null } }));
}

/**
 * Which principles this run gathered evidence for: every tagged principle,
 * with the steps tagged with it and the findings that carry it. Ordered by
 * first appearance (scenario tags first, then steps, then verification).
 *
 * @param {{ entries: any[], findings: any[], verification?: any, scenarioPrinciples?: string[], catalog: any }} p
 * @returns {any[]}
 */
export function summarizePrinciples({ entries, findings, verification, scenarioPrinciples = [], catalog }) {
  if (!catalog) return [];
  const order = [];
  const steps = new Map();
  const note = (id, stepId) => {
    if (!steps.has(id)) {
      steps.set(id, []);
      order.push(id);
    }
    if (stepId && !steps.get(id).includes(stepId)) steps.get(id).push(stepId);
  };
  for (const id of scenarioPrinciples) note(id, null);
  // A skipped conditional step never ran, so it is not evidence.
  for (const e of entries) if (e.outcome !== 'skipped') for (const id of e.principles ?? []) note(id, e.stepId);
  for (const a of verification?.assertions ?? []) for (const id of a.principles ?? []) note(id, a.stepId);
  return resolvePrinciples(order, catalog).map((p) => ({
    ...p,
    steps: steps.get(p.id),
    findings: findings.filter((f) => f.principles?.some((x) => x.id === p.id)).map((f) => f.id),
  }));
}
