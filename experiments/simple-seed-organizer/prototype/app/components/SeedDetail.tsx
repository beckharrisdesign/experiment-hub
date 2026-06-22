"use client";

import { useState, useEffect } from "react";
import { Seed } from "@/types/seed";
import { getSeedAge } from "@/lib/storage";
import { isUseFirst } from "@/lib/viability";
import { getPlantingGuidance } from "@/lib/plantingGuidance";
import { SeedPill, type SeedPillTone } from "@/components/SeedPill";
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

type DetailTab = "planting" | "growing" | "harvesting" | "cooking";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "planting", label: "Planting" },
  { id: "growing", label: "Growing" },
  { id: "harvesting", label: "Harvesting" },
  { id: "cooking", label: "Cooking" },
];

function getAgeLabel(age: number): { text: string; tone: SeedPillTone } {
  if (age <= 0) return { text: "New this year", tone: "success" };
  if (age === 1) return { text: "1 year old", tone: "warning" };
  if (age === 2) return { text: "2 years old", tone: "warning" };
  return { text: `${age} years old`, tone: "attention" };
}

function KVRow({
  label,
  value,
  annotation,
  enriched,
}: {
  label: string;
  value?: string;
  annotation?: string;
  enriched?: boolean;
}) {
  if (!value && !annotation) return null;
  return (
    <div className="w-full">
      {value && (
        <div
          className={`flex items-center px-4 py-2 border-b border-[#e2e8f0] text-[16px] ${enriched ? "bg-[#f0fdf4]" : ""}`}
        >
          <span className="flex-1 text-[#262626]">{label}</span>
          <span className="text-[#262626] text-right">{value}</span>
        </div>
      )}
      {annotation && (
        <p className="px-4 py-1.5 text-[13px] italic text-[#6a7282] leading-5 border-b border-[#e2e8f0] bg-[#fafafa]">
          <span className="font-medium not-italic">My note:</span> {annotation}
        </p>
      )}
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

function SubHeader({
  seedName,
  onClose,
  onEdit,
  borderClass = "border-b",
}: {
  seedName: string;
  onClose: () => void;
  onEdit: () => void;
  borderClass?: string;
}) {
  return (
    <div className={`bg-white ${borderClass} border-[#e5e7eb]`}>
      <div className="max-w-[1200px] mx-auto px-2 flex items-center h-[46px]">
        <button type="button" onClick={onClose} aria-label="Go back" className="p-2 flex-shrink-0">
          <svg
            className="w-6 h-6 text-[#64748b]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <p className="flex-1 min-w-0 text-[20px] text-[#262626] text-center truncate">
          {seedName}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="flex-shrink-0 px-4 py-1.5 text-[18px] font-medium text-[#15803d] border border-[#15803d] rounded"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

export function SeedDetail({
  seed: seedProp,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
  asPage,
}: SeedDetailProps) {
  const [seed, setSeed] = useState<Seed>(seedProp);
  const [enriching, setEnriching] = useState(false);
  const [enrichedFields, setEnrichedFields] = useState<string[]>([]);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<DetailTab>("planting");

  useEffect(() => {
    setSeed(seedProp);
    setImgErrors(new Set());
  }, [seedProp]);

  const age = getSeedAge(seed);
  const ageLabel = seed.year ? getAgeLabel(age) : null;

  const [plantingGuidance, setPlantingGuidance] = useState<Awaited<
    ReturnType<typeof getPlantingGuidance>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlantingGuidance(seed).then((g) => {
      if (!cancelled) setPlantingGuidance(g);
    });
    return () => {
      cancelled = true;
    };
  }, [seed]);

  const hasMissingGrowingData = !seed.daysToGermination || !seed.daysToMaturity;
  const annotationsByField = new Map(
    (seed.instructionAnnotations ?? []).map((a) => [a.fieldKey, a.note]),
  );
  const fieldHidden = (key: string) => seed.hiddenFields?.includes(key) ?? false;
  const isEnriched = (field: string) => enrichedFields.includes(field);

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
    } catch {
      toast.error(
        "I'm having trouble fetching growing info right now. Try again in a few minutes.",
      );
    } finally {
      setEnriching(false);
    }
  };

  const seedName = seed.name || seed.variety || "Unnamed seed";
  const photos = seed.photos ?? [];
  const [primaryPhoto, ...gridPhotos] = photos;

  const wrapperClass = asPage
    ? "min-h-screen w-full bg-[#e2e8f0] flex flex-col pt-20 pb-24"
    : "fixed top-[72px] left-0 right-0 bottom-0 bg-[#e2e8f0] z-40 flex flex-col";

  return (
    <div className={wrapperClass}>
      {/* Top sub-header */}
      <SubHeader seedName={seedName} onClose={onClose} onEdit={onEdit} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title section */}
        <div className="bg-white px-4 py-2">
          <div className="max-w-[1200px] mx-auto flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[#15803d] text-2xl font-medium leading-tight">
                {seedName}
              </p>
              {seed.variety && seed.name && (
                <p className="text-[#262626] text-xl font-normal leading-tight">
                  {seed.variety}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2 justify-end max-w-[200px]">
              {ageLabel && (
                <SeedPill as="span" variant="badge" tone={ageLabel.tone}>
                  {ageLabel.text}
                </SeedPill>
              )}
              {(isUseFirst(seed.year, undefined, seed.name) ||
                seed.useFirst) && (
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

        {/* Main 2-col: plant info (left) + images (right) */}
        <div className="bg-white px-4 py-4">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-4 items-start">
            {/* Left col: tabs + KV rows */}
            <div className="w-full md:w-[380px] md:flex-shrink-0 flex flex-col">
              {/* Tab bar */}
              <div className="flex overflow-hidden border-b border-[#e2e8f0]">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-2 py-2 text-[16px] font-medium text-[#262626] whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? "bg-[#dcfce7] border-b-2 border-[#64748b]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Planting tab */}
              {activeTab === "planting" && (
                <div className="flex flex-col">
                  {plantingGuidance?.hasData ? (
                    <>
                      {plantingGuidance.startSeedsIndoors && (
                        <KVRow
                          label="Sow indoors"
                          value={formatDate(plantingGuidance.startSeedsIndoors)}
                        />
                      )}
                      {plantingGuidance.firstFrostDate && (
                        <KVRow
                          label="First frost"
                          value={formatDate(plantingGuidance.firstFrostDate)}
                        />
                      )}
                      {plantingGuidance.transplantDate && (
                        <KVRow
                          label="Transplant"
                          value={formatDate(plantingGuidance.transplantDate)}
                        />
                      )}
                      {plantingGuidance.directSowDate && (
                        <KVRow
                          label="Sow outdoors"
                          value={formatDate(plantingGuidance.directSowDate)}
                        />
                      )}
                      {plantingGuidance.lastFrostDate && (
                        <KVRow
                          label="Last frost"
                          value={formatDate(plantingGuidance.lastFrostDate)}
                        />
                      )}
                    </>
                  ) : (
                    plantingGuidance && (
                      <div className="px-4 py-3 border-b border-[#e2e8f0] text-[14px] text-[#6a7282]">
                        {plantingGuidance.recommendations[0]}
                      </div>
                    )
                  )}
                  {!fieldHidden("plantingDepth") && (
                    <KVRow
                      label="Planting depth"
                      value={seed.plantingDepth}
                      annotation={annotationsByField.get("plantingDepth")}
                      enriched={isEnriched("plantingDepth")}
                    />
                  )}
                  {!fieldHidden("spacing") && (
                    <KVRow
                      label="Spacing"
                      value={seed.spacing}
                      annotation={annotationsByField.get("spacing")}
                      enriched={isEnriched("spacing")}
                    />
                  )}
                  {!fieldHidden("sunRequirement") && seed.sunRequirement && (
                    <KVRow
                      label="Sun requirement"
                      value={seed.sunRequirement.replace("-", " ")}
                      annotation={annotationsByField.get("sunRequirement")}
                    />
                  )}
                  {seed.type && seed.type !== "other" && (
                    <KVRow
                      label="Type"
                      value={
                        seed.type.charAt(0).toUpperCase() + seed.type.slice(1)
                      }
                    />
                  )}
                  {!fieldHidden("brand") && (
                    <KVRow
                      label="Brand"
                      value={seed.brand}
                      annotation={annotationsByField.get("brand")}
                    />
                  )}
                  <KVRow label="Source" value={seed.source} />
                  {!fieldHidden("year") && (
                    <KVRow
                      label="Year"
                      value={seed.year?.toString()}
                      annotation={annotationsByField.get("year")}
                    />
                  )}
                  <KVRow
                    label="Purchase date"
                    value={
                      seed.purchaseDate
                        ? formatDateString(seed.purchaseDate)
                        : undefined
                    }
                  />
                  {!fieldHidden("quantity") && (
                    <KVRow
                      label="Quantity"
                      value={seed.quantity}
                      annotation={annotationsByField.get("quantity")}
                    />
                  )}
                  <KVRow
                    label="Custom expiration"
                    value={
                      seed.customExpirationDate
                        ? formatDateString(seed.customExpirationDate)
                        : undefined
                    }
                  />
                  {seed.customFields
                    ?.filter((f) => {
                      if (f.hidden || f.value == null) return false;
                      if (Array.isArray(f.value)) return f.value.length > 0;
                      if (typeof f.value === "string")
                        return f.value.trim() !== "";
                      return true;
                    })
                    .map((f) => (
                      <KVRow
                        key={f.id || f.label}
                        label={f.label}
                        value={String(f.value)}
                      />
                    ))}
                </div>
              )}

              {/* Growing tab */}
              {activeTab === "growing" && (
                <div className="flex flex-col">
                  {!fieldHidden("daysToGermination") && (
                    <KVRow
                      label="Days to germination"
                      value={seed.daysToGermination}
                      annotation={annotationsByField.get("daysToGermination")}
                      enriched={isEnriched("daysToGermination")}
                    />
                  )}
                  {!fieldHidden("daysToMaturity") && (
                    <KVRow
                      label="Days to maturity"
                      value={seed.daysToMaturity}
                      annotation={annotationsByField.get("daysToMaturity")}
                      enriched={isEnriched("daysToMaturity")}
                    />
                  )}
                  {hasMissingGrowingData && (
                    <div className="px-4 py-3">
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
                </div>
              )}

              {/* Harvesting tab */}
              {activeTab === "harvesting" && (
                <div className="px-4 py-4 text-[14px] text-[#6a7282]">
                  Harvesting info coming soon.
                </div>
              )}

              {/* Cooking tab */}
              {activeTab === "cooking" && (
                <div className="px-4 py-4 text-[14px] text-[#6a7282]">
                  Cooking info coming soon.
                </div>
              )}
            </div>

            {/* Right col: large primary image + 3×2 thumbnail grid */}
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-4 sm:h-[544px]">
              {/* Large primary image */}
              <div className="w-full h-48 sm:h-full sm:w-[55%] sm:flex-shrink-0 rounded-lg overflow-hidden bg-[#e2e8f0]">
                {primaryPhoto && !imgErrors.has(primaryPhoto.id) && (
                  <img
                    src={primaryPhoto.path || undefined}
                    alt={primaryPhoto.label ?? "Seed packet photo"}
                    loading="lazy"
                    className="w-full h-full object-contain"
                    onError={() =>
                      setImgErrors((prev) =>
                        new Set(prev).add(primaryPhoto.id),
                      )
                    }
                  />
                )}
              </div>

              {/* 3×2 thumbnail grid */}
              <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-4">
                {Array.from({ length: 6 }, (_, i) => {
                  const photo = gridPhotos[i];
                  const isLastSlot = i === 5;
                  const hasPhoto =
                    photo && !imgErrors.has(photo.id) && photo.path;
                  return (
                    <div
                      key={i}
                      className="rounded-lg overflow-hidden bg-[#e2e8f0] flex items-center justify-center"
                    >
                      {hasPhoto ? (
                        <img
                          src={photo.path || undefined}
                          alt={photo.label ?? `Seed photo ${i + 2}`}
                          loading="lazy"
                          className="w-full h-full object-contain"
                          onError={() =>
                            setImgErrors((prev) => new Set(prev).add(photo.id))
                          }
                        />
                      ) : isLastSlot ? (
                        <span className="text-[#15803d] text-[48px] font-normal leading-none select-none">
                          +
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Notes + packet text (full-width, below 2-col) */}
        {(seed.notes ||
          seed.myNotes ||
          (!fieldHidden("description") &&
            (seed.description || annotationsByField.get("description"))) ||
          (!fieldHidden("plantingInstructions") &&
            (seed.plantingInstructions ||
              annotationsByField.get("plantingInstructions")))) && (
          <div className="bg-white mt-[1px] px-4 py-4">
            <div className="max-w-[1200px] mx-auto flex flex-col gap-4">
              {seed.notes && (
                <div className="flex flex-col gap-2">
                  <p className="text-[16px] font-semibold text-[#4a5565] leading-5">
                    Packet notes
                  </p>
                  <p className="text-[16px] text-[#101828] leading-[26px] whitespace-pre-wrap">
                    {seed.notes}
                  </p>
                </div>
              )}
              {seed.myNotes && (
                <div className="flex flex-col gap-2">
                  <p className="text-[16px] font-semibold text-[#4a5565] leading-5">
                    My notes
                  </p>
                  <p className="text-[16px] text-[#101828] leading-[26px] whitespace-pre-wrap">
                    {seed.myNotes}
                  </p>
                </div>
              )}
              {((!fieldHidden("description") &&
                (seed.description ||
                  annotationsByField.get("description"))) ||
                (!fieldHidden("plantingInstructions") &&
                  (seed.plantingInstructions ||
                    annotationsByField.get("plantingInstructions")))) && (
                <div className="flex flex-col gap-2">
                  <p className="text-[16px] font-semibold text-[#4a5565] leading-5">
                    Printed packet text
                  </p>
                  {!fieldHidden("description") && seed.description && (
                    <p className="text-[14px] text-[#101828] leading-[22px] whitespace-pre-wrap">
                      {seed.description}
                    </p>
                  )}
                  {!fieldHidden("description") &&
                    annotationsByField.get("description") && (
                      <p className="text-[13px] italic text-[#6a7282] leading-5">
                        <span className="font-medium not-italic">My note:</span>{" "}
                        {annotationsByField.get("description")}
                      </p>
                    )}
                  {!fieldHidden("plantingInstructions") &&
                    seed.plantingInstructions && (
                      <p className="text-[14px] text-[#101828] leading-[22px] whitespace-pre-wrap">
                        <span className="font-semibold">Instructions:</span>{" "}
                        {seed.plantingInstructions}
                      </p>
                    )}
                  {!fieldHidden("plantingInstructions") &&
                    annotationsByField.get("plantingInstructions") && (
                      <p className="text-[13px] italic text-[#6a7282] leading-5">
                        <span className="font-medium not-italic">My note:</span>{" "}
                        {annotationsByField.get("plantingInstructions")}
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="bg-white mt-[1px] px-4 py-4">
          <div className="max-w-[1200px] mx-auto">
            <button
              onClick={onDelete}
              className="w-full py-2 text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              Delete seed
            </button>
          </div>
        </div>

        {/* Bottom sub-header */}
        <SubHeader
          seedName={seedName}
          onClose={onClose}
          onEdit={onEdit}
          borderClass="border-t"
        />
      </div>
    </div>
  );
}
