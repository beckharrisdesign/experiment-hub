"use client";

import { Button, Inline } from "@beckharrisdesign/mvds";
import { DESTINATIONS, type Destination } from "../../lib/estate-sale-planner/session";

interface DestinationToggleProps {
  value?: Destination;
  onChange: (next: Destination) => void;
  size?: "sm" | "default";
  label?: string;
}

const LABELS: Record<Destination, string> = { keep: "Keep", sell: "Sell", donate: "Donate" };

/**
 * The per-item toggle: keep, sell, donate — the only three destinations, and
 * every item can move between them any time. The active one is the filled
 * button; `aria-pressed` carries the state for assistive tech.
 */
export default function DestinationToggle({ value, onChange, size = "sm", label }: DestinationToggleProps) {
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
