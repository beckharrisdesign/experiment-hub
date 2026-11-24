/*
 * The action ledger and the counting rules (README § Counting rules).
 *
 *  - One click, selection, check, key press, tab switch, or full field entry
 *    = one action. A field value counts once, not per keystroke.
 *  - Waits, assertions, reads, screenshots, setup, verify, and cleanup never
 *    count. Scrolling is recorded separately, not as an action.
 *  - A conditional step counts only when its condition was met and it ran.
 *  - Recovery-phase actions are counted apart from path actions.
 *  - Repeated entry and context switches are counted ONLY from reviewed
 *    annotations; the runner does not discover them on its own.
 */
import { COUNTED_ACTIONS } from './config.mjs';

export function describeTarget(t) {
  if (!t) return '';
  const base = t.role
    ? (t.name ? `${t.role} "${t.name}"` : t.role)
    : t.label
      ? `field "${t.label}"`
      : t.text
        ? `text "${t.text}"`
        : t.testId
          ? `[data-testid=${t.testId}]`
          : t.placeholder
            ? `placeholder "${t.placeholder}"`
            : `css ${t.css}`;
  return t.within ? `${base} in ${describeTarget(t.within)}` : base;
}

export function stepKind(step) {
  if (COUNTED_ACTIONS.includes(step.do)) return 'action';
  if (step.do === 'scroll') return 'scroll';
  if (step.do === 'read') return 'read';
  if (step.do === 'waitFor') return 'wait';
  if (step.do === 'screenshot') return 'screenshot';
  if (['goto', 'reload'].includes(step.do)) return 'navigation';
  if (step.do === 'httpJson') return 'state-check';
  return 'assertion';
}

export function createLedger({ onChange } = {}) {
  const entries = [];
  return {
    entries,
    /**
     * Append an entry; `counted` is derived from the rules, never passed in.
     * @param {{ step: any, phase: string, outcome: string, at?: number, value?: string,
     *   error?: string, screenshot?: string | null, page?: string, conditional?: any }} p
     */
    record({ step, phase, outcome, value, error, screenshot, page, at, conditional }) {
      const kind = stepKind(step);
      const countablePhase = ['path', 'error-induction', 'recovery'].includes(phase);
      const entry = {
        index: entries.length,
        stepId: step.id,
        do: step.do,
        phase,
        kind,
        counted: kind === 'action' && countablePhase && outcome === 'done',
        outcome,
        target: describeTarget(step.target) || (step.to ? `page "${step.to}"` : step.path ?? ''),
        ...(value !== undefined ? { value } : {}),
        ...(page ? { page } : {}),
        ...(step.annotations ? { annotations: step.annotations } : {}),
        ...(step.mutates ? { mutates: step.mutates } : {}),
        ...(conditional ? { conditional } : {}),
        ...(step.note ? { note: step.note } : {}),
        ...(screenshot ? { screenshot } : {}),
        ...(error ? { error } : {}),
        atMs: at,
      };
      entries.push(entry);
      onChange?.(entries);
      return entry;
    },
  };
}

function bucket(entries) {
  return {
    actions: entries.filter((e) => e.counted).length,
    repeatedEntryFields: entries.filter((e) => e.counted && e.annotations?.repeatedEntry).length,
    contextSwitches: entries.filter((e) => e.counted && e.annotations?.contextSwitch).length,
  };
}

/** Comparable metrics from a ledger. Duration is NOT here — it is diagnostic only. */
export function computeMetrics(entries) {
  const path = entries.filter((e) => e.phase === 'path' || e.phase === 'error-induction');
  const recovery = entries.filter((e) => e.phase === 'recovery');
  return {
    path: bucket(path),
    recovery: bucket(recovery),
    conditional: {
      performed: entries.filter((e) => e.conditional?.performed === true).length,
      skipped: entries.filter((e) => e.conditional?.performed === false).length,
    },
    scrolls: entries.filter((e) => e.kind === 'scroll' && e.outcome === 'done').length,
  };
}

export const METRIC_LABELS = {
  'path.actions': 'Required actions (reviewed path)',
  'path.repeatedEntryFields': 'Repeated-entry fields (annotated)',
  'path.contextSwitches': 'Context switches (annotated)',
  'recovery.actions': 'Recovery actions',
  'recovery.repeatedEntryFields': 'Recovery repeated-entry fields',
  'recovery.contextSwitches': 'Recovery context switches',
  'conditional.performed': 'Conditional interactions performed',
  scrolls: 'Scrolls (not counted as actions)',
};

/** Flatten metrics to { 'path.actions': n, … } for comparison tables. */
export function flattenMetrics(m) {
  const out = {};
  for (const key of Object.keys(METRIC_LABELS)) {
    const [a, b] = key.split('.');
    out[key] = b ? m[a][b] : m[a];
  }
  return out;
}
