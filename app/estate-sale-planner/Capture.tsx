"use client";

import { useRef } from "react";
import { Button, Callout, Dropzone, Field, Inline, Input, Stack } from "@beckharrisdesign/mvds";

interface CaptureProps {
  busy: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  onFiles: (files: File[]) => void;
  /** "new" starts a walkthrough; "append" adds a room to the active one. */
  mode?: "new" | "append";
  /** The active walkthrough's name, in append mode. */
  sessionName?: string;
  /** Draft name for a new walkthrough (optional, "Mom's house"). */
  name?: string;
  onName?: (name: string) => void;
  /** Append mode: back to the lists without filming. */
  onCancel?: () => void;
  /** Append mode: abandon the active walkthrough (it stays in history) and start fresh. */
  onNewWalkthrough?: () => void;
}

/**
 * Screen 1 — one primary action: film. In "new" mode it starts a walkthrough
 * (optionally named); in "append" mode it adds a room to the active one, and
 * what comes back joins the same lists. The hidden input carries
 * `capture="environment"` so a phone opens its camera; Dropzone below is the
 * pick-a-file path (a saved video, or photos) and the desktop path.
 */
export default function Capture({ busy, progress, error, onFiles, mode = "new", sessionName, name = "", onName, onCancel, onNewWalkthrough }: CaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const append = mode === "append";
  const label = append ? "Film another room" : "Film a walkthrough";

  return (
    <Stack gap={24}>
      {append && onCancel && (
        <Inline gap={8} align="center">
          <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Back to the lists">
            ← Back to the lists
          </Button>
        </Inline>
      )}
      <Stack gap={8}>
        {append ? (
          <>
            <p className="text-caption uppercase tracking-wider text-muted-foreground">Add a room</p>
            <h1 className="text-h1 text-foreground">Add a room to {sessionName ?? "this walkthrough"}</h1>
            <p className="max-w-prose text-body-lg text-muted-foreground">
              Film the next room, or pick its photos. What the model finds joins the lists you already have; it is told what is listed so it does not repeat it.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-h1 text-foreground md:text-display">What&apos;s worth keeping?</h1>
            <p className="max-w-prose text-body-lg text-muted-foreground">
              Walk through the house with your phone, one room at a time. You&apos;ll get a short
              list of what might be worth something, and a quick way to sort the rest. You can
              add rooms later, over as many days as it takes.
            </p>
          </>
        )}
      </Stack>

      {!append && onName && (
        <Field label="Name this walkthrough" help="Optional. Shows up in your history and on the sell sheet.">
          <Input value={name} maxLength={60} placeholder="Mom's house" onChange={(e) => onName(e.target.value)} />
        </Field>
      )}

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          data-analytics-event="esp_capture_open"
        >
          {busy ? "Reading your walkthrough…" : label}
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="sr-only"
        aria-label={label}
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
        label={append ? "Or pick a video, or photos of the room" : "Or pick a video, or photos of each room"}
        hint="Nothing leaves your phone until you say so."
        onFilesSelected={(files) => files.length && onFiles(files)}
      />

      {progress && (
        <p className="text-small text-muted-foreground" aria-live="polite">
          Sampling frames: {progress.done} of {progress.total}
        </p>
      )}

      {error && <Callout>{error}</Callout>}

      {append && onNewWalkthrough && (
        <p className="text-center text-small text-muted-foreground">
          Different house?{" "}
          <button type="button" className="underline" onClick={onNewWalkthrough}>
            Start a new walkthrough instead
          </button>
          . This one stays in your history.
        </p>
      )}

      <p className="text-caption text-muted-foreground">
        Value bands are a model&apos;s guess with a confidence, never an appraisal. Nothing
        here is advice for insurance, tax, or probate.
      </p>
    </Stack>
  );
}
