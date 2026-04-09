"use client";

import { useCallback, useRef, useState } from "react";
import { Seed } from "@/types/seed";
import { AIExtractedData } from "@/lib/packetReaderAI";
import { saveSeed } from "@/lib/storage";
import { processImageFile } from "@/lib/imageUtils";
import { AddSeedForm } from "@/components/AddSeedForm";
import { BulkCameraCapture } from "@/components/BulkCameraCapture";
import { useImportQueue, QueueItem } from "@/hooks/useImportQueue";
import { buildPileQueueItems } from "@/lib/import/capturePipeline";
import toast from "react-hot-toast";
import { normalizeSunRequirement } from "@/lib/seedUtils";

interface BatchImportProps {
  userId: string;
  userTier?: string;
  canUseAI?: boolean;
}

function extractedToInitialSeed(
  extracted: AIExtractedData,
  objectUrl: string,
): Seed {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: extracted.name || "",
    variety: extracted.variety || extracted.latinName || "",
    type: "other",
    brand: extracted.brand,
    year: extracted.year,
    quantity: extracted.quantity,
    daysToGermination: extracted.daysToGermination,
    daysToMaturity: extracted.daysToMaturity,
    plantingDepth: extracted.plantingDepth,
    spacing: extracted.spacing,
    sunRequirement: normalizeSunRequirement(extracted.sunRequirement),
    notes:
      [extracted.description, extracted.plantingInstructions]
        .filter(Boolean)
        .join("\n\n") || undefined,
    photoFront: objectUrl,
  };
}

export function BatchImport({
  userId,
  userTier = "Seed Stash Starter",
  canUseAI = true,
}: BatchImportProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pileLoading, setPileLoading] = useState(false);
  const [isBulkCameraOpen, setIsBulkCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pileInputRef = useRef<HTMLInputElement>(null);
  const {
    items,
    enqueueFiles,
    enqueueCapturedImages,
    enqueuePileItems,
    removeItem,
    retryItem,
    saveItem,
    saveAllReady,
    updateAfterManualSave,
    counts,
  } = useImportQueue({ userId });

  const handlePilePhoto = useCallback(
    async (file: File) => {
      setPileLoading(true);
      try {
        const processed = await processImageFile(file);
        const formData = new FormData();
        formData.append("image", processed);
        const res = await fetch("/api/packet/read-ai-pile", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(
            "I'm having trouble reading that photo. Try again or use a clearer shot.",
          );
          return;
        }
        const seeds: AIExtractedData[] = json.seeds ?? [];
        if (seeds.length === 0) {
          toast.error(
            "I couldn't spot any packets in that photo. Try a closer shot with good lighting.",
          );
          return;
        }
        const preparedItems = buildPileQueueItems(file, seeds);
        enqueuePileItems(preparedItems, { autoSaveOnReady: false });
      } catch (error) {
        toast.error(
          "I'm having trouble reading that photo. Try again or use a clearer shot.",
        );
      } finally {
        setPileLoading(false);
      }
    },
    [enqueuePileItems],
  );

  const handleEditSave = useCallback(
    async (
      seedData: Omit<Seed, "id" | "createdAt" | "updatedAt"> & { id?: string },
    ) => {
      const itemId = editingItemId;
      setEditingItemId(null);
      if (!itemId) return;
      try {
        const saved = await saveSeed(seedData);
        updateAfterManualSave(itemId, saved);
      } catch (error) {
        toast.error("I couldn't save that seed. Try again in a moment.");
        retryItem(itemId, { autoSaveOnReady: false });
      }
    },
    [editingItemId, retryItem, updateAfterManualSave],
  );

  const editingItem = items.find((item) => item.id === editingItemId);
  const hasItems = counts.totalCount > 0;

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    enqueueFiles(event.dataTransfer.files, {
      source: "manual-upload",
      autoSaveOnReady: false,
    });
  };

  if (editingItem) {
    const initialData = editingItem.extracted
      ? extractedToInitialSeed(editingItem.extracted, editingItem.objectUrl)
      : {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          name: "",
          variety: "",
          type: "other" as const,
          photoFront: editingItem.objectUrl,
        };

    return (
      <div className="min-h-screen w-full bg-white flex flex-col pt-20 pb-24">
        <AddSeedForm
          userId={userId}
          userTier={userTier}
          canUseAI={canUseAI}
          initialData={initialData}
          onSubmit={handleEditSave}
          onClose={() => setEditingItemId(null)}
          asPage
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f9fafb] flex flex-col">
      {isBulkCameraOpen && (
        <BulkCameraCapture
          onCapturePair={(front, back) => {
            enqueueCapturedImages([{ file: front, backFile: back }], {
              source: "bulk-camera",
              autoSaveOnReady: true,
            });
          }}
          onDone={() => setIsBulkCameraOpen(false)}
        />
      )}
      <main className="flex-1 w-full px-4 py-4 pt-24 pb-24 max-w-[1600px] mx-auto md:px-6 lg:px-8">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-[#4a5565]">Import seeds</h1>
          <p className="text-sm text-[#99a1af] mt-1">
            Upload packet photos and we&apos;ll extract the details
            automatically.
          </p>
        </div>

        <div className="grid gap-2 mb-4">
          <button
            onClick={() => setIsBulkCameraOpen(true)}
            className="w-full py-3 px-4 rounded-xl bg-[#16a34a] text-white font-semibold hover:bg-[#15803d] transition-colors"
          >
            Start bulk photographing
          </button>
          <button
            onClick={() => pileInputRef.current?.click()}
            disabled={pileLoading}
            className="w-full py-3 px-4 flex items-center justify-center gap-2 border border-gray-300 rounded-xl text-sm font-medium text-[#4a5565] bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pileLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-[#16a34a]"
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
                Scanning pile...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Photograph a pile — scan many at once
              </>
            )}
          </button>
          <input
            ref={pileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handlePilePhoto(file);
              }
              event.target.value = "";
            }}
            className="hidden"
          />
        </div>

        {hasItems && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3">
            <div className="text-sm text-[#4a5565]">
              Processing {counts.processingCount} • Saved {counts.savedCount} •
              Needs review {counts.needsReviewCount}
              {counts.queuedSeedImageCount > 0 && (
                <>
                  {" "}
                  •{" "}
                  <span className="text-amber-600">
                    {counts.queuedSeedImageCount} queued (AI limit)
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !hasItems && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors mb-3 ${
            isDragging
              ? "border-[#16a34a] bg-[#f0fdf4] cursor-copy"
              : hasItems
                ? "border-gray-200 bg-white cursor-default"
                : "border-gray-300 hover:border-[#16a34a] hover:bg-[#f0fdf4] cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              if (event.target.files) {
                enqueueFiles(event.target.files, {
                  source: "manual-upload",
                  autoSaveOnReady: false,
                });
              }
              event.target.value = "";
            }}
            className="hidden"
          />

          {hasItems ? (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-[#6a7282]">
                {counts.savedCount} of {counts.totalCount} saved
              </span>
              <div className="flex gap-2 flex-wrap">
                {counts.readyCount > 0 && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void saveAllReady();
                    }}
                    className="px-3 py-1.5 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] transition-colors"
                  >
                    Save {counts.readyCount} ready
                  </button>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 text-sm text-[#6a7282] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Add more
                </button>
              </div>
            </div>
          ) : (
            <div>
              <svg
                className="w-10 h-10 text-gray-300 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-[#4a5565] font-medium">
                Drop photos here or click to select
              </p>
              <p className="text-sm text-[#99a1af] mt-1">
                Select multiple images at once
              </p>
            </div>
          )}
        </div>

        {hasItems && (
          <div className="space-y-2">
            {items.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                onConfirm={() => void saveItem(item.id)}
                onEdit={() => setEditingItemId(item.id)}
                onSkip={() => removeItem(item.id)}
                onRetry={() =>
                  retryItem(item.id, {
                    autoSaveOnReady: item.source === "bulk-camera",
                  })
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface QueueCardProps {
  item: QueueItem;
  onConfirm: () => void;
  onEdit: () => void;
  onSkip: () => void;
  onRetry: () => void;
}

function QueueCard({
  item,
  onConfirm,
  onEdit,
  onSkip,
  onRetry,
}: QueueCardProps) {
  const label = item.savedSeed
    ? item.savedSeed.variety || item.savedSeed.name
    : item.extracted
      ? item.extracted.variety || item.extracted.name || item.file.name
      : item.file.name;

  return (
    <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
      <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden bg-gray-100">
        <img
          src={item.objectUrl}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[#4a5565] truncate text-sm">
          {label}
        </div>
        <StatusLabel item={item} />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {item.status === "ready" && (
          <>
            <button
              onClick={onConfirm}
              className="px-2.5 py-1.5 text-xs font-medium bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] transition-colors"
            >
              Save
            </button>
            <button
              onClick={onEdit}
              className="px-2.5 py-1.5 text-xs font-medium text-[#4a5565] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onSkip}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Skip"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </>
        )}
        {item.status === "queued_seed_image" && (
          <>
            <button
              onClick={onRetry}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onEdit}
              className="px-2.5 py-1.5 text-xs font-medium text-[#4a5565] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onSkip}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Skip"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </>
        )}
        {item.status === "needs_review" && (
          <>
            <button
              onClick={onRetry}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onEdit}
              className="px-2.5 py-1.5 text-xs font-medium text-[#4a5565] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onSkip}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Skip"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </>
        )}
        {item.status === "saved" && (
          <span className="text-xs font-medium text-[#16a34a] flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

function StatusLabel({ item }: { item: QueueItem }) {
  if (item.status === "pending")
    return <span className="text-xs text-[#99a1af]">Queued</span>;
  if (item.status === "extracting") {
    return (
      <span className="text-xs text-[#16a34a] flex items-center gap-1">
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
        Processing…
      </span>
    );
  }
  if (item.status === "saving") {
    return (
      <span className="text-xs text-[#99a1af] flex items-center gap-1">
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
        Saving…
      </span>
    );
  }
  if (item.status === "ready") {
    const parts = [
      item.extracted?.name,
      item.extracted?.year && String(item.extracted.year),
    ].filter(Boolean);
    return (
      <span className="text-xs text-[#6a7282]">
        {parts.length > 0 ? parts.join(" · ") : "Ready to save"}
      </span>
    );
  }
  if (item.status === "saved")
    return <span className="text-xs text-[#99a1af]">Saved to collection</span>;
  if (item.status === "queued_seed_image") {
    return (
      <span className="text-xs text-amber-600 break-words">
        Queued seed image — retry when your AI limit resets
      </span>
    );
  }
  if (item.status === "needs_review") {
    return (
      <span className="text-xs text-red-500 break-words">
        {item.errorMessage || "I couldn't process this one. Try again."}
      </span>
    );
  }
  return null;
}
