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
  trackFor,
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
              {doneToday ? "That's today done" : `Today — ${assignment.label}`}
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
            // No run button. One block a day is the schedule; a replay affordance
            // would let a bad run be re-rolled until it looked better.
            <Inline gap={16} align="center">
              <span aria-hidden="true" className="text-3xl text-success">
                ✓
              </span>
              <p className="text-sm text-muted-foreground">
                {doneLabels.join(" and ")} logged. Your next block arrives by
                email tomorrow.
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
            <TrackCard key={summary.track.id} summary={summary} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function formatDelta(delta: number, direction: TrackSummary["track"]["direction"]): string {
  if (delta === 0) return "no change";
  const better = direction === "lower is better" ? delta < 0 : delta > 0;
  return `${delta > 0 ? "+" : ""}${delta} vs. previous (${better ? "better" : "worse"})`;
}

function TrackCard({ summary }: { summary: TrackSummary }) {
  const { track, latest, latestDelta, best, sessionCount, points } = summary;

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
              <table className="mt-2 w-full text-left">
                <caption className="sr-only">{track.label} sessions</caption>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="py-2 font-medium">Date</th>
                    <th scope="col" className="py-2 font-medium">{track.headlineLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...points]
                    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                    .map((point) => (
                      <tr key={point.sessionId} className="border-t border-border">
                        <td className="py-2">{point.dayKey}</td>
                        <td className="py-2 text-foreground">{point.value}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </details>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
