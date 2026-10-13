"use client";

import { Button, Grid, Stack } from "@beckharrisdesign/mvds";
import type { CapturedFrame } from "../../lib/estate-sale-planner/capture";

interface FrameGridProps {
  frames: CapturedFrame[];
  sending: boolean;
  onSend: () => void;
  onBack: () => void;
}

/**
 * Screen 2 — confirm before anything leaves the phone. The grid is the
 * evidence that the sampler kept the right views; Send is the first network
 * request in the flow.
 */
export default function FrameGrid({ frames, sending, onSend, onBack }: FrameGridProps) {
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <h1 className="text-h2 text-foreground">Send these {frames.length} frames?</h1>
        <p className="max-w-prose text-body-lg text-muted-foreground">
          These are the views we&apos;ll look at. Nothing has been sent yet.
        </p>
      </Stack>

      <Grid cols={{ base: 3, md: 6 }} gap={8}>
        {frames.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.id}
            src={f.preview}
            alt={`Frame ${i + 1}`}
            className="aspect-square w-full rounded-md object-cover"
          />
        ))}
      </Grid>

      <div className="flex justify-center">
        <Button size="lg" disabled={sending} onClick={onSend} data-analytics-event="esp_frames_confirmed">
          {sending ? "Looking at the house…" : "Send and flag what's worth something"}
        </Button>
      </div>
      <div className="flex justify-center">
        <Button variant="ghost" disabled={sending} onClick={onBack}>
          Start over
        </Button>
      </div>
    </Stack>
  );
}
