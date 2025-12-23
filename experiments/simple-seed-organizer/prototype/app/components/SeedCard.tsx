'use client';

import { Seed } from '@/types/seed';
import { getSeedAge } from '@/lib/storage';

interface SeedCardProps {
  seed: Seed;
  onClick: () => void;
}

function getAgeColor(age: number): string {
  if (age <= 0) return 'bg-[#f0fdf4]'; // brand new
  if (age === 1) return 'bg-[#dcfce7]';
  if (age === 2) return 'bg-[#bbf7d0]';
  return 'bg-[#86efac]'; // 3+ years - use first!
}

export function SeedCard({ seed, onClick }: SeedCardProps) {
  const age = getSeedAge(seed);
  const ageColor = getAgeColor(age);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-lg p-3 flex items-center gap-3 text-left hover:shadow-md transition-shadow"
    >
      {/* Age indicator */}
      <div className={`w-10 h-10 ${ageColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <svg className="w-5 h-5 text-[#166534]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 2.12 13.38 1 12 1S9.5 2.12 9.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25z" />
        </svg>
      </div>

      {/* Seed info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[#4a5565] truncate">
          {seed.variety || seed.name}
        </div>
        <div className="text-sm text-[#99a1af] truncate flex items-center gap-2">
          <span className="capitalize">{seed.type || 'other'}</span>
          {seed.variety && seed.name !== seed.variety && (
            <span className="text-[#6a7282]">• {seed.name}</span>
          )}
        </div>
      </div>

      {/* Year badge */}
      {seed.year && (
        <div className="text-xs text-[#99a1af] bg-gray-100 px-2 py-1 rounded">
          {seed.year}
        </div>
      )}

      {/* Chevron */}
      <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
