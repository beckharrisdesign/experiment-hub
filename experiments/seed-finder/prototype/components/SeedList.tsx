"use client";

import { useState, useMemo } from 'react';
import SeedCard from './SeedCard';
import type { Seed } from '@/lib/data';

interface SeedListProps {
  seeds: Seed[];
  highlightZone?: number;
}

export default function SeedList({ seeds, highlightZone }: SeedListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Get unique categories from seeds
  const categories = useMemo(() => {
    const cats = new Set(seeds.map(seed => seed.category).filter((cat): cat is string => cat !== null));
    return Array.from(cats).sort();
  }, [seeds]);

  // Filter and search seeds
  const filteredSeeds = useMemo(() => {
    return seeds.filter(seed => {
      // Search filter
      const matchesSearch = 
        seed.english_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (seed.latin_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      // Category filter
      const matchesCategory = 
        categoryFilter === 'all' || seed.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [seeds, searchQuery, categoryFilter]);

  if (seeds.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">No seeds found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {filteredSeeds.length} {filteredSeeds.length === 1 ? 'Seed' : 'Seeds'} Available
        </h2>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search seeds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Category Filter */}
          <div className="sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        {filteredSeeds.length !== seeds.length && (
          <p className="text-sm text-gray-500 mb-4">
            Showing {filteredSeeds.length} of {seeds.length} seeds
          </p>
        )}
      </div>

      {/* Seed Cards Grid */}
      {filteredSeeds.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No seeds match your search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSeeds.map((seed) => (
            <SeedCard key={seed.id} seed={seed} highlightZone={highlightZone} />
          ))}
        </div>
      )}
    </div>
  );
}

