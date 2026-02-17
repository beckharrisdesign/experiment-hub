'use client';

import { useRouter } from 'next/navigation';
import { AddSeedForm } from '@/components/AddSeedForm';
import { useAuth } from '@/lib/auth-context';
import { saveSeed } from '@/lib/storage';
import { Seed } from '@/types/seed';
import { useState, useEffect } from 'react';

export default function AddSeedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userTier, setUserTier] = useState<string>('Seed Stash Starter');
  const [canUseAI, setCanUseAI] = useState(true);
  const [resetsAt, setResetsAt] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    fetch('/api/usage', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUserTier(data.tier);
          setCanUseAI(data.canUseAI);
          setResetsAt(data.resetsAt);
        }
      })
      .catch(() => {});
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center pt-[72px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const handleSubmit = async (seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      const newSeed = await saveSeed(seedData);
      router.push(`/seeds/${newSeed.id}`);
    } catch (error) {
      console.error('[AddSeedPage] Error saving seed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save seed to database';
      alert(`Failed to save seed: ${errorMessage}\n\nPlease check your Supabase connection and try again.`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col pt-20 pb-24">
      <AddSeedForm
        userId={user.id}
        userTier={userTier}
        canUseAI={canUseAI}
        resetsAt={resetsAt}
        onSubmit={handleSubmit}
        onClose={() => router.push('/')}
        asPage
      />
    </div>
  );
}
