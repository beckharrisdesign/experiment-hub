"use client";

import { Button, Grid, Stack } from "@beckharrisdesign/mvds";
import type { CapturedFrame } from "../../lib/estate-sale-planner/capture";

interface PhotoGridProps {
  photos: CapturedFrame[];
  sending: boolean;
  onSend: () => void;
  onRemove: (id: string) => void;
  onBack: () => void;
}

/**
 * Confirm before anything leaves the phone. Every photo you took is here;
 * drop a blurry one with its ×. Send is the first network request in the flow.
 */
export default function PhotoGrid({ photos, sending, onSend, onRemove, onBack }: PhotoGridProps) {
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <h1 className="text-h2 text-foreground">
          Send {photos.length === 1 ? "this photo" : `these ${photos.length} photos`}?
        </h1>
        <p className="max-w-prose text-body-lg text-muted-foreground">
          These are the views the model will look at. Nothing has been sent yet. Tap × to leave one out.
        </p>
      </Stack>

      <Grid cols={{ base: 3, md: 6 }} gap={8}>
        {photos.map((p, i) => (
          <div key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-md object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-background/90 text-small text-foreground shadow ring-1 ring-foreground/15"
              aria-label={`Leave out photo ${i + 1}`}
              disabled={sending}
              onClick={() => onRemove(p.id)}
            >
              ×
            </button>
          </div>
        ))}
      </Grid>

      <div className="flex justify-center">
        <Button size="lg" disabled={sending || photos.length === 0} onClick={onSend} data-analytics-event="esp_frames_confirmed">
          {sending ? "Looking at the room…" : "Send and flag what's worth something"}
        </Button>
      </div>
      <div className="flex justify-center">
        <Button variant="ghost" disabled={sending} onClick={onBack}>
          Retake
        </Button>
      </div>
    </Stack>
  );
}
