'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Seed } from '@/types/seed';
import { getSeedById, deleteSeed } from '@/lib/storage';
import { SeedDetail } from '@/components/SeedDetail';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

export default function SeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    getSeedById(id)
      .then((s) => {
        if (!cancelled) {
          setSeed(s);
          setError(s ? null : "We couldn't find that seed. It may have been deleted.");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "I couldn't load that seed. Try reloading the page.");
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
        <p className="text-[#6a7282] mb-4">{error || "We couldn't find that seed. It may have been deleted."}</p>
        <button
          onClick={() => router.push('/')}
          className="text-[#16a34a] font-medium hover:underline"
        >
          Back to seeds
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!seed) return;
    setDeleting(true);
    try {
      await deleteSeed(seed.id, seed.user_id || user?.id);
      router.push('/');
    } catch (err) {
      console.error('[SeedDetailPage] Delete error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete seed';
      toast.error("I'm having trouble deleting that seed right now. Please try again in a moment.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <SeedDetail
        seed={seed}
        onClose={() => router.push('/')}
        onEdit={() => router.push(`/seeds/${id}/edit`)}
        onDelete={handleDelete}
        onUpdate={(updated) => setSeed(updated)}
        asPage
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-2">Delete seed?</h2>
            <p className="text-sm text-[#6a7282] mb-6">
              &ldquo;{seed.name}&rdquo; will be permanently removed from your collection.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-[#e5e7eb] text-sm font-medium text-[#4a5565] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep it
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete seed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
