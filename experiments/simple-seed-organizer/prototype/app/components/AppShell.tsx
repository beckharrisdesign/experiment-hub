'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Profile } from '@/components/Profile';
import { useAuth } from '@/lib/auth-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <Header
        onProfileClick={user ? () => setShowProfile(true) : undefined}
      />
      {children}
      {showProfile && (
        <Profile onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}
