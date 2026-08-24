"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Inline, Layer, Stack } from "@beckharrisdesign/mvds";

/**
 * Shown the moment a session is logged.
 *
 * There is deliberately no "run it again" here. The schedule assigns one block
 * a day; offering a replay would let a bad run be re-rolled until it looked
 * better, and a trend built from best-of-N attempts measures persistence, not
 * the thing the task is for.
 *
 * The score is stated plainly with no interpretation — the congratulation is
 * for showing up, which is the only part that is a choice.
 */
export interface CompletionOverlayProps {
  open: boolean;
  taskLabel: string;
  metricLabel: string;
  metricValue: number | string;
  /** Dismiss to read the full breakdown underneath. */
  onDismiss: () => void;
}

export default function CompletionOverlay({
  open,
  taskLabel,
  metricLabel,
  metricValue,
  onDismiss,
}: CompletionOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and focus moves into the dialog so a keyboard user is not
  // left tabbing through the page behind the scrim.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <Layer level="modal" className="flex items-center justify-center p-4">
      {/* Scrim. Clicking it dismisses, matching the button. */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onDismiss}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="efa-complete-title"
        className="relative w-full max-w-sm"
      >
        <Card>
          <CardContent>
            <Stack gap={24} align="center" className="py-4 text-center">
              <span aria-hidden="true" className="text-5xl">
                ✓
              </span>

              <Stack gap={8} align="center">
                <h2 id="efa-complete-title" className="text-2xl font-semibold text-foreground">
                  That&rsquo;s today done
                </h2>
                <p className="text-sm text-muted-foreground">
                  {taskLabel} is logged. Nothing else to do today.
                </p>
              </Stack>

              <Stack gap={4} align="center">
                <span className="text-xs text-muted-foreground">{metricLabel}</span>
                <span className="text-4xl font-semibold text-foreground">{metricValue}</span>
              </Stack>

              <Inline gap={8} justify="center" wrap className="w-full">
                <Button asChild size="lg" className="min-h-12 w-full">
                  <Link href="/exec-function-assessment">See your history</Link>
                </Button>
                <Button
                  ref={closeRef}
                  variant="ghost"
                  size="lg"
                  className="min-h-12 w-full"
                  onClick={onDismiss}
                >
                  View this session&rsquo;s detail
                </Button>
              </Inline>
            </Stack>
          </CardContent>
        </Card>
      </div>
    </Layer>
  );
}
