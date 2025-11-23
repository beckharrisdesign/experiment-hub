"use client";

import { useState, useMemo } from 'react';
import USDAPlantCard from './USDAPlantCard';
import type { USDAPlant } from '@/lib/data';

interface PlantWithZones extends USDAPlant {
  zones: number[];
}

interface USDAPlantListProps {
  plants: PlantWithZones[];
  families: string[];
}

export default function USDAPlantList({ plants, families }: USDAPlantListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [showWithZonesOnly, setShowWithZonesOnly] = useState(false);

  // Filter plants
  const filteredPlants = useMemo(() => {
    return plants.filter(plant => {
      // Search filter
      const matchesSearch = 
        plant.scientific_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plant.common_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        plant.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Family filter
      const matchesFamily = 
        familyFilter === 'all' || plant.family === familyFilter;
      
      return matchesSearch && matchesFamily;
    });
  }, [plants, searchQuery, familyFilter]);

  // Note: We can't filter by zones here since that requires a database query
  // The showWithZonesOnly would need to be handled server-side

  if (plants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">No plants found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {filteredPlants.length} {filteredPlants.length === 1 ? 'Plant' : 'Plants'}
        </h2>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, scientific name, or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Family Filter */}
          <div className="sm:w-64">
            <select
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Families</option>
              {families.map(family => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        {filteredPlants.length !== plants.length && (
          <p className="text-sm text-gray-500 mb-4">
            Showing {filteredPlants.length} of {plants.length} plants
          </p>
        )}
      </div>

      {/* Plant Cards Grid */}
      {filteredPlants.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No plants match your search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPlants.map((plant) => (
            <USDAPlantCard key={plant.symbol} plant={plant} zones={plant.zones} />
          ))}
        </div>
      )}
    </div>
  );
}

