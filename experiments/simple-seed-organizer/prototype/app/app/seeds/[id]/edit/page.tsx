'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Seed } from '@/types/seed';
import { getSeedById, updateSeed } from '@/lib/storage';
import { AddSeedForm } from '@/components/AddSeedForm';
import { useAuth } from '@/lib/auth-context';

export default function EditSeedPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [userTier, setUserTier] = useState<string>('Seed Stash Starter');
  const [canUseAI, setCanUseAI] = useState(true);
  const [resetsAt, setResetsAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    getSeedById(id)
      .then((s) => {
        if (!cancelled) {
          setSeed(s);
          setError(s ? null : 'Seed not found');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load seed');
          setSeed(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, user]);

  if (authLoading || loading) {
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

  if (error || !seed) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center pt-[72px] px-4">
        <p className="text-[#6a7282] mb-4">{error || 'Seed not found'}</p>
        <button
          onClick={() => router.push('/')}
          className="text-[#16a34a] font-medium hover:underline"
        >
          Back to seeds
        </button>
      </div>
    );
  }

  const handleSubmit = async (seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      const updated = await updateSeed(seed.id, seedData);
      if (updated) {
        router.push(`/seeds/${updated.id}`);
      }
    } catch (err) {
      console.error('[EditSeedPage] Error updating seed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update seed in database';
      alert(`Failed to update seed: ${errorMessage}\n\nPlease check your Supabase connection and try again.`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col pt-20 pb-24">
      <AddSeedForm
        userId={seed.user_id || user.id}
        userTier={userTier}
        canUseAI={canUseAI}
        resetsAt={resetsAt}
        initialData={seed}
        onSubmit={handleSubmit}
        onClose={() => router.push(`/seeds/${id}`)}
        asPage
      />
    </div>
  );
}
