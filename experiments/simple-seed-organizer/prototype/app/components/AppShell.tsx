'use client';

import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <Header showProfileLink={!!user} />
      {children}
    </>
  );
}
