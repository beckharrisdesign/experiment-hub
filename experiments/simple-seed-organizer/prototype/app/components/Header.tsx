'use client';

import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
  onProfileClick?: () => void;
  userEmail?: string | null;
}

export function Header({ onProfileClick, userEmail }: HeaderProps) {
  const [hasProfile, setHasProfile] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    const profile = getProfile();
    setHasProfile(!!profile && (!!profile.zipCode || !!profile.growingZone));
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#166534] text-white px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-[#86efac]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <span className="text-lg font-semibold">Simple Seed Organizer</span>
      </div>

      <div className="flex items-center gap-2 relative">
        {userEmail && (
          <span className="text-xs text-[#86efac] max-w-[120px] truncate hidden sm:inline">
            {userEmail}
          </span>
        )}
        {onProfileClick && (
          <>
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="p-2 rounded-lg bg-[#15803d] hover:bg-[#166534] transition-colors relative"
              aria-label="Account"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {hasProfile && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#86efac] rounded-full"></span>
              )}
            </button>
            {showAccountMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAccountMenu(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full mt-2 py-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onProfileClick();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[#101828] hover:bg-gray-100"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      signOut();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </header>
  );
}
