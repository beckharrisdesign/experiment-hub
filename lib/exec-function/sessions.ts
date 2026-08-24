/**
 * The shape every module's result takes once it leaves the task and enters the
 * log, plus the summary maths the history page reads.
 *
 * Each module keeps its own metrics in `detail` and contributes one `headline`
 * number — the single value its trend chart plots. There is deliberately no
 * cross-module composite: the three instruments measure different things on
 * incomparable scales, and averaging them would produce a number that moves
 * for reasons you could not attribute.
 */

import type { CorsiSession } from "./corsi";
import type { NBackSession } from "./nback";
import type { SelfReportSession } from "./self-report";
import type { ModuleId } from "./schedule";

export interface StoredSession {
  id: string;
  module: ModuleId;
  /** Distinguishes series within a module — Corsi's forward vs backward. */
  variant: string | null;
  /** ISO 8601 instant the session finished. */
  timestamp: string;
  /** Calendar day the session counts toward, in the schedule's timezone. */
  dayKey: string;
  durationMs: number;
  /** The number this module's trend chart plots. */
  headline: number;
  detail: CorsiSession | NBackSession | SelfReportSession;
}

export interface ModuleMeta {
  label: string;
  headlineLabel: string;
  /** Which direction on the chart is the better one, in plain words. */
  direction: "higher is better" | "lower is better";
  /** Series a module splits its history into, keyed by `variant`. */
  variants: { key: string | null; label: string }[];
  href: string;
}

export const MODULE_META: Record<ModuleId, ModuleMeta> = {
  corsi: {
    label: "Corsi block-tapping",
    headlineLabel: "Total Score",
    direction: "higher is better",
    variants: [
      { key: "forward", label: "Forward" },
      { key: "backward", label: "Backward" },
    ],
    href: "/exec-function-assessment/corsi",
  },
  "n-back": {
    label: "Adaptive n-back",
    headlineLabel: "Peak N",
    direction: "higher is better",
    variants: [{ key: null, label: "All sessions" }],
    href: "/exec-function-assessment/n-back",
  },
  "self-report": {
    label: "Everyday check-in",
    headlineLabel: "Composite (45-135)",
    direction: "lower is better",
    variants: [{ key: null, label: "All administrations" }],
    href: "/exec-function-assessment/self-report",
  },
};

export const MODULE_ORDER: ModuleId[] = ["corsi", "n-back", "self-report"];

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  dayKey: string;
  timestamp: string;
  value: number;
  sessionId: string;
}

export interface Series {
  variant: string | null;
  label: string;
  points: SeriesPoint[];
}

export interface ModuleSummary {
  module: ModuleId;
  meta: ModuleMeta;
  sessionCount: number;
  series: Series[];
  latest: StoredSession | null;
  /** Change from the previous session in the same series, if there is one. */
  latestDelta: number | null;
  best: number | null;
}

function ascendingByTime(a: { timestamp: string }, b: { timestamp: string }) {
  return a.timestamp.localeCompare(b.timestamp);
}

export function summarizeModule(
  module: ModuleId,
  sessions: readonly StoredSession[],
): ModuleSummary {
  const meta = MODULE_META[module];
  const mine = sessions.filter((s) => s.module === module).slice().sort(ascendingByTime);

  const series: Series[] = meta.variants.map((variant) => ({
    variant: variant.key,
    label: variant.label,
    points: mine
      .filter((s) => (variant.key === null ? true : s.variant === variant.key))
      .map((s) => ({
        dayKey: s.dayKey,
        timestamp: s.timestamp,
        value: s.headline,
        sessionId: s.id,
      })),
  }));

  const latest = mine.length > 0 ? mine[mine.length - 1] : null;

  let latestDelta: number | null = null;
  if (latest) {
    const sameSeries = mine.filter((s) => s.variant === latest.variant);
    if (sameSeries.length >= 2) {
      latestDelta = latest.headline - sameSeries[sameSeries.length - 2].headline;
    }
  }

  const values = mine.map((s) => s.headline);
  const best =
    values.length === 0
      ? null
      : meta.direction === "lower is better"
        ? Math.min(...values)
        : Math.max(...values);

  return { module, meta, sessionCount: mine.length, series, latest, latestDelta, best };
}

export function summarizeAll(sessions: readonly StoredSession[]): ModuleSummary[] {
  return MODULE_ORDER.map((module) => summarizeModule(module, sessions));
}

/** Distinct calendar days with at least one completed session. */
export function completedDayKeys(sessions: readonly StoredSession[]): string[] {
  return Array.from(new Set(sessions.map((s) => s.dayKey))).sort();
}
