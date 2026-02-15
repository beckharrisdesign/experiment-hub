'use client';

import { Seed, ViewMode } from '@/types/seed';
import { SeedCard } from './SeedCard';
import { SeedGallery } from './SeedGallery';
import { getSeedAge } from '@/lib/storage';

interface SeedListProps {
  seeds: Seed[];
  viewMode: ViewMode;
  onSeedClick: (seed: Seed) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TYPE_LABELS: Record<string, string> = {
  vegetable: 'Vegetables',
  herb: 'Herbs',
  flower: 'Flowers',
  fruit: 'Fruits',
  other: 'Other',
};

function groupByType(seeds: Seed[]): Record<string, Seed[]> {
  return seeds.reduce((acc, seed) => {
    const type = seed.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(seed);
    return acc;
  }, {} as Record<string, Seed[]>);
}

function groupByAge(seeds: Seed[]): Record<string, Seed[]> {
  const groups: Record<string, Seed[]> = {
    'Use First (3+ years)': [],
    '2 Years': [],
    '1 Year': [],
    'This Year': [],
    'Unknown': [],
  };

  seeds.forEach(seed => {
    const age = getSeedAge(seed);
    if (!seed.year) {
      groups['Unknown'].push(seed);
    } else if (age >= 3) {
      groups['Use First (3+ years)'].push(seed);
    } else if (age === 2) {
      groups['2 Years'].push(seed);
    } else if (age === 1) {
      groups['1 Year'].push(seed);
    } else {
      groups['This Year'].push(seed);
    }
  });

  return groups;
}

function groupByMonth(seeds: Seed[]): Record<string, Seed[]> {
  const groups: Record<string, Seed[]> = {};
  MONTHS.forEach(m => groups[m] = []);
  groups['No Month Set'] = [];

  seeds.forEach(seed => {
    if (seed.plantingMonths?.length) {
      seed.plantingMonths.forEach(m => {
        const monthName = MONTHS[m - 1];
        if (monthName) groups[monthName].push(seed);
      });
    } else {
      groups['No Month Set'].push(seed);
    }
  });

  return groups;
}

export function SeedList({ seeds, viewMode, onSeedClick }: SeedListProps) {
  // Photo gallery view - show seeds with front or back images as gallery cards
  if (viewMode === 'photo') {
    const seedsWithPhotos = seeds.filter(seed => seed.photoFront || seed.photoBack);
    if (seedsWithPhotos.length === 0 && seeds.length > 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[#6a7282] mb-2">No seed packet photos yet</p>
          <p className="text-sm text-[#99a1af]">Add photos when creating or editing seeds to see them here</p>
        </div>
      );
    }
    return <SeedGallery seeds={seedsWithPhotos} onSeedClick={onSeedClick} />;
  }

  let groups: Record<string, Seed[]>;

  switch (viewMode) {
    case 'type':
      groups = groupByType(seeds);
      break;
    case 'age':
      groups = groupByAge(seeds);
      break;
    case 'month':
      groups = groupByMonth(seeds);
      break;
    default:
      groups = { 'All Seeds': seeds };
  }

  const nonEmptyGroups = Object.entries(groups).filter(([, items]) => items.length > 0);

  if (seeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p className="text-[#6a7282] mb-2">No seeds yet</p>
        <p className="text-sm text-[#99a1af]">Tap + to add your first seed</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {nonEmptyGroups.map(([groupName, groupSeeds]) => (
        <div key={groupName}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[#4a5565] font-semibold">
              {viewMode === 'type' ? TYPE_LABELS[groupName] || groupName : groupName}
            </h2>
            <span className="text-sm text-[#99a1af]">{groupSeeds.length}</span>
          </div>
          <div className="space-y-2">
            {groupSeeds.map(seed => (
              <SeedCard key={seed.id} seed={seed} onClick={() => onSeedClick(seed)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
