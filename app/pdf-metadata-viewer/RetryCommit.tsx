"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";

/** Retry for a failed commit in Needs attention: the same per-document commit, again. */
export function RetryCommit({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  });

  async function retry() {
    setState({ busy: true, error: null });
    try {
      const res = await fetch(`/api/pdf-documents/id/${documentId}/commit`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setState({ busy: false, error: body.error ?? "Still not written. Your edits are kept." });
      } else {
        setState({ busy: false, error: null });
      }
    } catch {
      setState({ busy: false, error: "Could not reach the server. Your edits are kept." });
    }
    // Success clears the instance; a new failure replaces it. Either way, redraw.
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" className="min-h-11" disabled={state.busy} onClick={() => void retry()}>
        {state.busy ? "Retrying…" : "Retry"}
      </Button>
      {state.error ? (
        <span role="alert" className="max-w-64 text-right text-xs text-warning">
          {state.error}
        </span>
      ) : null}
    </div>
  );
}
