'use client';

import { Seed } from '@/types/seed';

interface SeedGalleryProps {
  seeds: Seed[];
  onSeedClick: (seed: Seed) => void;
}

export function SeedGallery({ seeds, onSeedClick }: SeedGalleryProps) {
  if (seeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-[#6a7282] mb-2">No seeds yet</p>
        <p className="text-sm text-[#99a1af]">Tap + to add your first seed</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {seeds.map(seed => (
        <button
          key={seed.id}
          onClick={() => onSeedClick(seed)}
          className="relative aspect-square bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {seed.photoFront ? (
            <img
              src={seed.photoFront}
              alt={seed.variety || seed.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#dcfce7] to-[#86efac] flex flex-col items-center justify-center p-4">
              <svg className="w-12 h-12 text-[#166534] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-xs text-[#166534] font-medium text-center line-clamp-2">
                {seed.variety || seed.name}
              </p>
            </div>
          )}
          {/* Overlay with variety name on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-200 flex items-end">
            <div className="w-full p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-white text-xs font-medium truncate">{seed.variety || seed.name}</p>
              {seed.year && (
                <p className="text-white/80 text-xs">{seed.year}</p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

