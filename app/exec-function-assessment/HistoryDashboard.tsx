"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Inline,
  Stack,
} from "@beckharrisdesign/mvds";
import {
  captureAccessKey,
  loadSessions,
  type LoadResult,
} from "@/lib/exec-function/client-store";
import {
  assignmentFor,
  currentStreak,
  dayKeyFor,
} from "@/lib/exec-function/schedule";
import {
  completedDayKeys,
  summarizeAll,
  trackAvailability,
  trackFor,
  TRACKS,
  type TrackAvailability,
  type TrackSummary,
} from "@/lib/exec-function/sessions";
import TrendChart from "./components/TrendChart";

/**
 * The history summary.
 *
 * One card per track, and no combined number. The instruments measure different
 * constructs on incomparable scales; a composite would move for reasons you
 * could not attribute back to anything, which is the opposite of what a
 * measurement tool is for.
 */
export default function HistoryDashboard() {
  const [state, setState] = useState<LoadResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    captureAccessKey();
    let cancelled = false;
    loadSessions().then((loaded) => {
      if (!cancelled) {
        setState(loaded);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sessions = useMemo(() => state?.sessions ?? [], [state]);
  const summaries = useMemo(() => summarizeAll(sessions), [sessions]);

  const today = dayKeyFor(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  const assignment = assignmentFor(today);
  const todaysSessions = sessions.filter((s) => s.dayKey === today);
  const doneToday = todaysSessions.length > 0;
  const streak = currentStreak(completedDayKeys(sessions), today);

  // Availability is per track. Finishing one measure says nothing about
  // whether another is due, so the page keeps offering the ones that are.
  // Four tracks and a list scan — not worth memoizing, and the manual memo it
  // replaced blocked the React Compiler from optimizing the component at all.
  const availability = new Map<string, TrackAvailability>();
  for (const track of TRACKS) {
    availability.set(track.id, trackAvailability(track, sessions, today));
  }
  const dueCount = TRACKS.filter((track) => availability.get(track.id)?.due).length;

  // Name what was actually completed, not what the schedule assigned — running
  // a different task than the one assigned still counts, and reporting the
  // assignment back would be simply wrong on that day.
  const doneLabels = Array.from(
    new Set(
      todaysSessions.map(
        (s) => trackFor(s.module, s.variant)?.label ?? s.module,
      ),
    ),
  );

  return (
    <Stack gap={32}>
      <Card>
        <CardHeader>
          <Inline gap={8} align="center" justify="between" wrap>
            <CardTitle>
              {doneToday ? "That's today's block done" : `Today — ${assignment.label}`}
            </CardTitle>
            {streak > 0 && (
              <Badge variant="success">
                {streak} day{streak === 1 ? "" : "s"} in a row
              </Badge>
            )}
          </Inline>
        </CardHeader>
        <CardContent>
          {doneToday ? (
            // The day's assigned block is done — which is not the same as the
            // day being over. Each track card below offers itself if it is due;
            // the guard against re-rolling a bad run lives per track, not here.
            <Inline gap={16} align="center">
              <span aria-hidden="true" className="text-3xl text-success">
                ✓
              </span>
              <p className="text-sm text-muted-foreground">
                {doneLabels.join(" and ")} logged.{" "}
                {dueCount > 0
                  ? `${dueCount} other measure${dueCount === 1 ? " is" : "s are"} available today.`
                  : "Nothing else is due today."}
              </p>
            </Inline>
          ) : (
            <Stack gap={16}>
              <p className="text-sm text-muted-foreground">
                One block, about {assignment.estimatedMinutes} minutes.
              </p>
              <Inline gap={8}>
                <Button asChild size="lg" className="min-h-12 px-6">
                  <Link href={assignment.href}>Start today&rsquo;s block</Link>
                </Button>
              </Inline>
            </Stack>
          )}
        </CardContent>
      </Card>

      {state?.tier === "local" && (
        <Callout>
          <strong className="font-medium">Showing this device only.</strong>{" "}
          {state.reason}. Sessions taken on another device are not included here.
        </Callout>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your history…</p>
      ) : (
        <Stack gap={24}>
          {summaries.map((summary) => (
            <TrackCard
              key={summary.track.id}
              summary={summary}
              availability={availability.get(summary.track.id)}
              today={today}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/**
 * Clock time the session was recorded, in the reader's own zone.
 *
 * The table only renders after the client fetch, so there is no server render
 * of these rows to disagree with.
 */
function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 1 -> "1st", 2 -> "2nd". Only ever shown for 2 and above. */
function ordinalLabel(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "tomorrow" while that is true, then the plain date — a countdown adds nothing. */
function whenDue(nextDueDayKey: string, todayKey: string): string {
  const day = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  };
  return day(nextDueDayKey) - day(todayKey) === 1 ? "tomorrow" : nextDueDayKey;
}

/** Truncated rather than rounded, so a run is never reported as longer than it was. */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

function formatDelta(delta: number, direction: TrackSummary["track"]["direction"]): string {
  if (delta === 0) return "no change";
  const better = direction === "lower is better" ? delta < 0 : delta > 0;
  return `${delta > 0 ? "+" : ""}${delta} vs. previous (${better ? "better" : "worse"})`;
}

function TrackCard({
  summary,
  availability,
  today,
}: {
  summary: TrackSummary;
  availability: TrackAvailability | undefined;
  today: string;
}) {
  const { track, latest, latestDelta, best, sessionCount, points } = summary;
  const hasLaterSession = points.some((point) => point.ordinalInDay > 1);

  return (
    <Card>
      <CardHeader>
        <Inline gap={8} align="center" justify="between" wrap>
          <CardTitle>{track.label}</CardTitle>
          <Badge variant="muted">
            {sessionCount} session{sessionCount === 1 ? "" : "s"}
          </Badge>
        </Inline>
        <p className="mt-1 text-sm text-muted-foreground">{track.headlineLabel}</p>
      </CardHeader>

      <CardContent>
        <Stack gap={16}>
          {availability &&
            (availability.due ? (
              <Inline gap={8}>
                <Button asChild size="lg" className="min-h-12 px-6">
                  <Link href={track.href}>Start {track.label}</Link>
                </Button>
              </Inline>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run {availability.lastDayKey === today ? "today" : `on ${availability.lastDayKey}`}.
                {availability.nextDueDayKey
                  ? ` Next due ${whenDue(availability.nextDueDayKey, today)}.`
                  : ""}
              </p>
            ))}
          {latest && (
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Latest</dt>
                <dd className="text-2xl font-semibold text-foreground">{latest.headline}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Best</dt>
                <dd className="text-2xl font-semibold text-foreground">{best}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Change</dt>
                <dd className="text-sm text-muted-foreground">
                  {latestDelta === null
                    ? "first session"
                    : formatDelta(latestDelta, track.direction)}
                </dd>
              </div>
            </dl>
          )}

          <TrendChart
            points={points}
            valueLabel={track.headlineLabel}
            direction={track.direction}
          />

          {sessionCount > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer py-2 text-muted-foreground hover:text-foreground">
                Session table
              </summary>
              {/*
                Date and Time are mixed strings and stay left; Duration, the
                trial count and the measure are magnitudes read by comparison,
                so they align right along with their headers. Column widths are
                left to the table — the same five columns and labels appear at
                every breakpoint, and letting content size them avoids the
                clipping that fixed widths would risk below 480px.
              */}
              <table className="mt-2 w-full text-left">
                <caption className="sr-only">{track.label} sessions</caption>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="py-2 font-medium">Date</th>
                    <th scope="col" className="py-2 font-medium">Time</th>
                    <th scope="col" className="py-2 text-right font-medium">Duration</th>
                    {track.countLabel && (
                      <th scope="col" className="py-2 text-right font-medium">
                        {track.countLabel}
                      </th>
                    )}
                    <th scope="col" className="py-2 text-right font-medium">
                      {track.headlineLabel}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...points]
                    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                    .map((point) => (
                      <tr key={point.sessionId} className="border-t border-border">
                        <td className="whitespace-nowrap py-2">{point.dayKey}</td>
                        <td className="whitespace-nowrap py-2">
                          {formatTime(point.timestamp)}
                          {point.ordinalInDay > 1 && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({ordinalLabel(point.ordinalInDay)})
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2 text-right">
                          {formatDuration(point.durationMs)}
                        </td>
                        {track.countLabel && (
                          <td className="whitespace-nowrap py-2 text-right">
                            {point.count ?? "—"}
                          </td>
                        )}
                        <td className="whitespace-nowrap py-2 text-right text-foreground">
                          {point.value}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {hasLaterSession && (
                <p className="mt-2 text-xs text-muted-foreground">
                  ({ordinalLabel(2)}) — not that day&rsquo;s first session; an earlier
                  task may have tired you.
                </p>
              )}
            </details>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
