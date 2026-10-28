"use client";

import { useRef } from "react";
import { Button, Inline, cn } from "@beckharrisdesign/mvds";
import { DESTINATIONS, type Destination } from "../../lib/estate-sale-planner/session";

interface DestinationToggleProps {
  value?: Destination;
  onChange: (next: Destination) => void;
  size?: "sm" | "default";
  label?: string;
  /** "segmented" is the full-width single-select control on the item screen (sold-comps D16). */
  variant?: "buttons" | "segmented";
}

const LABELS: Record<Destination, string> = { keep: "Keep", sell: "Sell", donate: "Donate" };

/**
 * The per-item toggle: sell, donate, keep — the only three destinations, and
 * every item can move between them any time.
 *
 * - "buttons" (lists, cards): three small buttons, `aria-pressed` on the active one.
 * - "segmented" (item screen, founder 2026-10-27: "a full width set of three toggles where
 *   you can clearly only select one"): one radio group, equal segments, arrow keys move the
 *   selection, only the checked segment is in the tab order. No subhead. Built on MVDS tokens;
 *   an MVDS SegmentedControl hand-off candidate.
 */
export default function DestinationToggle({ value, onChange, size = "sm", label, variant = "buttons" }: DestinationToggleProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  if (variant === "segmented") {
    const current = value ? DESTINATIONS.indexOf(value) : -1;
    const move = (from: number, step: number) => {
      const next = (from + step + DESTINATIONS.length) % DESTINATIONS.length;
      onChange(DESTINATIONS[next]);
      refs.current[next]?.focus();
    };
    return (
      <div role="radiogroup" aria-label={label ?? "Where is this headed?"} className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-muted p-1">
        {DESTINATIONS.map((d, i) => {
          const checked = value === d;
          return (
            <button
              key={d}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (current === -1 && i === 0) ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(d);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(current === -1 ? i : current, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(current === -1 ? i : current, -1);
                }
              }}
              className={cn(
                "h-11 rounded-md text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                checked ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {LABELS[d]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Inline gap={4} align="center" role="group" aria-label={label ?? "Where is this headed?"}>
      {DESTINATIONS.map((d) => (
        <Button
          key={d}
          size={size}
          variant={value === d ? "default" : "outline"}
          aria-pressed={value === d}
          onClick={(e) => {
            e.stopPropagation();
            onChange(d);
          }}
        >
          {LABELS[d]}
        </Button>
      ))}
    </Inline>
  );
}
