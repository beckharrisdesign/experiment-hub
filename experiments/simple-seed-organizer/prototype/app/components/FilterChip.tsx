'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

// ─── Variants ────────────────────────────────────────────────────────────────
// plain         – white bg, gray border + text (unselected filter, no icon)
// plain-icon    – white bg, gray border + text + leading icon (unselected)
// selected      – green bg, white text + leading icon (active filter)
// badge         – warm-orange tint bg + text (status badge, non-interactive)
// ─────────────────────────────────────────────────────────────────────────────

export type FilterChipVariant = 'plain' | 'plain-icon' | 'selected' | 'badge';

export interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: FilterChipVariant;
  /** Text label rendered inside the chip */
  label: string;
  /**
   * Icon rendered to the left of the label.
   * Accepts any ReactNode (SVG, img, etc.).
   * Ignored when variant is "badge".
   */
  icon?: ReactNode;
  /** Disabled state: reduces opacity and blocks interaction */
  disabled?: boolean;
  /** Pass-through className for layout overrides */
  className?: string;
}

// Map each variant to its Tailwind class set
const BASE = 'inline-flex items-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors px-3 py-1.5 select-none';

const VARIANT_CLASSES: Record<FilterChipVariant, string> = {
  plain:
    'bg-white text-[#6a7282] border border-[#e5e7eb] hover:border-[#16a34a] hover:text-[#16a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-1',
  'plain-icon':
    'bg-white text-[#6a7282] border border-[#e5e7eb] hover:border-[#16a34a] hover:text-[#16a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-1',
  selected:
    'bg-[#16a34a] text-white border border-[#16a34a] hover:bg-[#15803d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-1',
  badge:
    'bg-[#fff7ed] text-[#f54900] border border-[#fed7aa] cursor-default pointer-events-none',
};

const DISABLED_CLASSES = 'opacity-40 cursor-not-allowed pointer-events-none';

export function FilterChip({
  variant = 'plain',
  label,
  icon,
  disabled = false,
  className = '',
  ...rest
}: FilterChipProps) {
  const isBadge = variant === 'badge';
  const showIcon = !isBadge && icon != null;

  const classes = [
    BASE,
    VARIANT_CLASSES[variant],
    disabled ? DISABLED_CLASSES : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

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
      aria-pressed={variant === 'selected'}
      className={classes}
      {...rest}
    >
      {showIcon && (
        <span className="w-4 h-4 shrink-0 flex items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}
