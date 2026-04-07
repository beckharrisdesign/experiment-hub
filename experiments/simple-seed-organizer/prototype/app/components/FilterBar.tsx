"use client";

import { ReactNode } from "react";
import { SeedType } from "@/types/seed";
import { FilterChip } from "@/components/FilterChip";

interface FilterBarProps {
  activeType?: SeedType | "all" | "use-first";
  onTypeChange: (type: SeedType | "all" | "use-first") => void;
  /** Filter types to render as disabled (grayed out, non-interactive) */
  disabledTypes?: Array<SeedType | "all" | "use-first">;
  /** Override the default icon for any filter type */
  iconOverrides?: Partial<Record<SeedType | "all" | "use-first", ReactNode>>;
}

const IconAll = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 10h16M4 14h16M4 18h16"
    />
  </svg>
);

const IconClock = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

type FilterItem = {
  id: SeedType | "all" | "use-first";
  label: string;
  defaultIcon?: ReactNode;
};

const FILTERS: FilterItem[] = [
  { id: "all", label: "All", defaultIcon: <IconAll /> },
  { id: "use-first", label: "Use First", defaultIcon: <IconClock /> },
  { id: "vegetable", label: "Vegetables" },
  { id: "herb", label: "Herbs" },
  { id: "flower", label: "Flowers" },
  { id: "fruit", label: "Fruits" },
];

export function FilterBar({
  activeType = "all",
  onTypeChange,
  disabledTypes = [],
  iconOverrides = {},
}: FilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {FILTERS.map((filter) => {
        const isActive = activeType === filter.id;
        const isDisabled = disabledTypes.includes(filter.id);
        const icon = iconOverrides[filter.id] ?? filter.defaultIcon;

        return (
          <FilterChip
            key={filter.id}
            label={filter.label}
            icon={icon}
            selected={isActive}
            disabled={isDisabled}
            onClick={() => onTypeChange(filter.id)}
            aria-label={`Filter seeds by ${filter.label}`}
          />
        );
      })}
    </div>
  );
}
