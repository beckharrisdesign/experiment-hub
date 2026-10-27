"use client";

import { useRef } from "react";
import { Button, Callout, Field, Input, Stack } from "@beckharrisdesign/mvds";
import ButtonGroup from "./ButtonGroup";

interface CaptureProps {
  busy: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  onFiles: (files: File[]) => void;
  /** "new" starts a sale; "append" adds photos to the one in context. */
  mode?: "new" | "append";
  /** The sale's name, in append mode. */
  saleName?: string;
  /** Draft name for a new sale (optional, "Mom's house"). */
  name?: string;
  onName?: (name: string) => void;
  /** City or ZIP for a new sale (optional). */
  location?: string;
  onLocation?: (location: string) => void;
  /** New sale only: start it empty and add items by hand or photos later. */
  onStartEmpty?: () => void;
}

/**
 * The camera screen (round 05a — photos, not video). One primary action:
 * add photos. The hidden input takes `multiple` and no `capture`, so a phone offers its camera or
 * its library and every shot is one frame to the model. Founder, 2026-10-15: "stick to images - a
 * live camera instead of video since that adds complexity out of the gate."
 */
export default function Capture({ busy, progress, error, onFiles, mode = "new", saleName, name = "", onName, location = "", onLocation, onStartEmpty }: CaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const append = mode === "append";

  return (
    <Stack gap={32}>
      <Stack gap={8}>
        {append ? (
          <>
            <h1 className="text-h1 text-foreground">Add photos to {saleName?.trim() || "this sale"}</h1>
            <p className="max-w-prose text-body-lg text-muted-foreground">
              Take a few more photos, or pick them from your library. What the model finds joins the items you already have; it is told what is listed so it does not repeat them.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-h1 text-foreground md:text-display">What&apos;s worth keeping?</h1>
            <p className="max-w-prose text-body-lg text-muted-foreground">
              Take a few wide shots, then anything you wonder about. You&apos;ll get a short list of what might be worth something and a quick way to sort the rest. Add more photos later, over as many days as it takes.
            </p>
          </>
        )}
      </Stack>

      {!append && onName && (
        <Field label="Name this sale">
          <Input value={name} maxLength={60} placeholder="Mom's house" onChange={(e) => onName(e.target.value)} />
        </Field>
      )}
      {!append && onLocation && (
        <Field label="City or ZIP">
          <Input value={location} maxLength={40} placeholder="Ithaca, NY or 14850" autoComplete="postal-code" onChange={(e) => onLocation(e.target.value)} />
        </Field>
      )}

      {/* One button for camera and library (founder, 2026-10-27: "really wordy and long for basically
          one button"). No `capture` attribute, so a phone offers Take Photo or Photo Library. */}
      {!append && onStartEmpty ? (
        <ButtonGroup>
          <Button size="lg" variant="secondary" disabled={busy} onClick={onStartEmpty}>
            Start without photos
          </Button>
          <Button size="lg" disabled={busy} onClick={() => cameraRef.current?.click()} data-analytics-event="esp_capture_open">
            {busy ? "Preparing your photos…" : "Add photos"}
          </Button>
        </ButtonGroup>
      ) : (
        <div className="flex justify-center">
          <Button size="lg" disabled={busy} onClick={() => cameraRef.current?.click()} data-analytics-event="esp_capture_open">
            {busy ? "Preparing your photos…" : "Add photos"}
          </Button>
        </div>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Add photos"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
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
