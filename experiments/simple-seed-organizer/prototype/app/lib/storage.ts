import { Seed } from '@/types/seed';
import { UserProfile } from '@/types/profile';
import { supabase } from './supabase';
import { getPhotoUrl, deleteSeedPhotos } from './seed-photos';
import {
  convertDbSeedToSeed,
  convertSeedToDbSeed,
  SEEDS_COLUMNS_WITHOUT_PHOTOS,
} from './seedConverters';

// Fallback to localStorage if Supabase is not configured
const STORAGE_KEY = 'simple-seed-organizer-seeds';
const PROFILE_STORAGE_KEY = 'simple-seed-organizer-profile';

/**
 * Get seed count for usage display (profile, limits).
 */
export async function getSeedCount(): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from('seeds')
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.warn('[Storage] getSeedCount error:', error);
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Get seeds without photo data - fast initial load for list view.
 * Photos can be loaded separately via getSeedPhotos() and merged.
 */
export async function getSeedsWithoutPhotos(): Promise<Seed[]> {
  if (!supabase) {
    console.warn('[Storage] Supabase not configured, returning empty array');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('seeds')
      .select(SEEDS_COLUMNS_WITHOUT_PHOTOS)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Storage] Supabase error:', error);
      throw new Error(`Failed to load seeds from database: ${error.message}`);
    }

    return (data || []).map((row) => convertDbSeedToSeed(row));
  } catch (err) {
    console.error('[Storage] Error fetching from Supabase:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to load seeds from database');
  }
}

/**
 * Get photo URLs for all seeds - use after getSeedsWithoutPhotos() for two-phase load.
 * Returns a map of seedId -> { photoFront?, photoBack? } (URLs for display).
 */
export async function getSeedPhotos(): Promise<Map<string, { photoFront?: string; photoBack?: string }>> {
  if (!supabase) return new Map();

  try {
    const { data, error } = await supabase
      .from('seeds')
      .select('id,photo_front_path,photo_back_path,photo_front,photo_back')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Storage] Failed to load seed photos:', error);
      return new Map();
    }

    const map = new Map<string, { photoFront?: string; photoBack?: string }>();
    for (const row of data || []) {
      // Prefer storage paths - use public URL for public buckets (RLS bypassed for downloads)
      let photoFront: string | undefined;
      let photoBack: string | undefined;
      if (row.photo_front_path) {
        photoFront = getPhotoUrl(row.photo_front_path) ?? undefined;
      } else if (row.photo_front) {
        photoFront = row.photo_front; // Legacy base64 fallback only when no path
      }
      if (row.photo_back_path) {
        photoBack = getPhotoUrl(row.photo_back_path) ?? undefined;
      } else if (row.photo_back) {
        photoBack = row.photo_back; // Legacy base64 fallback only when no path
      }
      if (photoFront || photoBack) {
        console.log('[getSeedPhotos]', row.id, { path: row.photo_front_path, url: photoFront?.substring(0, 60) });
      }
      map.set(row.id, { photoFront, photoBack });
    }
    return map;
  } catch (err) {
    console.warn('[Storage] Error fetching seed photos:', err);
    return new Map();
  }
}

/**
 * Get all seeds from Supabase (REQUIRED - no fallback).
 * Includes photos - use getSeedsWithoutPhotos + getSeedPhotos for faster perceived load.
 */
export async function getSeeds(): Promise<Seed[]> {
  if (!supabase) {
    console.warn('[Storage] Supabase not configured, returning empty array');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('seeds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Storage] Supabase error:', error);
      throw new Error(`Failed to load seeds from database: ${error.message}`);
    }

    // Resolve photo URLs - use public URL for public buckets
    const seeds = (data || []).map((row) => {
      let photoFront: string | undefined;
      let photoBack: string | undefined;
      if (row.photo_front_path) {
        photoFront = getPhotoUrl(row.photo_front_path) ?? undefined;
      } else if (row.photo_front) {
        photoFront = row.photo_front; // Legacy base64 only when no path
      }
      if (row.photo_back_path) {
        photoBack = getPhotoUrl(row.photo_back_path) ?? undefined;
      } else if (row.photo_back) {
        photoBack = row.photo_back; // Legacy base64 only when no path
      }
      return convertDbSeedToSeed(row, photoFront, photoBack);
    });
    return seeds;
  } catch (err) {
    console.error('[Storage] Error fetching from Supabase:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to load seeds from database');
  }
}

/**
 * Get seeds from localStorage (fallback)
 */
function getSeedsLocal(): Seed[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Save a seed to Supabase (REQUIRED - no fallback)
 */
export async function saveSeed(seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Seed> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  const newSeed: Seed = {
    ...seedData,
    id: seedData.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const dbSeed = convertSeedToDbSeed(newSeed, { mode: 'insert' });
    console.log('[Storage] Attempting to save to Supabase:', { name: newSeed.name, variety: newSeed.variety });
    
    const { data, error } = await supabase
      .from('seeds')
      .insert([dbSeed])
      .select()
      .single();

    if (error) {
      console.error('[Storage] Supabase insert error:', error);
      throw new Error(`Failed to save seed to database: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from Supabase after insert');
    }

    console.log('[Storage] Successfully saved to Supabase:', { id: data.id, name: data.name });
    return convertDbRowToSeedWithUrls(data);
  } catch (err) {
    console.error('[Storage] Error saving to Supabase:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to save seed to database');
  }
}

/**
 * Save seed to localStorage (fallback)
 */
function saveSeedLocal(seed: Seed): Seed {
  const seeds = getSeedsLocal();
  seeds.push(seed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
  return seed;
}

/**
 * Update a seed in Supabase (REQUIRED - no fallback)
 */
export async function updateSeed(id: string, updates: Partial<Seed>): Promise<Seed | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    const dbUpdates = convertSeedToDbSeed(updateData as Seed, { mode: 'update' });
    const { data, error } = await supabase
      .from('seeds')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Storage] Supabase update error:', error);
      throw new Error(`Failed to update seed in database: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return convertDbRowToSeedWithUrls(data);
  } catch (err) {
    console.error('[Storage] Error updating in Supabase:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to update seed in database');
  }
}

/**
 * Update seed in localStorage (fallback)
 */
function updateSeedLocal(id: string, updates: Partial<Seed>): Seed | null {
  const seeds = getSeedsLocal();
  const index = seeds.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  seeds[index] = {
    ...seeds[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
  return seeds[index];
}

/**
 * Delete a seed from Supabase (REQUIRED - no fallback).
 * Also removes photos from storage when userId is provided.
 */
export async function deleteSeed(id: string, userId?: string): Promise<boolean> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  try {
    if (userId) {
      await deleteSeedPhotos(userId, id);
    }

    const { error } = await supabase
      .from('seeds')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Storage] Supabase delete error:', error);
      throw new Error(`Failed to delete seed from database: ${error.message}`);
    }

    return true;
  } catch (err) {
    console.error('[Storage] Error deleting from Supabase:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to delete seed from database');
  }
}

/**
 * Delete seed from localStorage (fallback)
 */
function deleteSeedLocal(id: string): boolean {
  const seeds = getSeedsLocal();
  const filtered = seeds.filter(s => s.id !== id);
  if (filtered.length === seeds.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Clear all seeds from Supabase (REQUIRED - no fallback)
 */
export async function clearAllSeeds(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  try {
    const { error } = await supabase
      .from('seeds')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches all)

    if (error) {
      console.error('[Storage] Supabase clear error:', error);
      throw new Error(`Failed to clear seeds from database: ${error.message}`);
    }
  } catch (err) {
    console.error('[Storage] Error clearing Supabase:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to clear seeds from database');
  }
}

function clearAllSeedsLocal(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get a seed by ID from Supabase (REQUIRED - no fallback)
 */
export async function getSeedById(id: string): Promise<Seed | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  try {
    const { data, error } = await supabase
      .from('seeds')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Storage] Supabase getById error:', error);
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to get seed from database: ${error.message}`);
    }

    if (!data) return null;

    let photoFront: string | undefined;
    let photoBack: string | undefined;
    if (data.photo_front_path) {
      photoFront = getPhotoUrl(data.photo_front_path) ?? undefined;
    } else if (data.photo_front) {
      photoFront = data.photo_front; // Legacy base64 only when no path
    }
    if (data.photo_back_path) {
      photoBack = getPhotoUrl(data.photo_back_path) ?? undefined;
    } else if (data.photo_back) {
      photoBack = data.photo_back; // Legacy base64 only when no path
    }
    return convertDbSeedToSeed(data, photoFront, photoBack);
  } catch (err) {
    console.error('[Storage] Error getting seed from Supabase:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to get seed from database');
  }
}

function getSeedByIdLocal(id: string): Seed | null {
  const seeds = getSeedsLocal();
  return seeds.find(s => s.id === id) || null;
}

/**
 * Helper to calculate seed age in years
 */
export function getSeedAge(seed: Seed): number {
  if (!seed.year) return 0;
  return new Date().getFullYear() - seed.year;
}

/**
 * Convert a DB row to Seed with photo URLs (used by save/update)
 */
function convertDbRowToSeedWithUrls(row: any): Seed {
  let photoFront: string | undefined;
  let photoBack: string | undefined;
  if (row.photo_front_path) {
    photoFront = getPhotoUrl(row.photo_front_path) ?? undefined;
  } else if (row.photo_front) {
    photoFront = row.photo_front; // Legacy base64 only when no path
  }
  if (row.photo_back_path) {
    photoBack = getPhotoUrl(row.photo_back_path) ?? undefined;
  } else if (row.photo_back) {
    photoBack = row.photo_back; // Legacy base64 only when no path
  }
  return convertDbSeedToSeed(row, photoFront, photoBack);
}

// Profile storage functions (keeping localStorage for now, can migrate later)
export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(PROFILE_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveProfile(profile: Partial<UserProfile>): UserProfile {
  const existing = getProfile();
  const updated: UserProfile = {
    ...existing,
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
