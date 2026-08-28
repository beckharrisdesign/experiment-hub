'use client';

/**
 * Local slider composed from Radix, styled with MVDS tokens.
 *
 * MVDS Core has no Slider component — image-lab hit the same gap and solved it
 * the same way. Two consumers now; see tasks.md §5.2, which proposes promoting
 * Slider into MVDS proper rather than composing it a third time.
 */
import * as SliderPrimitive from '@radix-ui/react-slider';

export function Slider({
  value,
  min,
  max,
  step,
  onValueChange,
  onValueCommit,
  'aria-label': ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  onValueCommit: (value: number) => void;
  'aria-label': string;
}) {
  return (
    <SliderPrimitive.Root
      className="relative flex h-4 w-full touch-none select-none items-center"
      value={[value]}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onValueChange={([v]) => onValueChange(v)}
      onValueCommit={([v]) => onValueCommit(v)}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full border border-border bg-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </SliderPrimitive.Root>
  );
}
