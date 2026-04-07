import { getViabilityStatus } from '@/lib/viability';
import { SeedPill } from '@/components/SeedPill';

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
      <SeedPill as="span" variant="badge" tone="attention" size="sm">
        Use first
      </SeedPill>
    );
  }

  if (status === 'watch') {
    return (
      <SeedPill as="span" variant="badge" tone="warning" size="sm">
        2 yrs
      </SeedPill>
    );
  }

  return null;
}
