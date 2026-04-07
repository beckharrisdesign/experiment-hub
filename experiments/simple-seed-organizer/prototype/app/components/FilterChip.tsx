"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

// ─── Variants ────────────────────────────────────────────────────────────────
// plain         – white bg, gray border + text (unselected filter, no icon)
// plain-icon    – white bg, gray border + text + leading icon (unselected)
// selected      – green bg, white text + leading icon (active filter)
// badge         – warm-orange tint bg + text (status badge, non-interactive)
// ─────────────────────────────────────────────────────────────────────────────

export type FilterChipVariant = "plain" | "plain-icon" | "selected" | "badge";

export interface FilterChipClassOptions {
  variant?: FilterChipVariant;
  /** When true, overrides variant styling with the "selected" (green) appearance */
  selected?: boolean;
  disabled?: boolean;
  hasIcon?: boolean;
}

export interface FilterChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  variant?: FilterChipVariant;
  /** Text label rendered inside the chip */
  label: string;
  /**
   * Icon rendered to the left of the label.
   * Accepts any ReactNode (SVG, img, etc.).
   * Ignored when variant is "badge".
   */
  icon?: ReactNode;
  /** When true, renders with the active/selected (green) style */
  selected?: boolean;
  /** Disabled state: reduces opacity and blocks interaction */
  disabled?: boolean;
  /** Pass-through className for layout overrides */
  className?: string;
}

const BASE =
  "inline-flex items-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors px-3 py-1.5 select-none";

const VARIANT_CLASSES: Record<FilterChipVariant, string> = {
  plain:
    "bg-white text-[#6a7282] border border-[#e5e7eb] hover:border-[#16a34a] hover:text-[#16a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-1",
  "plain-icon":
    "bg-white text-[#6a7282] border border-[#e5e7eb] hover:border-[#16a34a] hover:text-[#16a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-1",
  selected:
    "bg-[#16a34a] text-white border border-[#16a34a] hover:bg-[#15803d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-1",
  badge:
    "bg-[#fff7ed] text-[#f54900] border border-[#fed7aa] cursor-default pointer-events-none",
};

const DISABLED_CLASSES = "opacity-50 cursor-not-allowed pointer-events-none";

/**
 * Returns the full Tailwind class string for a chip.
 * Useful for testing or rendering chips outside of JSX.
 */
export function getFilterChipClasses({
  variant = "plain",
  selected = false,
  disabled = false,
  hasIcon = false,
}: FilterChipClassOptions): string {
  const resolvedVariant: FilterChipVariant = selected
    ? "selected"
    : hasIcon && variant !== "badge"
      ? "plain-icon"
      : variant;

  return [
    BASE,
    VARIANT_CLASSES[resolvedVariant],
    disabled ? DISABLED_CLASSES : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function FilterChip({
  variant = "plain",
  label,
  icon,
  selected = false,
  disabled = false,
  className = "",
  ...rest
}: FilterChipProps) {
  const isBadge = variant === "badge";
  const showIcon = !isBadge && icon != null;

  const classes = [
    getFilterChipClasses({ variant, selected, disabled, hasIcon: showIcon }),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Badges are purely presentational <span>s, not interactive
  if (isBadge) {
    return (
      <span className={classes} aria-label={label}>
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected || variant === "selected"}
      className={classes}
      {...rest}
    >
      {showIcon && (
        <span
          className="w-4 h-4 shrink-0 flex items-center justify-center"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}
