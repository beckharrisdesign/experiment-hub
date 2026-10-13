"use client";

import { useRef } from "react";
import { Button, Callout, Dropzone, Stack } from "@beckharrisdesign/mvds";

interface CaptureProps {
  busy: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  onFiles: (files: File[]) => void;
}

/**
 * Screen 1 — one primary action: film a walkthrough. The hidden input carries
 * `capture="environment"` so a phone opens its camera; Dropzone below is the
 * pick-a-file path (a saved video, or photos) and the desktop path.
 */
export default function Capture({ busy, progress, error, onFiles }: CaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <h1 className="text-3xl font-semibold text-foreground">What&apos;s worth keeping?</h1>
        <p className="max-w-prose text-muted-foreground">
          Walk through the house with your phone, one room at a time. You&apos;ll get a short
          list of what might be worth something, and a quick way to sort the rest.
        </p>
      </Stack>

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          data-analytics-event="esp_capture_open"
        >
          {busy ? "Reading your walkthrough…" : "Film a walkthrough"}
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="sr-only"
        aria-label="Film a walkthrough"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />

      <Dropzone
        accept="video/*,image/*"
        multiple
        disabled={busy}
        label="Or pick a video, or photos of each room"
        hint="Nothing leaves your phone until you say so."
        onFilesSelected={(files) => files.length && onFiles(files)}
      />

      {progress && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Sampling frames: {progress.done} of {progress.total}
        </p>
      )}

      {error && <Callout>{error}</Callout>}

      <p className="text-sm text-muted-foreground">
        Value bands are a model&apos;s guess with a confidence, never an appraisal. Nothing
        here is advice for insurance, tax, or probate.
      </p>
    </Stack>
  );
}
