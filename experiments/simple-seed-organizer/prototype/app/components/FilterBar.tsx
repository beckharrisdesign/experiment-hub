'use client';

import { ReactNode } from 'react';
import { SeedType } from '@/types/seed';
import { SeedPill } from '@/components/SeedPill';

type FilterType = SeedType | 'all' | 'use-first';

interface FilterBarProps {
  activeType?: FilterType;
  onTypeChange: (type: FilterType) => void;
  disabledTypes?: FilterType[];
  iconOverrides?: Partial<Record<FilterType, ReactNode>>;
}

function AllSeedsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  );
}

function UseFirstIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

const filters: { id: FilterType; label: string; icon?: ReactNode }[] = [
  {
    id: 'all',
    label: 'All',
    icon: <AllSeedsIcon />,
  },
  {
    id: 'use-first',
    label: 'Use First',
    icon: <UseFirstIcon />,
  },
  {
    id: 'vegetable',
    label: 'Vegetables',
  },
  {
    id: 'herb',
    label: 'Herbs',
  },
  {
    id: 'flower',
    label: 'Flowers',
  },
  {
    id: 'fruit',
    label: 'Fruits',
  },
];

export function FilterBar({
  activeType = 'all',
  onTypeChange,
  disabledTypes = [],
  iconOverrides,
}: FilterBarProps) {

  return (
    <div 
      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {filters.map((filter) => {
        const isSelected = activeType === filter.id;
        const isDisabled = disabledTypes.includes(filter.id);
        const inactiveVariant = filter.icon ? 'filter-badge-icon' : 'filter-plain';
        const icon =
          iconOverrides && Object.prototype.hasOwnProperty.call(iconOverrides, filter.id)
            ? iconOverrides[filter.id]
            : filter.icon;

        return (
          <SeedPill
            key={filter.id}
            variant={isSelected ? 'filter-selected' : inactiveVariant}
            icon={icon}
            disabled={isDisabled}
            onClick={() => onTypeChange(filter.id)}
          >
            {filter.label}
          </SeedPill>
        );
      })}
    </div>
  );
}

