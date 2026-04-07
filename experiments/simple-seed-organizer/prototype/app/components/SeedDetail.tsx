"use client";

import { useState, useEffect } from "react";
import { Seed } from "@/types/seed";
import { getSeedAge } from "@/lib/storage";
import { getPlantingGuidance } from "@/lib/plantingGuidance";
import { getProfile } from "@/lib/storage";
import { SeedPill, SeedPillTone } from "@/components/SeedPill";
import toast from "react-hot-toast";

interface SeedDetailProps {
  seed: Seed;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Called with the updated seed after AI enrichment succeeds */
  onUpdate?: (seed: Seed) => void;
  /** When true, renders as page content (no fixed overlay) for routed views */
  asPage?: boolean;
}

function getAgeLabel(age: number): { text: string; tone: SeedPillTone } {
  if (age <= 0) return { text: "New this year", tone: "success" };
  if (age === 1) return { text: "1 year old", tone: "warning" };
  if (age === 2) return { text: "2 years old", tone: "warning" };
  return {
    text: `${age} years old`,
    tone: "attention",
  };
}

function InfoCategory({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[16px] font-semibold text-[#4a5565] leading-5">
        {label}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-[14px] text-[#6a7282]">
      <span className="flex-1 font-medium leading-6">{label}</span>
      <span className="font-normal leading-6 text-right">{value}</span>
    </div>
  );
}

function PlantingCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#faf5ff] border border-[#e9d4ff] rounded-lg p-[13px] flex flex-col gap-1 flex-shrink-0">
      <p className="text-[12px] font-medium text-[#8200db] leading-4 whitespace-nowrap">
        {label}
      </p>
      <p className="text-[18px] font-bold text-[#59168b] leading-7">{value}</p>
    </div>
  );
}

function GrowthStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#eff6ff] border border-[#bedbff] rounded-lg p-[13px] flex flex-col gap-1 flex-shrink-0">
      <p className="text-[12px] font-medium text-[#1447e6] leading-4 whitespace-nowrap">
        {label}
      </p>
      <p className="text-[18px] font-bold text-[#1c398e] leading-7">{value}</p>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateString(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SeedDetail({
  seed: seedProp,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
  asPage,
}: SeedDetailProps) {
  // Local copy so AI enrichment updates the view immediately
  const [seed, setSeed] = useState<Seed>(seedProp);
  const [enriching, setEnriching] = useState(false);
  const [enrichedFields, setEnrichedFields] = useState<string[]>([]);

  useEffect(() => {
    setSeed(seedProp);
  }, [seedProp]);

  const age = getSeedAge(seed);
  const ageLabel = seed.year ? getAgeLabel(age) : null;
  const [plantingGuidance, setPlantingGuidance] = useState<ReturnType<
    typeof getPlantingGuidance
  > | null>(null);

  useEffect(() => {
    setPlantingGuidance(getPlantingGuidance(seed));
  }, [seed]);

  const hasMissingGrowingData = !seed.daysToGermination || !seed.daysToMaturity;

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const res = await fetch("/api/seeds/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ seedId: seed.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          "I'm having trouble fetching growing info right now. Try again in a few minutes.",
        );
        return;
      }
      const enriched: string[] = json.enriched ?? [];
      const patch: Partial<Seed> = {};
      for (const field of enriched) {
        const key = field as keyof Seed;
        if (json.seed[key] !== undefined) {
          (patch as Record<string, unknown>)[key] = json.seed[key];
        }
      }
      setSeed((prev) => ({ ...prev, ...patch }));
      setEnrichedFields(enriched);
      onUpdate?.({ ...seed, ...patch });
    } catch (e) {
      toast.error(
        "I'm having trouble fetching growing info right now. Try again in a few minutes.",
      );
    } finally {
      setEnriching(false);
    }
  };

  const wrapperClass = asPage
    ? "min-h-screen w-full bg-[#f3f4f6] flex flex-col pt-20 pb-24"
    : "fixed top-[72px] left-0 right-0 bottom-0 bg-[#f3f4f6] z-40 flex flex-col";

  return (
    <div className={wrapperClass}>
      {/* Subheader */}
      <div className="bg-white border-b border-[#e5e7eb]">
        <div className="max-w-[1200px] mx-auto px-2 flex items-center justify-between h-[73px]">
          <button onClick={onClose} className="p-2">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-[18px] font-semibold text-[#101828]">
            Seed details
          </h1>
          <button
            onClick={onEdit}
            className="px-2 py-2 text-[16px] text-[#16a34a]"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mx-auto max-w-[1200px] my-0">
          <div className="flex flex-col gap-4 items-center py-8 px-4">
            {/* Packet Title Lockup */}
            <div className="w-full pb-2">
              <div className="flex gap-4 items-start w-full">
                {/* Left: name + variety */}
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                  <h2 className="text-[34px] font-bold text-[#101828] leading-tight">
                    {seed.name || seed.variety}
                  </h2>
                  {seed.variety && seed.name && (
                    <p className="text-[16px] text-[#6a7282] leading-6">
                      {seed.variety}
                    </p>
                  )}
                </div>
                {/* Right: badges */}
                <div className="flex-shrink-0 w-[201px] flex flex-wrap gap-2 justify-end">
                  {ageLabel && (
                    <SeedPill as="span" variant="badge" tone={ageLabel.tone}>
                      {ageLabel.text}
                    </SeedPill>
                  )}
                  {(age >= 3 || seed.useFirst) && (
                    <SeedPill as="span" variant="badge" tone="attention">
                      Use first
                    </SeedPill>
                  )}
                  {seed.type && seed.type !== "other" && (
                    <SeedPill
                      as="span"
                      variant="badge"
                      tone="attention"
                      className="capitalize"
                    >
                      {seed.type}
                    </SeedPill>
                  )}
                  {seed.sunRequirement && (
                    <SeedPill as="span" variant="badge" tone="neutral">
                      {seed.sunRequirement === "full-sun"
                        ? "Full sun"
                        : seed.sunRequirement === "partial-shade"
                          ? "Part shade"
                          : "Full shade"}
                    </SeedPill>
                  )}
                </div>
              </div>
            </div>

            {/* Packet Images */}
            <div className="w-full">
              <div className="flex gap-4 items-center overflow-x-auto pr-2 py-2">
                {/* Front photo */}
                <div className="relative flex-shrink-0 w-[192.5px] h-[256px]">
                  {seed.photoFront ? (
                    <>
                      <img
                        src={seed.photoFront}
                        alt="Front of seed packet"
                        loading="lazy"
                        className="w-full h-full object-contain rounded-lg border border-gray-200 bg-white"
                      />
                      <p className="absolute bottom-[15px] left-0 right-0 text-center text-[12px] text-white font-normal leading-4">
                        Front
                      </p>
                    </>
                  ) : (
                    <div className="w-full h-full bg-[#d4d4d4] rounded-lg flex items-center justify-center">
                      <span className="text-white text-[48px] font-normal leading-4">
                        +
                      </span>
                    </div>
                  )}
                </div>

                {/* Back photo */}
                <div className="relative flex-shrink-0 w-[192.5px] h-[256px]">
                  {seed.photoBack ? (
                    <>
                      <img
                        src={seed.photoBack}
                        alt="Back of seed packet"
                        loading="lazy"
                        className="w-full h-full object-contain rounded-lg border border-gray-200 bg-white"
                      />
                      <p className="absolute bottom-[15px] left-0 right-0 text-center text-[12px] text-white font-normal leading-4">
                        Back
                      </p>
                    </>
                  ) : (
                    <div className="w-full h-full bg-[#d4d4d4] rounded-lg flex items-center justify-center">
                      <span className="text-white text-[48px] font-normal leading-4">
                        +
                      </span>
                    </div>
                  )}
                </div>

                {/* Additional empty slots */}
                {[3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="relative flex-shrink-0 w-[192.5px] h-[256px] bg-[#d4d4d4] rounded-lg flex items-center justify-center"
                  >
                    <span className="text-white text-[48px] font-normal leading-4">
                      +
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-Col Section: Planting + Metadata */}
            <div className="w-full p-4">
              {/* Section heading */}
              <h3 className="text-[20px] font-semibold text-[#4a5565] leading-5 mb-0">
                Planting in your region
              </h3>

              <div className="flex gap-4 items-start pt-4">
                {/* Col 1: Planting cards + Notes */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  {/* Planting date cards */}
                  {plantingGuidance?.hasData ? (
                    <div className="flex gap-[10px] items-start flex-wrap">
                      {plantingGuidance.startSeedsIndoors && (
                        <PlantingCard
                          label="Sow indoors"
                          value={formatDate(plantingGuidance.startSeedsIndoors)}
                        />
                      )}
                      {plantingGuidance.firstFrostDate && (
                        <PlantingCard
                          label="First Frost"
                          value={formatDate(plantingGuidance.firstFrostDate)}
                        />
                      )}
                      {plantingGuidance.transplantDate && (
                        <PlantingCard
                          label="Transplant"
                          value={formatDate(plantingGuidance.transplantDate)}
                        />
                      )}
                      {plantingGuidance.directSowDate && (
                        <PlantingCard
                          label="Sow outdoors"
                          value={formatDate(plantingGuidance.directSowDate)}
                        />
                      )}
                      {plantingGuidance.lastFrostDate && (
                        <PlantingCard
                          label="Last Frost"
                          value={formatDate(plantingGuidance.lastFrostDate)}
                        />
                      )}
                    </div>
                  ) : (
                    plantingGuidance && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-[14px] text-[#6a7282]">
                          {plantingGuidance.recommendations[0]}
                        </p>
                      </div>
                    )
                  )}

                  {/* Notes */}
                  {seed.notes && (
                    <div className="flex flex-col gap-2 pt-4 pr-4">
                      <p className="text-[16px] font-semibold text-[#4a5565] leading-5">
                        Notes
                      </p>
                      <p className="text-[16px] text-[#101828] leading-[26px] whitespace-pre-wrap">
                        {seed.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Col 2: Metadata sidebar (305px) */}
                <div className="flex-shrink-0 w-[343px] flex flex-col gap-4">
                  {/* Growth stat cards */}
                  {(seed.daysToGermination || seed.daysToMaturity) && (
                    <div className="flex flex-wrap gap-2">
                      {seed.daysToGermination && (
                        <GrowthStatCard
                          label="Days to germination"
                          value={seed.daysToGermination}
                        />
                      )}
                      {seed.daysToMaturity && (
                        <GrowthStatCard
                          label="Days to maturity"
                          value={seed.daysToMaturity}
                        />
                      )}
                    </div>
                  )}

                  {/* Packet info category */}
                  {(seed.type ||
                    seed.brand ||
                    seed.source ||
                    seed.year ||
                    seed.purchaseDate ||
                    seed.quantity) && (
                    <InfoCategory label="Packet info">
                      <InfoRow
                        label="Type"
                        value={
                          seed.type
                            ? seed.type.charAt(0).toUpperCase() +
                              seed.type.slice(1)
                            : undefined
                        }
                      />
                      <InfoRow label="Brand" value={seed.brand} />
                      <InfoRow label="Source" value={seed.source} />
                      <InfoRow label="Year" value={seed.year?.toString()} />
                      <InfoRow
                        label="Purchase date"
                        value={
                          seed.purchaseDate
                            ? formatDateString(seed.purchaseDate)
                            : undefined
                        }
                      />
                      <InfoRow label="Quantity" value={seed.quantity} />
                    </InfoCategory>
                  )}

                  {/* Growing info category */}
                  {(seed.plantingDepth ||
                    seed.spacing ||
                    seed.sunRequirement ||
                    seed.customExpirationDate) && (
                    <InfoCategory label="Growing info">
                      <InfoRow
                        label="Planting depth"
                        value={seed.plantingDepth}
                      />
                      <InfoRow label="Spacing" value={seed.spacing} />
                      <InfoRow
                        label="Sun requirement"
                        value={seed.sunRequirement?.replace("-", " ")}
                      />
                      <InfoRow
                        label="Custom expiration"
                        value={
                          seed.customExpirationDate
                            ? formatDateString(seed.customExpirationDate)
                            : undefined
                        }
                      />
                    </InfoCategory>
                  )}

                  {/* AI enrichment */}
                  {hasMissingGrowingData && (
                    <div>
                      {enrichedFields.length > 0 ? (
                        <p className="text-xs text-[#16a34a] text-center">
                          ✓ Growing data filled by AI
                        </p>
                      ) : (
                        <button
                          onClick={handleEnrich}
                          disabled={enriching}
                          className="w-full py-2 text-xs font-medium text-[#16a34a] border border-[#bbf7d0] rounded-lg hover:bg-[#f0fdf4] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {enriching ? (
                            <>
                              <svg
                                className="w-3 h-3 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Enriching…
                            </>
                          ) : (
                            "Fill gaps with AI"
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Delete */}
                  <div className="pt-2">
                    <button
                      onClick={onDelete}
                      className="w-full py-2 text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      Delete seed
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
