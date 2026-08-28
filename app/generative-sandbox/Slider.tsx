'use client';

/**
 * Parameter slider.
 *
 * MVDS Core has no Slider component — image-lab hit the same gap and composed
 * one from Radix. Here it is a native range input instead: adding
 * @radix-ui/react-slider would mean regenerating pnpm-lock.yaml, and a range
 * input gives the same commit-on-release behaviour for free (`onChange` while
 * dragging, `onPointerUp`/`onKeyUp` to commit) plus keyboard support by default.
 *
 * Two consumers have now worked around the same gap — see the follow-up in the
 * change's tasks.md proposing Slider be added to MVDS proper.
 */
export function Slider({
  value,
  min,
  max,
  step,
  onValueChange,
  onValueCommit,
  label,
  id,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  onValueCommit: () => void;
  label: string;
  id: string;
}) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(e) => onValueChange(Number(e.target.value))}
      onPointerUp={onValueCommit}
      onKeyUp={onValueCommit}
      className="h-4 w-full cursor-pointer accent-primary"
    />
  );
}
