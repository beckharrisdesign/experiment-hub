'use client';

import { useState, useEffect, useMemo } from 'react';
import { Seed, ViewMode } from '@/types/seed';
import { getSeeds, getSeedsWithoutPhotos, getSeedPhotos, saveSeed, updateSeed, deleteSeed } from '@/lib/storage';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { FilterBar } from '@/components/FilterBar';
import { SeedList } from '@/components/SeedList';
import { BottomNav } from '@/components/BottomNav';
import { AddSeedForm } from '@/components/AddSeedForm';
import { SeedDetail } from '@/components/SeedDetail';
import { Profile } from '@/components/Profile';
import { LoginForm } from '@/components/LoginForm';
import { SignUpForm } from '@/components/SignUpForm';
import { SeedType } from '@/types/seed';
import { getSeedAge } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('type');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SeedType | 'all' | 'use-first'>('all');

  useEffect(() => {
    if (viewMode !== 'photo') {
      setActiveFilter('all');
    }
  }, [viewMode]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const selectedSeed = selectedSeedId ? (seeds.find(s => s.id === selectedSeedId) ?? null) : null;
  const [editingSeed, setEditingSeed] = useState<Seed | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [seedsLoading, setSeedsLoading] = useState(false);

  // Load seeds from Supabase when user is authenticated
  // Two-phase load: metadata first (fast), then photos in background
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
        // Phase 1: Load metadata without photos (fast - no large base64 blobs)
        const seedsWithoutPhotos = await getSeedsWithoutPhotos();
        if (cancelled) return;
        setSeeds(seedsWithoutPhotos);
        setSeedsLoading(false);
        console.log(`[Home] Loaded ${seedsWithoutPhotos.length} seeds (metadata only)`);

        // Phase 2: Load photos in background and merge
        const photos = await getSeedPhotos();
        if (cancelled) return;
        setSeeds(prev =>
          prev.map(seed => {
            const p = photos.get(seed.id);
            if (!p) return seed;
            return { ...seed, photoFront: p.photoFront ?? seed.photoFront, photoBack: p.photoBack ?? seed.photoBack };
          })
        );
        console.log(`[Home] Merged photos for ${photos.size} seeds`);
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
    return () => {
      cancelled = true;
    };
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

  const handleAddSeed = async (seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newSeed = await saveSeed(seedData);
      const updatedSeeds = await getSeeds();
      setSeeds(updatedSeeds);
      setShowAddForm(false);
    } catch (error) {
      console.error('[Home] Error saving seed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save seed to database';
      alert(`Failed to save seed: ${errorMessage}\n\nPlease check your Supabase connection and try again.`);
    }
  };

  const handleUpdateSeed = async (seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingSeed) return;
    try {
      const updated = await updateSeed(editingSeed.id, seedData);
      if (updated) {
        const updatedSeeds = await getSeeds();
        setSeeds(updatedSeeds);
        setSelectedSeedId(updated.id);
      }
      setEditingSeed(null);
    } catch (error) {
      console.error('[Home] Error updating seed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update seed in database';
      alert(`Failed to update seed: ${errorMessage}\n\nPlease check your Supabase connection and try again.`);
    }
  };

  const handleDeleteSeed = async (seed: Seed) => {
    if (confirm(`Delete "${seed.name}"?`)) {
      try {
        await deleteSeed(seed.id, seed.user_id || user?.id);
        const updatedSeeds = await getSeeds();
        setSeeds(updatedSeeds);
        setSelectedSeedId(null);
      } catch (error) {
        console.error('[Home] Error deleting seed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete seed from database';
        alert(`Failed to delete seed: ${errorMessage}\n\nPlease check your Supabase connection and try again.`);
      }
    }
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]"></div>
      </div>
    );
  }

  // Not authenticated - show login or signup
  if (!user) {
    return authView === 'login' ? (
      <LoginForm
        onSuccess={() => {}}
        onSwitchToSignUp={() => setAuthView('signup')}
      />
    ) : (
      <SignUpForm
        onSuccess={() => {}}
        onSwitchToLogin={() => setAuthView('login')}
      />
    );
  }

  // Authenticated - show main app
  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <Header onProfileClick={() => setShowProfile(true)} userEmail={user.email} />

      <main className="flex-1 px-4 py-4 pt-24 pb-24">
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
              onSeedClick={(seed) => setSelectedSeedId(seed.id)}
            />
          )}
        </div>
      </main>

      <BottomNav
        activeView={viewMode}
        onViewChange={setViewMode}
        onAddClick={() => setShowAddForm(true)}
      />

      {showAddForm && (
        <AddSeedForm
          userId={user.id}
          onSubmit={handleAddSeed}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editingSeed && (
        <AddSeedForm
          userId={editingSeed.user_id || user.id}
          initialData={editingSeed}
          onSubmit={handleUpdateSeed}
          onClose={() => setEditingSeed(null)}
        />
      )}

      {selectedSeed && !editingSeed && (
        <SeedDetail
          seed={selectedSeed}
          onClose={() => setSelectedSeedId(null)}
          onEdit={() => selectedSeed && setEditingSeed(selectedSeed)}
          onDelete={() => selectedSeed && handleDeleteSeed(selectedSeed)}
        />
      )}

      {showProfile && (
        <Profile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
