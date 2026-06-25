"use client";

import { useState } from "react";
import type { ExperimentPullRequest, PullRequestState } from "@/types";

const STATE_LABELS: Record<PullRequestState, string> = {
  open: "Open",
  closed: "Closed",
  merged: "Merged",
};

const STATE_COLORS: Record<PullRequestState, string> = {
  open: "bg-green-500/10 text-green-700 border-green-500/20",
  merged: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  closed: "bg-gray-400/10 text-gray-600 border-gray-400/20",
};

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PullRequestsListProps {
  slug: string;
  initialPullRequests: ExperimentPullRequest[];
  isEditor: boolean;
}

export default function PullRequestsList({
  slug,
  initialPullRequests,
  isEditor,
}: PullRequestsListProps) {
  const [prs, setPrs] = useState<ExperimentPullRequest[]>(initialPullRequests);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function syncFromGitHub() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/experiments/${slug}/pull-requests/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Sync failed");
      }
      const data = await res.json();
      setPrs(data.pullRequests ?? []);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-[0.01em] text-text-dark">
          Pull Requests
        </h2>
        {isEditor && (
          <button
            onClick={syncFromGitHub}
            disabled={syncing}
            className="text-xs px-3 py-1.5 rounded border border-border-dark text-text-dark hover:bg-background-secondary transition-colors disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync from GitHub"}
          </button>
        )}
      </div>

      {syncError && <p className="text-xs text-red-600 mb-3">{syncError}</p>}

      {prs.length === 0 ? (
        <p className="text-sm text-text-dark-secondary">
          {isEditor ? (
            <>
              No pull requests synced yet. Click <em>Sync from GitHub</em> to
              fetch PRs referencing this experiment.
            </>
          ) : (
            "No pull requests."
          )}
        </p>
      ) : (
        <ul className="space-y-2">
          {prs.map((pr) => (
            <li
              key={pr.id}
              className="border border-border-dark rounded p-4 bg-background-secondary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${STATE_COLORS[pr.state]}`}
                    >
                      {STATE_LABELS[pr.state]}
                    </span>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-text-dark hover:text-accent-primary transition-colors truncate"
                    >
                      {pr.title}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-dark-secondary">
                    <span>#{pr.prNumber}</span>
                    {pr.author && <span>by {pr.author}</span>}
                    {pr.openedAt && (
                      <span>opened {formatDate(pr.openedAt)}</span>
                    )}
                    {pr.mergedAt && (
                      <span>merged {formatDate(pr.mergedAt)}</span>
                    )}
                  </div>
                </div>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-text-dark-secondary hover:text-text-dark transition-colors"
                  aria-label={`Open PR #${pr.prNumber} on GitHub`}
                >
                  ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
