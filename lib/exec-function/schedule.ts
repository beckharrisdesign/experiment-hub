/**
 * Which assessment is "today's".
 *
 * The rotation is a pure function of the calendar date, not stored state. That
 * matters for two reasons: the daily email and the page it links to have to
 * agree without a handshake, and re-opening the link later in the same day has
 * to land on the same task rather than a freshly drawn one.
 */

import type { CorsiCondition } from "./corsi";

export type ModuleId = "corsi" | "n-back" | "self-report";

export interface Assignment {
  module: ModuleId;
  /** Only set for Corsi. */
  condition?: CorsiCondition;
  label: string;
  /** Where the daily link points. */
  href: string;
  /** Rough minutes, for the email and the start screen. */
  estimatedMinutes: number;
}

/**
 * A seven-day cycle of *suggested* blocks. Corsi forward, Corsi backward and
 * n-back are each suggested twice a week, the self-report once. This names the
 * day's suggestion; what a track will actually accept is its own minimum
 * interval (`Track.minIntervalDays`), which is what the dashboard gates on.
 *
 * The questionnaire is the odd one out because it asks about the past week, so
 * running it more often would give consecutive scores an overlapping referent
 * period and flatten the trend by construction. (Until 2026-08-27 this comment
 * claimed a one-month window; no window was stated on the form at all, and the
 * form now asks about the past week.)
 */
const CYCLE: Assignment[] = [
  { module: "corsi", condition: "forward", label: "Corsi — forward", href: "/exec-function-assessment/corsi?condition=forward", estimatedMinutes: 6 },
  { module: "n-back", label: "Adaptive n-back", href: "/exec-function-assessment/n-back", estimatedMinutes: 8 },
  { module: "corsi", condition: "backward", label: "Corsi — backward", href: "/exec-function-assessment/corsi?condition=backward", estimatedMinutes: 6 },
  { module: "n-back", label: "Adaptive n-back", href: "/exec-function-assessment/n-back", estimatedMinutes: 8 },
  { module: "corsi", condition: "forward", label: "Corsi — forward", href: "/exec-function-assessment/corsi?condition=forward", estimatedMinutes: 6 },
  { module: "corsi", condition: "backward", label: "Corsi — backward", href: "/exec-function-assessment/corsi?condition=backward", estimatedMinutes: 6 },
  { module: "self-report", label: "Everyday check-in", href: "/exec-function-assessment/self-report", estimatedMinutes: 5 },
];

export const CYCLE_LENGTH = CYCLE.length;

/** Days between two YYYY-MM-DD keys, counted on the proleptic Gregorian calendar. */
function daysSinceEpoch(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  // Date.UTC sidesteps DST entirely: the key already names a calendar day, so
  // there is no local-midnight to be ambiguous about.
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The assessment assigned to a given calendar day. */
export function assignmentFor(dayKey: string): Assignment {
  const index = ((daysSinceEpoch(dayKey) % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  return CYCLE[index];
}

/**
 * The calendar day, in the timezone the schedule runs on.
 *
 * The cron fires in UTC but the "day" a result belongs to is the local one —
 * a session at 9pm Eastern would otherwise be filed under tomorrow. Set
 * EFA_TIMEZONE to an IANA zone; UTC is the fallback, not a recommendation.
 */
export function dayKeyFor(date: Date, timeZone: string = "UTC"): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the key shape.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The n calendar days ending at `dayKey`, oldest first. */
export function recentDayKeys(dayKey: string, count: number): string[] {
  const end = daysSinceEpoch(dayKey);
  return Array.from({ length: count }, (_, i) => {
    const ms = (end - (count - 1 - i)) * 86_400_000;
    return new Date(ms).toISOString().slice(0, 10);
  });
}

/**
 * Consecutive days with at least one completed session, counting back from
 * `dayKey`. Today not being done yet does not break the streak — it is only
 * broken by a day that has fully passed with nothing logged.
 */
export function currentStreak(
  completedDayKeys: Iterable<string>,
  dayKey: string,
): number {
  const done = new Set(completedDayKeys);
  const today = daysSinceEpoch(dayKey);
  let streak = 0;
  // Start at yesterday if today is still open, so an unfinished today reads as
  // "streak intact", not "streak broken".
  let cursor = done.has(dayKey) ? today : today - 1;
  while (done.has(new Date(cursor * 86_400_000).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}
