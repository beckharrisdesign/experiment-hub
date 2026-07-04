"use client";

import { useState } from "react";
import type { ExperimentStatus } from "@/types";

const STATUSES: ExperimentStatus[] = [
  "Active",
  "Completed",
  "Abandoned",
  "On Hold",
  "Archived",
];

const STATUS_COLORS: Record<ExperimentStatus, string> = {
  Active: "text-green-400",
  Completed: "text-blue-400",
  Abandoned: "text-text-secondary",
  "On Hold": "text-yellow-400",
  Archived: "text-text-secondary",
};

interface StatusSelectProps {
  experimentId: string;
  initialStatus: ExperimentStatus;
}

export default function StatusSelect({
  experimentId,
  initialStatus,
}: StatusSelectProps) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: ExperimentStatus) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/experiments/id/${experimentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setStatus(next);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Save failed");
      }
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value as ExperimentStatus)}
        className={`bg-transparent border border-border-dark rounded px-2 py-1 text-sm focus:outline-none focus:border-accent-primary disabled:opacity-50 ${STATUS_COLORS[status]}`}
      >
        {STATUSES.map((s) => (
          <option
            key={s}
            value={s}
            className="bg-background-secondary text-text-primary"
          >
            {s}
          </option>
        ))}
      </select>
      {saving && (
        <span aria-live="polite" className="text-xs text-text-secondary">
          Saving…
        </span>
      )}
      {error && (
        <span
          role="alert"
          aria-live="assertive"
          className="text-xs text-red-400"
        >
          {error}
        </span>
      )}
    </div>
  );
}
