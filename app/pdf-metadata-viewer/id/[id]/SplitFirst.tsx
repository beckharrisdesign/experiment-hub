"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";

/**
 * "Is this more than one document?", for a long scan nobody has touched — Figma
 * `02.17`, frame 88:546. openspec/changes/pdf-metadata-viewer-cloud — task 7i.
 */

interface SplitFirstProps {
  documentId: string;
  pageCount: number;
  splitUrl: string;
}

export default function SplitFirst({ documentId, pageCount, splitUrl }: SplitFirstProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function oneDocument() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pdf-documents/id/${documentId}/split/not-needed`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Not saved. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Nothing changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-5 mt-5 flex flex-col gap-3 rounded-lg bg-background-primary p-4">
      <h2 className="text-sm font-semibold text-text-primary">
        {pageCount} pages. Is this more than one document?
      </h2>
      <p className="text-sm text-muted-foreground">
        Long scans often hold several. Nothing is prefilled until you split it, or say it&apos;s one document.
      </p>
      {error ? (
        <p role="alert" className="text-xs text-warning">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" className="min-h-11" disabled={busy} onClick={() => void oneDocument()}>
          {busy ? "Saving…" : "It's one document"}
        </Button>
        <Button asChild className="min-h-11">
          <a href={splitUrl}>Split pages</a>
        </Button>
      </div>
    </div>
  );
}
