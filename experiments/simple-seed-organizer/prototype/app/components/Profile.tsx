'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/types/profile';
import { getProfile, saveProfile } from '@/lib/storage';
import { lookupZone, formatZoneTemperature } from '@/lib/zoneLookup';
import { getGrowingSeasonLength } from '@/data/climate';

interface ProfileProps {
  onClose: () => void;
}

// Helper to format frost dates
function formatFrostDate(dateStr: string): string {
  const [month, day] = dateStr.split('-').map(Number);
  const date = new Date(2024, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper to get current month's average temperature
function getCurrentMonthTemp(climate: { averageTemperatures: Record<string, number> }): number {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const currentMonth = new Date().getMonth();
  return climate.averageTemperatures[monthNames[currentMonth]] || 0;
}

// USDA Hardiness Zones - all zones 1-13 with a, b, c subdivisions
const HARDINESS_ZONES = (() => {
  const zones: string[] = [];
  // Add base zones (1-13)
  for (let i = 1; i <= 13; i++) {
    zones.push(i.toString());
  }
  // Add subdivisions (a, b, c) for each zone
  for (let i = 1; i <= 13; i++) {
    zones.push(`${i}a`, `${i}b`, `${i}c`);
  }
  return zones.sort((a, b) => {
    // Sort: base zones first, then subdivisions
    const aNum = parseInt(a.replace(/[abc]/g, '')) || 0;
    const bNum = parseInt(b.replace(/[abc]/g, '')) || 0;
    if (aNum !== bNum) return aNum - bNum;
    // If same base zone, sort by subdivision (none < a < b < c)
    const aSub = a.match(/[abc]/)?.[0] || '';
    const bSub = b.match(/[abc]/)?.[0] || '';
    const subOrder: Record<string, number> = { '': 0, 'a': 1, 'b': 2, 'c': 3 };
    return (subOrder[aSub] || 0) - (subOrder[bSub] || 0);
  });
})();

export function Profile({ onClose }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [zipCode, setZipCode] = useState('');
  const [growingZone, setGrowingZone] = useState('');
  const [location, setLocation] = useState('');
  const [zoneLookupResult, setZoneLookupResult] = useState<ReturnType<typeof lookupZone> | null>(null);

  useEffect(() => {
    const existing = getProfile();
    if (existing) {
      setProfile(existing);
      setZipCode(existing.zipCode || '');
      setGrowingZone(existing.growingZone || '');
      setLocation(existing.location || '');
      
      // Auto-lookup zone if zip code exists
      if (existing.zipCode) {
        const result = lookupZone(existing.zipCode);
        setZoneLookupResult(result);
        if (result && !existing.growingZone) {
          setGrowingZone(result.zone);
        }
      }
    }
  }, []);

  // Auto-lookup zone when zip code changes
  useEffect(() => {
    if (zipCode.length >= 5) {
      const result = lookupZone(zipCode);
      setZoneLookupResult(result);
      if (result) {
        setGrowingZone(result.zone);
        if (result.location && !location) {
          setLocation(result.location);
        }
      }
    } else {
      setZoneLookupResult(null);
    }
  }, [zipCode, location]);

  const handleSave = () => {
    saveProfile({
      zipCode: zipCode.trim() || undefined,
      growingZone: growingZone.trim() || undefined,
      location: location.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#4a5565]">Profile</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4a5565] mb-2">
              Zip Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={zipCode}
                onChange={(e) => {
                  // Only allow numbers and hyphens (for ZIP+4)
                  const value = e.target.value.replace(/[^\d-]/g, '');
                  setZipCode(value);
                }}
                placeholder="e.g., 78701"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
                maxLength={10}
                pattern="[0-9-]*"
                inputMode="numeric"
              />
              {zipCode && zipCode.length >= 5 && zoneLookupResult && (
                <div className="text-xs text-[#16a34a] font-medium mt-1">
                  ✓ Zone {zoneLookupResult.zone} found
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-[#99a1af]">
              Enter your zip code to automatically determine your growing zone
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4a5565] mb-2">
              Growing Zone
            </label>
            <select
              value={growingZone}
              onChange={(e) => setGrowingZone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
            >
              <option value="">Select zone...</option>
              {Array.from({ length: 13 }, (_, i) => i + 1).map(zoneNum => {
                const baseZone = zoneNum.toString();
                return (
                  <optgroup key={baseZone} label={`Zone ${baseZone}`}>
                    <option value={baseZone}>{baseZone} (General)</option>
                    <option value={`${baseZone}a`}>{baseZone}a</option>
                    <option value={`${baseZone}b`}>{baseZone}b</option>
                    <option value={`${baseZone}c`}>{baseZone}c</option>
                  </optgroup>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-[#99a1af]">
              USDA Hardiness Zone with subdivision (e.g., 9a, 9b, 9c) - based on 2024 map update
            </p>
            {growingZone && (
              <div className="mt-2 space-y-2">
                {zoneLookupResult?.zoneInfo && (
                  <div className="p-2 bg-[#f0fdf4] border border-[#86efac] rounded-lg">
                    <p className="text-xs text-[#166534] mb-1">
                      <strong>Zone {growingZone}:</strong> {zoneLookupResult.zoneInfo.description}
                    </p>
                    <p className="text-xs text-[#166534]">
                      <strong>Temperature Range:</strong> {formatZoneTemperature(growingZone, 'F')} ({formatZoneTemperature(growingZone, 'C')})
                    </p>
                  </div>
                )}
                {zoneLookupResult?.changed && zoneLookupResult.previousZone && (
                  <div className="p-2 bg-[#fef3c7] border border-[#fbbf24] rounded-lg">
                    <p className="text-xs text-[#92400e]">
                      <strong>Zone Update (2024):</strong> This area shifted from {zoneLookupResult.previousZone} to {zoneLookupResult.zone} in the 2024 USDA zone update. Some plants that were previously borderline may now be more suitable.
                    </p>
                  </div>
                )}
                {zoneLookupResult?.climate && (
                  <div className="p-2 bg-[#eff6ff] border border-[#93c5fd] rounded-lg">
                    <p className="text-xs text-[#1e40af] mb-2">
                      <strong>Climate Data:</strong>
                    </p>
                    <div className="space-y-1 text-xs text-[#1e40af]">
                      <p>
                        <strong>First Frost:</strong> {formatFrostDate(zoneLookupResult.climate.averageFirstFrost)}
                      </p>
                      <p>
                        <strong>Last Frost:</strong> {formatFrostDate(zoneLookupResult.climate.averageLastFrost)}
                      </p>
                      {getGrowingSeasonLength(zipCode) && (
                        <p>
                          <strong>Growing Season:</strong> ~{getGrowingSeasonLength(zipCode)} days
                        </p>
                      )}
                      <p className="mt-2 text-[#3b82f6]">
                        <strong>Avg Monthly Temps:</strong> {getCurrentMonthTemp(zoneLookupResult.climate)}°F this month
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4a5565] mb-2">
              Location (Optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Austin, TX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
            />
            <p className="mt-1 text-xs text-[#99a1af]">
              City and state for reference
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-[#4a5565] hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

