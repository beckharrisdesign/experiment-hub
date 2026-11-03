/**
 * Per-caller and per-instance rate limits for Estate Sale Planner routes (the same shape
 * `/api/comps` uses inline). In memory, per serverless instance: a bound on abuse, not a
 * guarantee. The tracked-caller map is capped so it never grows without bound.
 */
const WINDOW_MS = 60_000;
const MAX_TRACKED = 500;

export function makeThrottle(perCaller: number, perInstance: number) {
  const hits = new Map<string, number[]>();
  let instanceHits: number[] = [];
  return function throttled(caller: string, now = Date.now()): boolean {
    instanceHits = instanceHits.filter((t) => now - t < WINDOW_MS);
    if (hits.size > MAX_TRACKED) {
      for (const [key, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
      for (const key of hits.keys()) {
        if (hits.size <= MAX_TRACKED) break;
        hits.delete(key);
      }
    }
    const recent = (hits.get(caller) ?? []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    hits.set(caller, recent);
    instanceHits.push(now);
    return recent.length > perCaller || instanceHits.length > perInstance;
  };
}
