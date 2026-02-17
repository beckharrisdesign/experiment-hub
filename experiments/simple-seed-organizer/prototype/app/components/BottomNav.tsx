'use client';

import { ViewMode } from '@/types/seed';

interface BottomNavProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onAddClick: () => void;
}

export function BottomNav({ activeView, onViewChange, onAddClick }: BottomNavProps) {
  const allNavItems: { view: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      view: 'type',
      label: 'Type',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      view: 'month',
      label: 'Month',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      view: 'age',
      label: 'Age',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      view: 'photo',
      label: 'Photos',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  // Temporarily hide Month and Age tabs (zone/zip/planting guidance not in use)
  const navItems = allNavItems.filter((item) => item.view !== 'month' && item.view !== 'age');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-center z-50 md:px-6 lg:px-8">
      <div className="flex gap-6 items-center w-full max-w-7xl justify-center">
        {navItems[0] && (
          <button
            onClick={() => onViewChange(navItems[0].view)}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${
              activeView === navItems[0].view ? 'text-[#16a34a]' : 'text-[#6a7282]'
            }`}
          >
            {navItems[0].icon}
            <span className="text-xs font-medium">{navItems[0].label}</span>
          </button>
        )}

        {/* Add Button */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 bg-[#16a34a] rounded-full flex items-center justify-center text-white shadow-lg -mt-7 relative z-10"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {navItems[1] && (
          <button
            onClick={() => onViewChange(navItems[1].view)}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${
              activeView === navItems[1].view ? 'text-[#16a34a]' : 'text-[#6a7282]'
            }`}
          >
            {navItems[1].icon}
            <span className="text-xs font-medium">{navItems[1].label}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
