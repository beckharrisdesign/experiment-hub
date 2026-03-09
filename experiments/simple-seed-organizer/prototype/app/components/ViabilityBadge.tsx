import { getViabilityStatus } from '@/lib/viability';

interface ViabilityBadgeProps {
  year: number | undefined;
}

/**
 * Compact badge for seed list cards.
 * Shows nothing for good/unknown — only surfaces seeds that need attention.
 *
 *   watch     (2 yrs)  → amber  "2 yrs"
 *   use-first (3+ yrs) → red    "Use first"
 */
export function ViabilityBadge({ year }: ViabilityBadgeProps) {
  const status = getViabilityStatus(year);

  if (status === 'use-first') {
    return (
      <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded whitespace-nowrap">
        Use first
      </span>
    );
  }

  if (status === 'watch') {
    return (
      <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded whitespace-nowrap">
        2 yrs
      </span>
    );
  }

  return null;
}
