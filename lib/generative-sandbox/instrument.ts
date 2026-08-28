/**
 * Measurement intent from the parent Propose, made concrete.
 *
 * - time from open to first visible result → the leading indicator, and what
 *   decides whether Build Unit 5 (prefix caching) ever starts.
 * - reorder / toggle counts → the composition threshold. If a stack is only ever
 *   tuned and never rearranged, composition was not the unlock (kill criterion).
 *
 * Console-only for now: n = 1, and a metrics pipeline for one user would be
 * ceremony the sandbox is supposed to avoid.
 */
type Event = 'reorder' | 'toggle' | 'param' | 'first-result';

const counts: Record<string, number> = {};
let opened = typeof performance !== 'undefined' ? performance.now() : 0;
let firstResultLogged = false;

export function markOpened() {
  opened = performance.now();
  firstResultLogged = false;
}

export function record(event: Event) {
  counts[event] = (counts[event] ?? 0) + 1;
  if (event === 'first-result' && !firstResultLogged) {
    firstResultLogged = true;
    const ms = Math.round(performance.now() - opened);
    console.info(`[sandbox] time to first visible result: ${ms}ms`);
    return;
  }
  console.info(`[sandbox] ${event} (${counts[event]} this session)`);
}

export function snapshot(): Record<string, number> {
  return { ...counts };
}
