/**
 * Supabase Storage helpers for seed packet photos.
 * Path format: {user_id}/{seed_id}/{photo_id}.jpg
 * (Legacy rows used .../front.jpg | back.jpg — those paths still resolve.)
 */

import type { Seed } from '@/types/seed';
import { supabase } from './supabase';

const BUCKET = 'seed-photos';

/** Resolved srcs for every photo on a seed, in order. */
export function seedPhotoSrcs(seed: Pick<Seed, 'photos'>): string[] {
  return (seed.photos ?? []).map((photo) => photo.path).filter(Boolean);
}

/** The first photo's src, or undefined. Use for thumbnails / single-image surfaces. */
export function primarySeedPhotoSrc(seed: Pick<Seed, 'photos'>): string | undefined {
  return seed.photos?.[0]?.path || undefined;
}

export function getPhotoPath(userId: string, seedId: string, photoId: string): string {
  return `${userId}/${seedId}/${photoId}.jpg`;
}

/**
 * Upload a photo to storage under its stable photo id. Returns the storage path.
 */
export async function uploadSeedPhoto(
  userId: string,
  seedId: string,
  photoId: string,
  blob: Blob
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const path = getPhotoPath(userId, seedId, photoId);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

  if (error) throw new Error(`Failed to upload photo: ${error.message}`);
  return path;
}

/** Expiry for signed URLs (1 hour) */
const SIGNED_URL_EXPIRY = 3600;

/**
 * Get public URL for a photo path. Use for public buckets without RLS.
 */
export function getPhotoUrl(path: string | null | undefined): string | undefined {
  if (!path || !supabase) return undefined;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Resolve a stored photo reference to a renderable src.
 * Data URLs and absolute URLs pass through untouched (legacy base64, already-signed);
 * everything else is treated as a storage path and resolved to a public URL.
 */
export function resolvePhotoSrc(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return getPhotoUrl(value);
}

/**
 * Get signed URL for a photo path. Use for private buckets or when public URL fails.
 * The signed URL works for anyone during its validity period.
 */
export async function getSignedPhotoUrl(path: string | null | undefined): Promise<string | undefined> {
  if (!path || !supabase) return undefined;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error) {
    console.warn('[seed-photos] Failed to create signed URL:', error);
    return undefined;
  }
  return data?.signedUrl;
}

/**
 * Delete every photo for a seed from storage by listing its folder.
 * Covers both new {photo_id}.jpg objects and legacy front/back.jpg.
 */
export async function deleteSeedPhotos(userId: string, seedId: string): Promise<void> {
  if (!supabase) return;

  const folder = `${userId}/${seedId}`;
  const { data, error } = await supabase.storage.from(BUCKET).list(folder);
  if (error) {
    console.warn('[seed-photos] Failed to list photos for deletion:', error);
    return;
  }
  const paths = (data ?? []).map((obj) => `${folder}/${obj.name}`);
  if (paths.length === 0) return;

  await supabase.storage.from(BUCKET).remove(paths);
}
