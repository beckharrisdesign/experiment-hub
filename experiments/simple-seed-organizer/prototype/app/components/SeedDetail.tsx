'use client';

import { useState, useEffect } from 'react';
import { Seed } from '@/types/seed';
import { getSeedAge } from '@/lib/storage';
import { getPlantingGuidance } from '@/lib/plantingGuidance';
import { getProfile } from '@/lib/storage';

interface SeedDetailProps {
  seed: Seed;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function getAgeLabel(age: number): { text: string; color: string } {
  if (age <= 0) return { text: 'New this year', color: 'text-green-600 bg-green-50' };
  if (age === 1) return { text: '1 year old', color: 'text-green-600 bg-green-100' };
  if (age === 2) return { text: '2 years old', color: 'text-yellow-600 bg-yellow-50' };
  return { text: `${age} years old - Use first!`, color: 'text-orange-600 bg-orange-50' };
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-[#6a7282]">{label}</span>
      <span className="text-[#101828] font-medium">{value}</span>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateString(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SeedDetail({ seed, onClose, onEdit, onDelete }: SeedDetailProps) {
  const age = getSeedAge(seed);
  const ageLabel = seed.year ? getAgeLabel(age) : null;
  const [plantingGuidance, setPlantingGuidance] = useState<ReturnType<typeof getPlantingGuidance> | null>(null);

  useEffect(() => {
    setPlantingGuidance(getPlantingGuidance(seed));
  }, [seed]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <button onClick={onClose} className="p-2 -ml-2">
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[#101828]">Seed Details</h1>
        <button onClick={onEdit} className="p-2 -mr-2 text-[#16a34a]">
          Edit
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Title Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#101828] mb-1">{seed.name}</h2>
          <p className="text-[#6a7282]">{seed.variety}</p>
          {ageLabel && (
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${ageLabel.color}`}>
              {ageLabel.text}
            </span>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <InfoRow label="Type" value={seed.type?.charAt(0).toUpperCase() + seed.type?.slice(1)} />
          <InfoRow label="Brand" value={seed.brand} />
          <InfoRow label="Source" value={seed.source} />
          <InfoRow label="Year" value={seed.year?.toString()} />
          <InfoRow 
            label="Purchase Date" 
            value={seed.purchaseDate ? formatDateString(seed.purchaseDate) : undefined} 
          />
          <InfoRow label="Quantity" value={seed.quantity} />
          <InfoRow label="Days to Germination" value={seed.daysToGermination} />
          <InfoRow label="Days to Maturity" value={seed.daysToMaturity} />
          <InfoRow label="Planting Depth" value={seed.plantingDepth} />
          <InfoRow label="Spacing" value={seed.spacing} />
          <InfoRow label="Sun Requirement" value={seed.sunRequirement?.replace('-', ' ')} />
          <InfoRow 
            label="Custom Expiration" 
            value={seed.customExpirationDate ? formatDateString(seed.customExpirationDate) : undefined} 
          />
        </div>

        {/* Planting Guidance */}
        {plantingGuidance && (
          <div className="mb-6">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#4a5565] mb-1">Planting Guidance</h3>
              {(() => {
                const profile = getProfile();
                if (profile?.zipCode || profile?.growingZone) {
                  return (
                    <p className="text-xs text-[#6a7282]">
                      Personalized for your location
                      {profile.zipCode && ` (${profile.zipCode}`}
                      {profile.growingZone && ` • Zone ${profile.growingZone}`}
                      {profile.zipCode && ')'}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            {plantingGuidance.hasData ? (
              <div className="space-y-3">
                {/* Sow Indoors → Last Frost → Direct Sow Row */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {/* Sow Indoors Card */}
                  {plantingGuidance.startSeedsIndoors && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-shrink-0 min-w-[140px]">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-green-700">Sow Indoors</span>
                      </div>
                      <p className="text-lg font-bold text-green-900">{formatDate(plantingGuidance.startSeedsIndoors)}</p>
                      {plantingGuidance.harvestDates?.fromIndoorStart && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <p className="text-xs text-green-600 mb-0.5">Harvest</p>
                          <p className="text-sm font-semibold text-green-900">{formatDate(plantingGuidance.harvestDates.fromIndoorStart)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Last Frost Card */}
                  {plantingGuidance.lastFrostDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-shrink-0 min-w-[140px]">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-xs font-medium text-blue-700">Last Frost</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900">{formatDate(plantingGuidance.lastFrostDate)}</p>
                    </div>
                  )}

                  {/* Direct Sow Card */}
                  {plantingGuidance.directSowDate && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex-shrink-0 min-w-[140px]">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="text-xs font-medium text-amber-700">Direct Sow</span>
                      </div>
                      <p className="text-lg font-bold text-amber-900">{formatDate(plantingGuidance.directSowDate)}</p>
                      {plantingGuidance.harvestDates?.fromDirectSow && (
                        <div className="mt-2 pt-2 border-t border-amber-200">
                          <p className="text-xs text-amber-600 mb-0.5">Harvest</p>
                          <p className="text-sm font-semibold text-amber-900">{formatDate(plantingGuidance.harvestDates.fromDirectSow)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {plantingGuidance.recommendations.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-[#4a5565] mb-2">Tips</p>
                    <ul className="space-y-1">
                      {plantingGuidance.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-[#6a7282] flex items-start gap-2">
                          <span className="text-[#16a34a] mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-[#6a7282]">{plantingGuidance.recommendations[0]}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {seed.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#4a5565] mb-2">Notes</h3>
            <p className="text-[#101828] bg-gray-50 rounded-lg p-4">{seed.notes}</p>
          </div>
        )}

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="w-full py-3 text-red-600 font-medium border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Delete Seed
        </button>
      </div>
    </div>
  );
}
