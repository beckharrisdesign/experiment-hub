import { AIExtractedData } from '@/lib/packetReaderAI';

export type QueueItemSource = 'manual-upload' | 'bulk-camera' | 'pile-scan';

export interface CapturedSeedImage {
  file: File;
  capturedAt?: string;
}

export interface QueueImageItem {
  id: string;
  file: File;
  objectUrl: string;
  source: QueueItemSource;
  capturedAt: string;
}

export interface QueuePileItem extends QueueImageItem {
  extracted: AIExtractedData;
}

export function createQueueItemsFromCapturedImages(
  images: CapturedSeedImage[],
  source: QueueItemSource
): QueueImageItem[] {
  return images
    .filter((image) => image.file.type.startsWith('image/'))
    .map((image) => ({
      id: crypto.randomUUID(),
      file: image.file,
      objectUrl: URL.createObjectURL(image.file),
      source,
      capturedAt: image.capturedAt ?? new Date().toISOString(),
    }));
}

export function buildQueueItemsFromFiles(
  images: CapturedSeedImage[],
  source: QueueItemSource
): QueueImageItem[] {
  return createQueueItemsFromCapturedImages(images, source);
}

export function buildPileQueueItems(file: File, seeds: AIExtractedData[]): QueuePileItem[] {
  const objectUrl = URL.createObjectURL(file);
  return seeds.map((extracted) => ({
    id: crypto.randomUUID(),
    file,
    objectUrl,
    source: 'pile-scan',
    capturedAt: new Date().toISOString(),
    extracted,
  }));
}
