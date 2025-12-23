'use client';

import { useState, useEffect } from 'react';
import { Seed } from '@/types/seed';
import { getSeedAge } from '@/lib/storage';
import { getPlantingGuidance } from '@/lib/plantingGuidance';
import { getProfile } from '@/lib/storage';
import { getClimateData } from '@/data/climate';
import { PlantingCalendar } from './PlantingCalendar';

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
          <InfoRow label="Year" value={seed.year?.toString()} />
          <InfoRow label="Quantity" value={seed.quantity} />
          <InfoRow label="Days to Germination" value={seed.daysToGermination} />
          <InfoRow label="Days to Maturity" value={seed.daysToMaturity} />
          <InfoRow label="Sun Requirement" value={seed.sunRequirement?.replace('-', ' ')} />
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
              <>
                {/* Planting Calendar Chart */}
                {(() => {
                  const profile = getProfile();
                  const climate = profile?.zipCode ? getClimateData(profile.zipCode) : null;
                  return climate && profile ? (
                    <div className="mb-4">
                      <PlantingCalendar seed={seed} climate={climate} guidance={plantingGuidance} profile={profile} />
                    </div>
                  ) : null;
                })()}
                
                {/* Detailed Dates */}
                <div className="bg-[#f0fdf4] border border-[#86efac] rounded-lg p-4 space-y-3">
                  {/* Location Badge */}
                  {(() => {
                    const profile = getProfile();
                    if (profile?.zipCode || profile?.growingZone) {
                      return (
                        <div className="mb-3 pb-3 border-b border-[#86efac]">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs font-semibold text-[#166534]">
                              Personalized for {profile.zipCode || 'your location'}
                              {profile.growingZone && ` • Growing Zone ${profile.growingZone}`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                {plantingGuidance.lastFrostDate && (
                  <div className="pb-2 border-b border-[#86efac]">
                    <p className="text-xs text-[#166534] mb-1">
                      <strong>Last Frost:</strong> {formatDate(plantingGuidance.lastFrostDate)}
                    </p>
                    {plantingGuidance.weeksBeforeLastFrost && (
                      <p className="text-xs text-[#166534]">
                        <strong>Start Seeds:</strong> {plantingGuidance.weeksBeforeLastFrost} weeks before last frost
                        {plantingGuidance.startSeedsIndoors && ` (${formatDate(plantingGuidance.startSeedsIndoors)})`}
                      </p>
                    )}
                  </div>
                )}
                {plantingGuidance.startSeedsIndoors && (
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-[#16a34a] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#166534] mb-1">Start Seeds Indoors</p>
                      <p className="text-lg font-bold text-[#166534]">{formatDate(plantingGuidance.startSeedsIndoors)}</p>
                      {plantingGuidance.weeksBeforeLastFrost && (
                        <p className="text-xs text-[#166534] mt-1">
                          {plantingGuidance.weeksBeforeLastFrost} weeks before last frost
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {plantingGuidance.transplantDate && (
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-[#16a34a] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#166534] mb-1">Transplant Outdoors</p>
                      <p className="text-lg font-bold text-[#166534]">{formatDate(plantingGuidance.transplantDate)}</p>
                      <p className="text-xs text-[#166534] mt-1">1 week after last frost for safety</p>
                    </div>
                  </div>
                )}
                {plantingGuidance.directSowDate && (
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-[#16a34a] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#166534] mb-1">Direct Sow</p>
                      <p className="text-lg font-bold text-[#166534]">{formatDate(plantingGuidance.directSowDate)}</p>
                    </div>
                  </div>
                )}
                {/* Harvest Dates - All Scenarios */}
                {(plantingGuidance.harvestDates?.fromIndoorStart || 
                  plantingGuidance.harvestDates?.fromTransplantedStart || 
                  plantingGuidance.harvestDates?.fromDirectSow) && (
                  <div className="pt-3 border-t border-[#86efac]">
                    <p className="text-xs font-semibold text-[#166534] mb-3">Expected Harvest Dates</p>
                    <div className="space-y-3">
                      {plantingGuidance.harvestDates.fromIndoorStart && (
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-[#3b82f6] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#166534] mb-1">If Started Indoors</p>
                            <p className="text-lg font-bold text-[#166534]">{formatDate(plantingGuidance.harvestDates.fromIndoorStart)}</p>
                            {seed.daysToMaturity && (
                              <p className="text-xs text-[#166534] mt-1">
                                {seed.daysToMaturity} days after transplant
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {plantingGuidance.harvestDates.fromTransplantedStart && (
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#166534] mb-1">If Transplanted Start</p>
                            <p className="text-lg font-bold text-[#166534]">{formatDate(plantingGuidance.harvestDates.fromTransplantedStart)}</p>
                            {seed.daysToMaturity && (
                              <p className="text-xs text-[#166534] mt-1">
                                {seed.daysToMaturity} days after transplant
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {plantingGuidance.harvestDates.fromDirectSow && (
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#166534] mb-1">If Direct Sowed</p>
                            <p className="text-lg font-bold text-[#166534]">{formatDate(plantingGuidance.harvestDates.fromDirectSow)}</p>
                            {seed.daysToMaturity && (
                              <p className="text-xs text-[#166534] mt-1">
                                {seed.daysToMaturity} days after planting
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Legacy support */}
                {!plantingGuidance.harvestDates && plantingGuidance.expectedHarvestDate && (
                  <div className="flex items-start gap-2 pt-2 border-t border-[#86efac]">
                    <svg className="w-5 h-5 text-[#16a34a] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#166534] mb-1">Expected Harvest</p>
                      <p className="text-lg font-bold text-[#166534]">{formatDate(plantingGuidance.expectedHarvestDate)}</p>
                      {seed.daysToMaturity && (
                        <p className="text-xs text-[#166534] mt-1">
                          {seed.daysToMaturity} days to maturity
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {plantingGuidance.recommendations.length > 0 && (
                  <div className="pt-2 border-t border-[#86efac]">
                    <p className="text-xs font-medium text-[#166534] mb-2">Tips:</p>
                    <ul className="space-y-1">
                      {plantingGuidance.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-[#166534] flex items-start gap-2">
                          <span className="text-[#16a34a] mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              </>
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
