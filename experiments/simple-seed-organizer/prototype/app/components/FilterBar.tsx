'use client';

import { SeedType } from '@/types/seed';

interface FilterBarProps {
  activeType?: SeedType | 'all' | 'use-first';
  onTypeChange: (type: SeedType | 'all' | 'use-first') => void;
}

export function FilterBar({ activeType = 'all', onTypeChange }: FilterBarProps) {
  const filters: { id: SeedType | 'all' | 'use-first'; label: string; icon?: React.ReactNode }[] = [
    {
      id: 'all',
      label: 'All',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'use-first',
      label: 'Use First',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
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

  return (
    <div 
      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onTypeChange(filter.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeType === filter.id
              ? 'bg-[#16a34a] text-white'
              : 'bg-white text-[#6a7282] border border-gray-200 hover:border-[#16a34a]'
          }`}
        >
          {filter.icon && filter.icon}
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
  );
}

