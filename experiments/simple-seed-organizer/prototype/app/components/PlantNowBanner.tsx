"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Seed } from "@/types/seed";
import { getPlantingNow, groupByAction } from "@/lib/plantingNow";

interface PlantNowBannerProps {
  seeds: Seed[];
}

const DISMISS_KEY = "plant-now-banner-dismissed";
const DISMISS_DAYS = 3; // re-show after 3 days

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = new Date(raw);
    return new Date() < until;
  } catch {
    return false;
  }
}

function dismiss(): void {
  try {
    const until = new Date();
    until.setDate(until.getDate() + DISMISS_DAYS);
    localStorage.setItem(DISMISS_KEY, until.toISOString());
  } catch (err) {
    console.warn("Failed to save banner dismiss state:", err);
  }
}

export function PlantNowBanner({ seeds }: PlantNowBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  const result = useMemo(() => getPlantingNow(seeds), [seeds]);

  if (dismissed || !result.hasZone) return null;

  const nowGroups = groupByAction(result.nowItems);
  const upcomingGroups = groupByAction(result.upcomingItems);

  if (nowGroups.length === 0 && upcomingGroups.length === 0) return null;

  const handleDismiss = () => {
    dismiss();
    setDismissed(true);
  };

  const seedLabel = (seeds: Seed[]) =>
    seeds
      .slice(0, 3)
      .map((s) => s.variety || s.name)
      .join(", ") + (seeds.length > 3 ? ` +${seeds.length - 3} more` : "");

  return (
    <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] p-4 mb-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-[#6a7282] hover:text-[#4a5565] transition-colors"
        aria-label="Dismiss"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="flex items-center gap-2 mb-3 pr-6">
        <svg
          className="w-4 h-4 text-[#16a34a] shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 2.12 13.38 1 12 1S9.5 2.12 9.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25z" />
        </svg>
        <span className="text-sm font-semibold text-[#166534]">
          Plant this week
        </span>
      </div>

      <div className="space-y-1.5">
        {nowGroups.map((group) => (
          <div key={group.action} className="flex items-baseline gap-2 text-sm">
            <span className="font-medium text-[#166534] shrink-0">
              {group.label}:
            </span>
            <span className="text-[#4a5565]">{seedLabel(group.seeds)}</span>
          </div>
        ))}

        {upcomingGroups.length > 0 && (
          <div className="pt-1 mt-1 border-t border-[#bbf7d0]">
            <span className="text-xs text-[#6a7282]">
              Coming up:{" "}
              {upcomingGroups
                .flatMap((g) => g.seeds)
                .slice(0, 4)
                .map((s) => s.variety || s.name)
                .join(", ")}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={() => router.push("/?view=type")}
        className="mt-3 text-xs font-medium text-[#16a34a] hover:text-[#15803d] transition-colors"
      >
        View collection →
      </button>
    </div>
  );
}
