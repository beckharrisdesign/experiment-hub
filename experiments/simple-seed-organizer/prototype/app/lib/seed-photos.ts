/**
 * Supabase Storage helpers for seed packet photos.
 * Path format: {user_id}/{seed_id}/front.jpg | back.jpg
 */

import { supabase } from './supabase';

const BUCKET = 'seed-photos';

export function getPhotoPath(userId: string, seedId: string, side: 'front' | 'back'): string {
  return `${userId}/${seedId}/${side}.jpg`;
}

/**
 * Upload a photo to storage. Returns the storage path.
 */
export async function uploadSeedPhoto(
  userId: string,
  seedId: string,
  side: 'front' | 'back',
  blob: Blob
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const path = getPhotoPath(userId, seedId, side);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

  if (error) throw new Error(`Failed to upload ${side} photo: ${error.message}`);
  return path;
}

/**
 * Get public URL for a photo path.
 */
export function getPhotoUrl(path: string | null | undefined): string | undefined {
  if (!path || !supabase) return undefined;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete photos for a seed from storage.
 */
export async function deleteSeedPhotos(userId: string, seedId: string): Promise<void> {
  if (!supabase) return;

  const paths = [
    getPhotoPath(userId, seedId, 'front'),
    getPhotoPath(userId, seedId, 'back'),
  ];

  await supabase.storage.from(BUCKET).remove(paths);
}
