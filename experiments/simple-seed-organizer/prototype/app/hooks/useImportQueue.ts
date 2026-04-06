"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AIExtractedData } from "@/lib/packetReaderAI";
import { saveSeed } from "@/lib/storage";
import { uploadSeedPhoto } from "@/lib/seed-photos";
import { processImageFile } from "@/lib/imageUtils";
import { Seed } from "@/types/seed";
import {
  buildQueueItemsFromFiles,
  CapturedSeedImage,
  QueuePileItem,
  QueueItemSource,
} from "@/lib/import/capturePipeline";

const CONCURRENCY = 3;

export type QueueStatus =
  | "pending"
  | "extracting"
  | "ready"
  | "saving"
  | "saved"
  | "needs_review";

export interface QueueItem {
  id: string;
  file: File;
  backFile?: File;
  objectUrl: string;
  status: QueueStatus;
  source: QueueItemSource;
  extracted?: AIExtractedData;
  savedSeed?: Seed;
  errorMessage?: string;
  capturedAt: string;
}

interface UseImportQueueOptions {
  userId: string;
}

interface EnqueueOptions {
  source: QueueItemSource;
  autoSaveOnReady?: boolean;
}

function normalizeSunRequirement(
  text?: string,
): "full-sun" | "partial-shade" | "full-shade" | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower.includes("full sun") || lower.includes("full-sun"))
    return "full-sun";
  if (lower.includes("partial") || lower.includes("part shade"))
    return "partial-shade";
  if (lower.includes("full shade") || lower.includes("full-shade"))
    return "full-shade";
  return undefined;
}

function toSeedPayload(
  seedId: string,
  extracted: AIExtractedData,
  photoFrontPath: string,
  photoBackPath?: string,
): Omit<Seed, "createdAt" | "updatedAt"> {
  const name = extracted.name?.trim() || "Unknown";
  const variety = (
    extracted.variety ||
    extracted.latinName ||
    extracted.name ||
    "Unknown"
  ).trim();

  return {
    id: seedId,
    name,
    variety,
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
    photoFrontPath,
    photoBackPath,
  };
}

export function useImportQueue({ userId }: UseImportQueueOptions) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const activeRef = useRef(0);
  const autoSaveIdsRef = useRef(new Set<string>());

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const saveQueueItem = useCallback(
    async (item: QueueItem) => {
      if (!item.extracted) return;
      updateItem(item.id, { status: "saving", errorMessage: undefined });
      try {
        const seedId = crypto.randomUUID();
        const processed = await processImageFile(item.file);
        const photoFrontPath = await uploadSeedPhoto(
          userId,
          seedId,
          "front",
          processed,
        );
        let photoBackPath: string | undefined;
        if (item.backFile) {
          const processedBack = await processImageFile(item.backFile);
          photoBackPath = await uploadSeedPhoto(
            userId,
            seedId,
            "back",
            processedBack,
          );
        }
        const saved = await saveSeed(
          toSeedPayload(seedId, item.extracted, photoFrontPath, photoBackPath),
        );
        updateItem(item.id, {
          status: "saved",
          savedSeed: saved,
          errorMessage: undefined,
        });
        autoSaveIdsRef.current.delete(item.id);
      } catch (err) {
        updateItem(item.id, {
          status: "needs_review",
          errorMessage:
            err instanceof Error
              ? err.message
              : "I couldn't save that seed. Try again in a moment.",
        });
      }
    },
    [updateItem, userId],
  );

  const extractQueueItem = useCallback(
    async (item: QueueItem) => {
      activeRef.current += 1;
      updateItem(item.id, { status: "extracting", errorMessage: undefined });

      try {
        const processed = await processImageFile(item.file);
        const formData = new FormData();

        let res: Response;
        let json: { data?: AIExtractedData; message?: string };

        if (item.backFile) {
          // Use the two-image endpoint when we have both sides
          const processedBack = await processImageFile(item.backFile);
          formData.append("frontImage", processed);
          formData.append("backImage", processedBack);
          res = await fetch("/api/packet/read-ai", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          json = await res.json();
        } else {
          formData.append("image", processed);
          formData.append("side", "front");
          res = await fetch("/api/packet/read-ai-single", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          json = await res.json();
        }

        if (!res.ok) {
          updateItem(item.id, {
            status: "needs_review",
            errorMessage:
              res.status === 402
                ? "You've used all your AI scans for this month. Upgrade to keep going."
                : json.message ||
                  "I couldn't read that packet. Try again or enter details manually.",
          });
          autoSaveIdsRef.current.delete(item.id);
          return;
        }

        updateItem(item.id, {
          status: "ready",
          extracted: json.data,
          errorMessage: undefined,
        });
      } catch (err) {
        updateItem(item.id, {
          status: "needs_review",
          errorMessage:
            err instanceof Error
              ? err.message
              : "I couldn't reach the server. Check your connection and try again.",
        });
        autoSaveIdsRef.current.delete(item.id);
      } finally {
        activeRef.current -= 1;
        setItems((prev) => [...prev]);
      }
    },
    [updateItem],
  );

  useEffect(() => {
    const pending = items.filter((item) => item.status === "pending");
    const availableSlots = Math.min(
      CONCURRENCY - activeRef.current,
      pending.length,
    );
    if (availableSlots <= 0) return;
    pending.slice(0, availableSlots).forEach((item) => {
      void extractQueueItem(item);
    });
  }, [items, extractQueueItem]);

  useEffect(() => {
    const autoSaveCandidates = items.filter(
      (item) => item.status === "ready" && autoSaveIdsRef.current.has(item.id),
    );
    autoSaveCandidates.forEach((item) => {
      void saveQueueItem(item);
    });
  }, [items, saveQueueItem]);

  const enqueueCapturedImages = useCallback(
    (images: CapturedSeedImage[], options: EnqueueOptions) => {
      const queueImageItems = buildQueueItemsFromFiles(images, options.source);
      if (queueImageItems.length === 0) return;

      const queueItems: QueueItem[] = queueImageItems.map((item) => ({
        id: item.id,
        file: item.file,
        backFile: item.backFile,
        objectUrl: item.objectUrl,
        source: item.source,
        capturedAt: item.capturedAt,
        status: "pending",
        errorMessage: undefined,
      }));

      if (options.autoSaveOnReady) {
        queueItems.forEach((item) => autoSaveIdsRef.current.add(item.id));
      }

      setItems((prev) => [...prev, ...queueItems]);
    },
    [],
  );

  const enqueuePileItems = useCallback(
    (
      itemsToEnqueue: QueuePileItem[],
      options?: { autoSaveOnReady?: boolean },
    ) => {
      if (itemsToEnqueue.length === 0) return;

      const queueItems: QueueItem[] = itemsToEnqueue.map((item) => ({
        id: item.id,
        file: item.file,
        objectUrl: item.objectUrl,
        source: item.source,
        capturedAt: item.capturedAt,
        status: "ready",
        extracted: item.extracted,
        errorMessage: undefined,
      }));

      if (options?.autoSaveOnReady) {
        queueItems.forEach((item) => autoSaveIdsRef.current.add(item.id));
      }

      setItems((prev) => [...prev, ...queueItems]);
    },
    [],
  );

  const enqueueFiles = useCallback(
    (files: FileList | File[], options: EnqueueOptions) => {
      const acceptedFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (acceptedFiles.length === 0) return;
      enqueueCapturedImages(
        acceptedFiles.map((file) => ({ file })),
        options,
      );
    },
    [enqueueCapturedImages],
  );

  const retryItem = useCallback(
    (itemId: string, options?: { autoSaveOnReady?: boolean }) => {
      if (options?.autoSaveOnReady) {
        autoSaveIdsRef.current.add(itemId);
      } else {
        autoSaveIdsRef.current.delete(itemId);
      }
      updateItem(itemId, {
        status: "pending",
        errorMessage: undefined,
        extracted: undefined,
        savedSeed: undefined,
      });
    },
    [updateItem],
  );

  const removeItem = useCallback((itemId: string) => {
    autoSaveIdsRef.current.delete(itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const saveItem = useCallback(
    async (itemId: string) => {
      const item = items.find((queueItem) => queueItem.id === itemId);
      if (!item || item.status !== "ready") return;
      await saveQueueItem(item);
    },
    [items, saveQueueItem],
  );

  const saveAllReady = useCallback(async () => {
    const readyItems = items.filter((item) => item.status === "ready");
    await Promise.all(readyItems.map((item) => saveQueueItem(item)));
  }, [items, saveQueueItem]);

  const updateAfterManualSave = useCallback(
    (itemId: string, savedSeed: Seed) => {
      autoSaveIdsRef.current.delete(itemId);
      updateItem(itemId, {
        status: "saved",
        savedSeed,
        errorMessage: undefined,
      });
    },
    [updateItem],
  );

  const pendingCount = items.filter((item) => item.status === "pending").length;
  const processingCount = items.filter(
    (item) => item.status === "extracting" || item.status === "saving",
  ).length;
  const readyCount = items.filter((item) => item.status === "ready").length;
  const savedCount = items.filter((item) => item.status === "saved").length;
  const needsReviewCount = items.filter(
    (item) => item.status === "needs_review",
  ).length;

  return {
    items,
    enqueueFiles,
    enqueueCapturedImages,
    enqueuePileItems,
    retryItem,
    removeItem,
    saveItem,
    saveAllReady,
    updateAfterManualSave,
    counts: {
      pendingCount,
      processingCount,
      readyCount,
      savedCount,
      needsReviewCount,
      totalCount: items.length,
    },
  };
}
