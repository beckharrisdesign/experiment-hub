'use client';

import { useState, useEffect, useMemo } from 'react';
import { Seed, ViewMode } from '@/types/seed';
import { getSeeds, saveSeed, updateSeed, deleteSeed, seedSampleData } from '@/lib/storage';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { FilterBar } from '@/components/FilterBar';
import { SeedList } from '@/components/SeedList';
import { BottomNav } from '@/components/BottomNav';
import { AddSeedForm } from '@/components/AddSeedForm';
import { SeedDetail } from '@/components/SeedDetail';
import { Profile } from '@/components/Profile';
import { SeedType } from '@/types/seed';
import { getSeedAge } from '@/lib/storage';

export default function Home() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('type');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SeedType | 'all' | 'use-first'>('all');
  
  // Reset filter when view mode changes (except when switching to photo view)
  useEffect(() => {
    if (viewMode !== 'photo') {
      setActiveFilter('all');
    }
  }, [viewMode]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState<Seed | null>(null);
  const [editingSeed, setEditingSeed] = useState<Seed | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // Load seeds from localStorage on mount
  useEffect(() => {
    // Seed sample data if storage is empty (development only)
    seedSampleData();
    setSeeds(getSeeds());
  }, []);

  // Filter seeds by search query and active filter
  const filteredSeeds = useMemo(() => {
    let filtered = seeds;

    // Apply type filter
    if (activeFilter === 'use-first') {
      filtered = filtered.filter(seed => {
        const age = getSeedAge(seed);
        return seed.useFirst || (seed.year && age >= 3);
      });
    } else if (activeFilter !== 'all') {
      filtered = filtered.filter(seed => seed.type === activeFilter);
    }

    // Apply search query
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

  const handleAddSeed = (seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSeed = saveSeed(seedData);
    setSeeds(prev => [...prev, newSeed]);
    setShowAddForm(false);
  };

  const handleUpdateSeed = (seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingSeed) return;
    const updated = updateSeed(editingSeed.id, seedData);
    if (updated) {
      setSeeds(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      setSelectedSeed(updated);
    }
    setEditingSeed(null);
  };

  const handleDeleteSeed = (seed: Seed) => {
    if (confirm(`Delete "${seed.name}"?`)) {
      deleteSeed(seed.id);
      setSeeds(prev => prev.filter(s => s.id !== seed.id));
      setSelectedSeed(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <Header onProfileClick={() => setShowProfile(true)} />

      <main className="flex-1 px-4 py-4 pt-24 pb-24">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        
        <div className="mt-3">
          <FilterBar activeType={activeFilter} onTypeChange={setActiveFilter} />
        </div>

        <div className="mt-4">
          <SeedList
            seeds={filteredSeeds}
            viewMode={viewMode}
            onSeedClick={setSelectedSeed}
          />
        </div>
      </main>

      <BottomNav
        activeView={viewMode}
        onViewChange={setViewMode}
        onAddClick={() => setShowAddForm(true)}
      />

      {/* Add Seed Modal */}
      {showAddForm && (
        <AddSeedForm
          onSubmit={handleAddSeed}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Seed Modal */}
      {editingSeed && (
        <AddSeedForm
          initialData={editingSeed}
          onSubmit={handleUpdateSeed}
          onClose={() => setEditingSeed(null)}
        />
      )}

      {/* Seed Detail Modal */}
      {selectedSeed && !editingSeed && (
        <SeedDetail
          seed={selectedSeed}
          onClose={() => setSelectedSeed(null)}
          onEdit={() => setEditingSeed(selectedSeed)}
          onDelete={() => handleDeleteSeed(selectedSeed)}
        />
      )}

      {/* Profile Modal */}
      {showProfile && (
        <Profile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
