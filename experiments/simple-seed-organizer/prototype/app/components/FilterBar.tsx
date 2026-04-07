'use client';

import { SeedType } from '@/types/seed';
import { FilterChip } from '@/components/FilterChip';

interface FilterBarProps {
  activeType?: SeedType | 'all' | 'use-first';
  onTypeChange: (type: SeedType | 'all' | 'use-first') => void;
}

// SVG icons kept co-located so they are swappable without touching the chip
const IconAll = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const IconClock = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

type FilterItem = {
  id: SeedType | 'all' | 'use-first';
  label: string;
  icon?: React.ReactNode;
};

const FILTERS: FilterItem[] = [
  { id: 'all',        label: 'All',        icon: <IconAll /> },
  { id: 'use-first',  label: 'Use First',  icon: <IconClock /> },
  { id: 'vegetable',  label: 'Vegetables' },
  { id: 'herb',       label: 'Herbs' },
  { id: 'flower',     label: 'Flowers' },
  { id: 'fruit',      label: 'Fruits' },
];

export function FilterBar({ activeType = 'all', onTypeChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {FILTERS.map((filter) => {
        const isActive = activeType === filter.id;
        const hasIcon = filter.icon != null;

        // Determine which Figma variant maps to each state:
        //   active + icon  → selected   (green filled, white text + icon)
        //   inactive + icon → plain-icon (white, gray, icon)
        //   inactive, no icon → plain   (white, gray, no icon)
        const variant = isActive
          ? 'selected'
          : hasIcon
          ? 'plain-icon'
          : 'plain';

        return (
          <FilterChip
            key={filter.id}
            variant={variant}
            label={filter.label}
            icon={filter.icon}
            onClick={() => onTypeChange(filter.id)}
            aria-label={filter.label}
          />
        );
      })}
    </div>
  );
}

