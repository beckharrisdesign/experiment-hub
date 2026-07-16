"use client";

/**
 * Sync surface for the etsy-notion-sync experiment (openspec change:
 * etsy-notion-sync-build, task 3.5). Shows what synced and when from the
 * Supabase run log, and dispatches an on-demand run ("Sync now").
 *
 * MVDS components throughout per design.md — no raw flex/grid, no margin
 * classes, no hardcoded colors. Polls while a run is in flight; renders an
 * optimistic "queued" row between dispatch and the real run row appearing.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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

interface SyncRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  trigger_source: string;
  summary: {
    listings_captured?: number;
    new_fields?: unknown[];
    quota?: { remaining_today?: number; limit_per_day?: number };
    quota_low?: boolean;
    notion?: { updates?: number; dry_run?: boolean };
  } | null;
}

const POLL_MS = 5000;

type BadgeVariant = "default" | "success" | "destructive" | "muted" | "outline" | "neutral";

const STATUS_BADGE: Record<string, BadgeVariant> = {
  ok: "success",
  running: "default",
  queued: "default",
  paused_quota: "muted",
  error: "destructive",
};

function relativeTime(iso: string): string {
  const deltaSeconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (deltaSeconds < 60) return "just now";
  const minutes = Math.round(deltaSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function quotaLabel(run: SyncRun): string | null {
  const quota = run.summary?.quota;
  // remaining_today === 0 is the most important value to show (quota
  // exhausted), so only treat null/undefined as missing; a zero/absent
  // limit still bails (nothing meaningful to divide by).
  if (quota?.remaining_today == null || !quota.limit_per_day) return null;
  return `${Math.round((quota.remaining_today / quota.limit_per_day) * 100)}% quota left`;
}

export default function EtsySyncPanel() {
  const [runs, setRuns] = useState<SyncRun[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [queuedAt, setQueuedAt] = useState<string | null>(null);
  const latestRunIdAtDispatch = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/etsy-sync/runs");
      const body = await response.json();
      if (!response.ok) {
        setLoadError(body.error ?? "Failed to load sync runs");
        return;
      }
      setLoadError(null);
      setRuns(body.runs as SyncRun[]);
      // Clear the optimistic row once a newer real run shows up.
      if (
        queuedAt !== null &&
        (body.runs as SyncRun[]).some(
          (run) => run.id > (latestRunIdAtDispatch.current ?? 0),
        )
      ) {
        setQueuedAt(null);
      }
    } catch {
      setLoadError("Failed to reach the hub API");
    }
  }, [queuedAt]);

  useEffect(() => {
    load();
  }, [load]);

  const active =
    queuedAt !== null || (runs ?? []).some((run) => run.status === "running");

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [active, load]);

  async function syncNow() {
    setDispatching(true);
    setDispatchError(null);
    latestRunIdAtDispatch.current = runs?.[0]?.id ?? 0;
    try {
      const response = await fetch("/api/etsy-sync/dispatch", { method: "POST" });
      if (response.status === 401) {
        setDispatchError("Unauthorized — unlock edit mode to trigger a sync.");
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setDispatchError(body.error ?? "Dispatch failed");
        return;
      }
      setQueuedAt(new Date().toISOString());
    } catch {
      setDispatchError("Failed to reach the hub API");
    } finally {
      setDispatching(false);
    }
  }

  const lastRun = runs?.[0];

  return (
    <Card data-testid="etsy-sync-panel">
      <CardHeader>
        <Inline gap={16} align="center" justify="between">
          <CardTitle>Etsy → Notion sync</CardTitle>
          <Inline gap={8} align="center">
            {lastRun && !queuedAt && (
              <Badge variant={STATUS_BADGE[lastRun.status] ?? "neutral"}>
                last run {lastRun.status}
              </Badge>
            )}
            <Button onClick={syncNow} disabled={dispatching || active} size="sm">
              {active ? "Sync in progress…" : "Sync now"}
            </Button>
          </Inline>
        </Inline>
      </CardHeader>
      <CardContent>
        <Stack gap={16}>
          {dispatchError && <Callout>{dispatchError}</Callout>}
          {loadError && <Callout>{loadError}</Callout>}
          {lastRun?.summary?.quota_low && (
            <Callout>
              Last run paused early: Etsy daily quota fell below the safety floor.
              It resumes on the next scheduled cycle.
            </Callout>
          )}

          {runs === null && !loadError && (
            <p className="text-sm text-muted-foreground">Loading sync history…</p>
          )}

          {runs !== null && runs.length === 0 && !queuedAt && (
            <p className="text-sm text-muted-foreground">
              No runs yet — the daily schedule or a Sync now will create the first
              one. Setup lives in experiments/etsy-notion-sync/prototype/README.md.
            </p>
          )}

          <Stack gap={8}>
            {queuedAt && (
              <Inline gap={16} align="center" data-testid="queued-row">
                <Badge variant={STATUS_BADGE.queued}>queued</Badge>
                <span className="text-sm">{relativeTime(queuedAt)}</span>
                <span className="text-sm text-muted-foreground">
                  manual — waiting for the workflow to pick up
                </span>
              </Inline>
            )}
            {(runs ?? []).map((run) => (
              <Inline key={run.id} gap={16} align="center" wrap data-testid="run-row">
                <Badge variant={STATUS_BADGE[run.status] ?? "neutral"}>{run.status}</Badge>
                <span className="text-sm" title={run.started_at}>
                  {relativeTime(run.started_at)}
                </span>
                <span className="text-sm text-muted-foreground">{run.trigger_source}</span>
                <span className="text-sm">
                  {run.summary?.listings_captured ?? "—"} listings
                </span>
                <span className="text-sm">
                  {run.summary?.notion
                    ? `${run.summary.notion.updates ?? 0} Notion update${run.summary.notion.updates === 1 ? "" : "s"}${run.summary.notion.dry_run ? " (dry run)" : ""}`
                    : "— Notion"}
                </span>
                {(run.summary?.new_fields?.length ?? 0) > 0 && (
                  <Badge variant="outline">
                    {run.summary?.new_fields?.length} new field
                    {run.summary?.new_fields?.length === 1 ? "" : "s"}
                  </Badge>
                )}
                {quotaLabel(run) && (
                  <span className="text-sm text-muted-foreground">{quotaLabel(run)}</span>
                )}
              </Inline>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
