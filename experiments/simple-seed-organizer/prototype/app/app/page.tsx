'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Seed, ViewMode } from '@/types/seed';
import { getSeedsWithoutPhotos, getSeedPhotos } from '@/lib/storage';
import { SearchBar } from '@/components/SearchBar';
import { FilterBar } from '@/components/FilterBar';
import { SeedList } from '@/components/SeedList';
import { BottomNav } from '@/components/BottomNav';
import { LandingPage } from '@/components/LandingPage';
import { SeedType } from '@/types/seed';
import { getSeedAge } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

const VALID_VIEW_MODES: ViewMode[] = ['type', 'month', 'age', 'photo'];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SeedType | 'all' | 'use-first'>('all');
  const [seedsLoading, setSeedsLoading] = useState(false);
  const [usage, setUsage] = useState<{
    canAddSeed: boolean;
    canUseAI: boolean;
    seedCount?: number;
    seedLimit?: number | null;
    overSeedLimit?: boolean;
    resetsAt?: string;
  } | null>(null);

  // Sync viewMode with URL ?view= param for deep linking
  const viewParam = searchParams.get('view');
  const viewMode: ViewMode = viewParam && VALID_VIEW_MODES.includes(viewParam as ViewMode)
    ? (viewParam as ViewMode)
    : 'type';

  const setViewMode = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', mode);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (viewMode !== 'photo') {
      setActiveFilter('all');
    }
  }, [viewMode]);

  useEffect(() => {
    if (!user) {
      setUsage(null);
      return;
    }
    fetch('/api/usage', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) =>
        data &&
        setUsage({
          canAddSeed: data.canAddSeed,
          canUseAI: data.canUseAI,
          seedCount: data.seedCount,
          seedLimit: data.seedLimit,
          overSeedLimit: data.overSeedLimit,
          resetsAt: data.resetsAt,
        })
      )
      .catch(() => setUsage(null));
  }, [user]);

  // Load seeds from Supabase when user is authenticated
  useEffect(() => {
    if (!user) {
      setSeeds([]);
      setSeedsLoading(false);
      return;
    }

    let cancelled = false;

    const loadSeeds = async () => {
      setSeedsLoading(true);
      try {
        const seedsWithoutPhotos = await getSeedsWithoutPhotos();
        if (cancelled) return;
        setSeeds(seedsWithoutPhotos);
        setSeedsLoading(false);

        const photos = await getSeedPhotos();
        if (cancelled) return;
        setSeeds(prev =>
          prev.map(seed => {
            const p = photos.get(seed.id);
            if (!p) return seed;
            return { ...seed, photoFront: p.photoFront ?? seed.photoFront, photoBack: p.photoBack ?? seed.photoBack };
          })
        );
      } catch (error) {
        if (cancelled) return;
        console.error('[Home] Error loading seeds:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load seeds';
        alert(`Failed to load seeds: ${errorMessage}\n\nPlease check your Supabase connection.`);
        setSeeds([]);
        setSeedsLoading(false);
      }
    };
    loadSeeds();
    return () => { cancelled = true; };
  }, [user]);

  const filteredSeeds = useMemo(() => {
    let filtered = seeds;

    if (activeFilter === 'use-first') {
      filtered = filtered.filter(seed => {
        const age = getSeedAge(seed);
        return seed.useFirst || (seed.year && age >= 3);
      });
    } else if (activeFilter !== 'all') {
      filtered = filtered.filter(seed => seed.type === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        seed =>
          seed.name.toLowerCase().includes(query) ||
          seed.variety.toLowerCase().includes(query) ||
          seed.brand?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [seeds, searchQuery, activeFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center pt-[72px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <LandingPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f9fafb] flex flex-col">
      <main className="flex-1 w-full px-4 py-4 pt-24 pb-24 max-w-[1600px] mx-auto md:px-6 lg:px-8">
        {usage?.canAddSeed === false && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-amber-800 font-medium">
              {usage.seedLimit != null && usage.seedCount != null
                ? `You have ${usage.seedCount} seeds (limit ${usage.seedLimit}). Upgrade or remove some to add more.`
                : "You've reached your seed limit. Upgrade to add more seed packets to your collection."}
            </p>
            <Link
              href="/pricing?reason=seeds"
              className="shrink-0 px-4 py-2 bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors text-center"
            >
              Upgrade now
            </Link>
          </div>
        )}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        <div className="mt-3">
          <FilterBar activeType={activeFilter} onTypeChange={setActiveFilter} />
        </div>

        <div className="mt-4">
          {seedsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#16a34a] border-t-transparent mb-4" />
              <p className="text-[#6a7282] text-sm">Loading your seeds...</p>
            </div>
          ) : (
            <SeedList
              seeds={filteredSeeds}
              viewMode={viewMode}
              onSeedClick={(seed) => router.push(`/seeds/${seed.id}`)}
            />
          )}
        </div>
      </main>

      <BottomNav
        activeView={viewMode}
        onViewChange={setViewMode}
        onAddClick={() => {
          if (usage?.canAddSeed !== false) {
            router.push('/add');
          } else {
            router.push('/pricing?reason=seeds');
          }
        }}
        canAddSeed={usage?.canAddSeed ?? true}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center pt-[72px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
