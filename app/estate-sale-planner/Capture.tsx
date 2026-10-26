"use client";

import { useRef } from "react";
import { Button, Callout, Dropzone, Field, Input, Stack } from "@beckharrisdesign/mvds";
import { PHOTO_BUDGET } from "../../lib/estate-sale-planner/config";

interface CaptureProps {
  busy: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  onFiles: (files: File[]) => void;
  /** "new" starts a sale; "append" adds a room to the one in context. */
  mode?: "new" | "append";
  /** The sale's name, in append mode. */
  saleName?: string;
  /** Draft name for a new sale (optional, "Mom's house"). */
  name?: string;
  onName?: (name: string) => void;
}

/**
 * The camera screen (round 05a — photos, not video). One primary action:
 * photograph the room. The hidden input carries `capture="environment"` and
 * `multiple`, so a phone opens its camera and every shot is one frame to the
 * model; the Dropzone is the pick-from-library and desktop path. Founder,
 * 2026-10-15: "stick to images - a live camera instead of video since that adds
 * complexity out of the gate."
 */
export default function Capture({ busy, progress, error, onFiles, mode = "new", saleName, name = "", onName }: CaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const append = mode === "append";
  const label = append ? "Photograph another room" : "Photograph a room";

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        {append ? (
          <>
            <h1 className="text-h1 text-foreground">Add a room to {saleName?.trim() || "this sale"}</h1>
            <p className="max-w-prose text-body-lg text-muted-foreground">
              Take a few photos of the next room, or pick them from your library. What the model finds joins the items you already have; it is told what is listed so it does not repeat them.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-h1 text-foreground md:text-display">What&apos;s worth keeping?</h1>
            <p className="max-w-prose text-body-lg text-muted-foreground">
              Photograph the house one room at a time — a few wide shots, then anything you wonder about. You&apos;ll get a short list of what might be worth something and a quick way to sort the rest. Add rooms later, over as many days as it takes.
            </p>
          </>
        )}
      </Stack>

      {!append && onName && (
        <Field label="Name this sale" help="Optional. Shows on Home and on the sell sheet.">
          <Input value={name} maxLength={60} placeholder="Mom's house" onChange={(e) => onName(e.target.value)} />
        </Field>
      )}

      <div className="flex justify-center">
        <Button size="lg" disabled={busy} onClick={() => cameraRef.current?.click()} data-analytics-event="esp_capture_open">
          {busy ? "Preparing your photos…" : label}
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />

      <Dropzone
        accept="image/*"
        multiple
        disabled={busy}
        label={append ? "Or pick photos of the room" : "Or pick photos of each room"}
        hint={`Up to ${PHOTO_BUDGET.maxPhotos} photos a pass. Nothing leaves your phone until you say so.`}
        onFilesSelected={(files) => files.length && onFiles(files)}
      />

      {progress && (
        <p className="text-small text-muted-foreground" aria-live="polite">
          Preparing photos: {progress.done} of {progress.total}
        </p>
      )}

      {error && <Callout>{error}</Callout>}

      <p className="text-caption text-muted-foreground">
        Value bands are a model&apos;s guess with a confidence, never an appraisal. Nothing here is advice for insurance, tax, or probate.
      </p>
    </Stack>
  );
}
