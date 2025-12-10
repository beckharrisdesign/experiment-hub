import React from 'react';

// Phone frame component
function PhoneFrame({ children, crop = 'full' }: { children: React.ReactNode; crop?: 'full' | 'top' | 'middle' | 'bottom' }) {
  const cropStyles = {
    full: { clipPath: 'inset(0 0 0 0)' },
    top: { clipPath: 'inset(0 0 40% 0)' },
    middle: { clipPath: 'inset(20% 0 20% 0)' },
    bottom: { clipPath: 'inset(40% 0 0 0)' },
  };
  
  return (
    <div className="relative pointer-events-none select-none" style={{ width: '280px', height: '500px' }}>
      {/* Phone bezel */}
      <div className="absolute inset-0 bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
        <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10"></div>
          {/* Screen content with crop */}
          <div className="w-full h-full" style={{ ...cropStyles[crop], filter: 'brightness(0.98)' }}>
            <div className="pointer-events-none">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop frame component
function DesktopFrame({ children, crop = 'full' }: { children: React.ReactNode; crop?: 'full' | 'top' | 'middle' | 'bottom' }) {
  const cropStyles = {
    full: { clipPath: 'inset(0 0 0 0)' },
    top: { clipPath: 'inset(0 0 50% 0)' },
    middle: { clipPath: 'inset(25% 0 25% 0)' },
    bottom: { clipPath: 'inset(50% 0 0 0)' },
  };
  
  return (
    <div className="relative w-full pointer-events-none select-none" style={{ height: '300px' }}>
      {/* Browser chrome */}
      <div className="absolute inset-0 bg-gray-100 rounded-lg shadow-xl overflow-hidden border border-gray-300">
        {/* Browser header */}
        <div className="bg-gray-200 px-4 py-2 flex items-center gap-2 border-b border-gray-300">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 bg-white rounded px-3 py-1 mx-4 text-xs text-gray-500">
            simpleseedorganizer.com
          </div>
        </div>
        {/* Browser content with crop */}
        <div className="w-full h-full bg-white" style={{ height: 'calc(100% - 40px)', ...cropStyles[crop], filter: 'brightness(0.98)' }}>
          <div className="pointer-events-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SeedListMockup() {
  return (
    <PhoneFrame crop="full">
      <div className="bg-white w-full h-full overflow-hidden">
        {/* Top navigation menu */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="p-1.5">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-sm text-gray-900">My Seeds</h3>
          <div className="p-1.5">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-gray-400">Search by variety...</span>
          </div>
        </div>
        
        {/* Seed list */}
        <div className="overflow-y-auto" style={{ height: '380px' }}>
          {[
            { variety: "Brad's Atomic Grape", type: 'Tomato', year: '2024', category: 'Cherry', inventory: 'full', useFirst: false },
            { variety: 'Sunrise Bumblebee', type: 'Tomato', year: '2023', category: 'Cherry', inventory: 'partial', useFirst: false },
            { variety: 'Black Krim', type: 'Tomato', year: '2022', category: 'Slicer', inventory: 'self', useFirst: true },
            { variety: 'Cherokee Purple', type: 'Tomato', year: '2024', category: 'Slicer', inventory: 'full', useFirst: false },
            { variety: 'San Marzano', type: 'Tomato', year: '2023', category: 'Paste', inventory: 'full', useFirst: false },
            { variety: 'Brandywine', type: 'Tomato', year: '2022', category: 'Slicer', inventory: 'self', useFirst: true },
          ].map((seed, idx) => (
            <div
              key={idx}
              className={`px-4 py-3 border-b border-gray-100 ${
                seed.useFirst ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{seed.variety}</span>
                    {seed.useFirst && (
                      <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">Use First</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{seed.type}</span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{seed.category}</span>
                    <span className="text-xs text-gray-400">{seed.year}</span>
                    {seed.inventory === 'full' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Full packet</span>
                    )}
                    {seed.inventory === 'partial' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Partial</span>
                    )}
                    {seed.inventory === 'self' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Self collected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Add button */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Seed
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function SearchMockup() {
  return (
    <PhoneFrame crop="top">
      <div className="bg-white w-full h-full overflow-hidden">
        {/* Top navigation menu */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="p-1.5">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-sm text-gray-900">Search</h3>
          <div className="p-1.5">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        
        {/* Active search */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="bg-white border-2 border-primary-500 rounded-lg px-3 py-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-900">brad</span>
            <div className="flex-1"></div>
          </div>
        </div>
        
        {/* Search results */}
        <div className="overflow-y-auto px-4 py-2" style={{ height: '400px' }}>
          <div className="text-xs text-gray-500 mb-2 px-2">Results for "brad"</div>
          {[
            { variety: "Brad's Atomic Grape", type: 'Tomato', category: 'Cherry' },
          ].map((seed, idx) => (
            <div
              key={idx}
              className="px-3 py-3 bg-primary-50 rounded-lg mb-2 border border-primary-200"
            >
              <div className="font-medium text-sm text-gray-900">{seed.variety}</div>
              <div className="text-xs text-gray-600 mt-0.5">{seed.type} • {seed.category}</div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

export function UseFirstListMockup() {
  return (
    <PhoneFrame crop="middle">
      <div className="bg-white w-full h-full overflow-hidden">
        {/* Top navigation menu */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="p-1.5">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-sm text-gray-900">Use First</h3>
            <p className="text-xs text-gray-500">Seeds to plant soon</p>
          </div>
          <div className="p-1.5">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        
        {/* List */}
        <div className="overflow-y-auto" style={{ height: '430px' }}>
          {[
            { variety: 'Black Krim', type: 'Tomato', year: '2022', years: 3, category: 'Slicer', inventory: 'self' },
            { variety: 'Brandywine', type: 'Tomato', year: '2022', years: 3, category: 'Slicer', inventory: 'self' },
            { variety: 'Green Zebra', type: 'Tomato', year: '2023', years: 2, category: 'Slicer', inventory: 'partial' },
          ].map((seed, idx) => (
            <div
              key={idx}
              className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{seed.variety}</span>
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{seed.years} years old</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">{seed.type}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{seed.category}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">{seed.year}</span>
                  </div>
                  <div className="mt-2">
                    {seed.inventory === 'full' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Full packet</span>
                    )}
                    {seed.inventory === 'partial' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Partial</span>
                    )}
                    {seed.inventory === 'self' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Self collected</span>
                    )}
                  </div>
                </div>
                <div className="text-primary-600 text-xs font-medium">Use</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

export function SeedListDesktopMockup() {
  return (
    <DesktopFrame crop="middle">
      <div className="bg-white w-full h-full overflow-hidden">
        {/* Top navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-base text-gray-900">My Seeds</h3>
          </div>
          <div className="p-2 rounded-lg">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        
        {/* Search and filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-3 border border-gray-300">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-400">Search by variety...</span>
          </div>
        </div>
        
        {/* Table view */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variety</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inventory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { variety: "Brad's Atomic Grape", type: 'Tomato', year: '2024', category: 'Cherry', inventory: 'full' },
                { variety: 'Sunrise Bumblebee', type: 'Tomato', year: '2023', category: 'Cherry', inventory: 'partial' },
                { variety: 'Black Krim', type: 'Tomato', year: '2022', category: 'Slicer', inventory: 'self', useFirst: true },
              ].map((seed, idx) => (
                <tr key={idx} className={seed.useFirst ? 'bg-primary-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{seed.variety}</span>
                      {seed.useFirst && (
                        <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">Use First</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{seed.type}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{seed.category}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{seed.year}</td>
                  <td className="px-6 py-3">
                    {seed.inventory === 'full' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Full packet</span>
                    )}
                    {seed.inventory === 'partial' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Partial</span>
                    )}
                    {seed.inventory === 'self' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Self collected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DesktopFrame>
  );
}

export function SeedDetailMockup() {
  return (
    <PhoneFrame crop="bottom">
      <div className="bg-white w-full h-full overflow-hidden">
        {/* Top navigation menu */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="p-1.5">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <h3 className="font-semibold text-sm text-gray-900">Details</h3>
          <div className="p-1.5">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto px-4 py-4" style={{ height: '430px' }}>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Brad's Atomic Grape</h2>
            <p className="text-sm text-gray-600">Tomato • Cherry • Indeterminate</p>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase">Source</label>
              <p className="text-sm text-gray-900 mt-0.5">Baker Creek</p>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 uppercase">Year</label>
              <p className="text-sm text-gray-900 mt-0.5">2024</p>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 uppercase">Inventory</label>
              <p className="text-sm text-gray-900 mt-0.5">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Full packet</span>
              </p>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 uppercase">Planting Depth</label>
              <p className="text-sm text-gray-900 mt-0.5">1/4 inch</p>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 uppercase">Spacing</label>
              <p className="text-sm text-gray-900 mt-0.5">24-36 inches</p>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 uppercase">Days to Maturity</label>
              <p className="text-sm text-gray-900 mt-0.5">70-80 days</p>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 uppercase">Notes</label>
              <p className="text-sm text-gray-900 mt-0.5">Stunning purple stripes, great flavor</p>
            </div>
          </div>
          
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium text-center">
            Edit Seed
          </div>
        </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
