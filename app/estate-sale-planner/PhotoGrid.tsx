"use client";

import { Button, Grid, Stack } from "@beckharrisdesign/mvds";
import type { CapturedFrame } from "../../lib/estate-sale-planner/capture";

interface PhotoGridProps {
  /** The sale these photos join (or the name typed for a new one). */
  saleName?: string;
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
/** "Add to the 2027 Jumble Sale?" — never "…Sale sale?"; a new unnamed sale is "a new sale". */
export function addToSaleTitle(saleName?: string): string {
  const name = saleName?.trim();
  if (!name) return "Add to a new sale?";
  return /\bsale$/i.test(name) ? `Add to the ${name}?` : `Add to the ${name} sale?`;
}

export default function PhotoGrid({ photos, sending, onSend, onRemove, onBack, saleName }: PhotoGridProps) {
  return (
    <Stack gap={32}>
      <Stack gap={8}>
        <h1 className="text-h2 text-foreground">
          {addToSaleTitle(saleName)}
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
          {sending ? "Looking at your photos…" : `Add ${photos.length} ${photos.length === 1 ? "photo" : "photos"}`}
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
