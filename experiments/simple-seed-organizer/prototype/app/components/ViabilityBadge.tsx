import { getSeedAgeYears, getViabilityStatus } from "@/lib/viability";
import { SeedPill } from "@/components/SeedPill";

interface ViabilityBadgeProps {
  year: number | undefined;
  /** Crop name used for crop-specific viability thresholds (e.g. seed.name) */
  cropName?: string;
}

/**
 * Compact badge for seed list cards.
 * Shows nothing for good/unknown — only surfaces seeds that need attention.
 *
 *   watch     → amber  "{age} yr(s)"
 *   use-first → red    "Use first"
 */
export function ViabilityBadge({ year, cropName }: ViabilityBadgeProps) {
  const status = getViabilityStatus(year, undefined, cropName);
  const age = getSeedAgeYears(year);

  if (status === "use-first") {
    return (
      <SeedPill as="span" variant="badge" tone="attention" size="sm">
        Use first
      </SeedPill>
    );
  }

  if (status === "watch") {
    return (
      <SeedPill as="span" variant="badge" tone="warning" size="sm">
        {age} {age === 1 ? "yr" : "yrs"}
      </SeedPill>
    );
  }

  return null;
}
