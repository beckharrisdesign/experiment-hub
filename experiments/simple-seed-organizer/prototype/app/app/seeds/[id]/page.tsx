'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Seed } from '@/types/seed';
import { getSeedById, deleteSeed } from '@/lib/storage';
import { SeedDetail } from '@/components/SeedDetail';
import { useAuth } from '@/lib/auth-context';

export default function SeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!confirm(`Delete "${seed.name}"?`)) return;
    try {
      await deleteSeed(seed.id, seed.user_id || user?.id);
      router.push('/');
    } catch (err) {
      console.error('[SeedDetailPage] Delete error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete seed';
      alert(`Failed to delete seed: ${msg}`);
    }
  };

  return (
    <SeedDetail
      seed={seed}
      onClose={() => router.push('/')}
      onEdit={() => router.push(`/seeds/${id}/edit`)}
      onDelete={handleDelete}
      asPage
    />
  );
}
