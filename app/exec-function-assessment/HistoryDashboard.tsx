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
  type ModuleSummary,
} from "@/lib/exec-function/sessions";
import TrendChart from "./components/TrendChart";

/**
 * The history summary.
 *
 * Three charts, one per module, and no combined number. The three instruments
 * measure different constructs on incomparable scales; a composite would move
 * for reasons you could not attribute back to anything, which is the opposite
 * of what a measurement tool is for.
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
  const doneToday = sessions.some((s) => s.dayKey === today);
  const streak = currentStreak(completedDayKeys(sessions), today);

  return (
    <Stack gap={32}>
      <Card>
        <CardHeader>
          <Inline gap={8} align="center" justify="between">
            <CardTitle>Today — {assignment.label}</CardTitle>
            {streak > 0 && (
              <Badge variant="muted">
                {streak} day{streak === 1 ? "" : "s"} in a row
              </Badge>
            )}
          </Inline>
        </CardHeader>
        <CardContent>
          <Stack gap={16}>
            <p className="text-sm text-muted-foreground">
              {doneToday
                ? "Done for today. You can run it again — every session is logged."
                : `One block, about ${assignment.estimatedMinutes} minutes.`}
            </p>
            <Inline gap={8}>
              <Button asChild variant={doneToday ? "outline" : "default"}>
                <Link href={assignment.href}>
                  {doneToday ? "Run it again" : "Start today's block"}
                </Link>
              </Button>
            </Inline>
          </Stack>
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
            <ModuleCard key={summary.module} summary={summary} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function formatDelta(delta: number, direction: ModuleSummary["meta"]["direction"]): string {
  if (delta === 0) return "no change";
  const better = direction === "lower is better" ? delta < 0 : delta > 0;
  return `${delta > 0 ? "+" : ""}${delta} vs. previous (${better ? "better" : "worse"})`;
}

function ModuleCard({ summary }: { summary: ModuleSummary }) {
  const { meta, latest, latestDelta, best, sessionCount } = summary;

  return (
    <Card>
      <CardHeader>
        <Inline gap={8} align="center" justify="between">
          <CardTitle>{meta.label}</CardTitle>
          <Badge variant="muted">
            {sessionCount} session{sessionCount === 1 ? "" : "s"}
          </Badge>
        </Inline>
        <p className="mt-1 text-sm text-muted-foreground">{meta.headlineLabel}</p>
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
                    ? "first in this series"
                    : formatDelta(latestDelta, meta.direction)}
                </dd>
              </div>
            </dl>
          )}

          <TrendChart
            series={summary.series}
            valueLabel={meta.headlineLabel}
            direction={meta.direction}
          />

          {sessionCount > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Session table
              </summary>
              <table className="mt-2 w-full text-left">
                <caption className="sr-only">{meta.label} sessions</caption>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="py-1 font-medium">Date</th>
                    {meta.variants.length > 1 && (
                      <th scope="col" className="py-1 font-medium">Condition</th>
                    )}
                    <th scope="col" className="py-1 font-medium">{meta.headlineLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.series
                    .flatMap((series) =>
                      series.points.map((point) => ({ ...point, label: series.label })),
                    )
                    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                    .map((point) => (
                      <tr key={point.sessionId} className="border-t border-border">
                        <td className="py-1">{point.dayKey}</td>
                        {meta.variants.length > 1 && <td className="py-1">{point.label}</td>}
                        <td className="py-1 text-foreground">{point.value}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </details>
          )}

          <Inline gap={8}>
            <Button asChild variant="outline" size="sm">
              <Link href={meta.href}>Run {meta.label}</Link>
            </Button>
          </Inline>
        </Stack>
      </CardContent>
    </Card>
  );
}
