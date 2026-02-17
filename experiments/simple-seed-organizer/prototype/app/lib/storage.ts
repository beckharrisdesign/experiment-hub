import { Seed } from '@/types/seed';
import { UserProfile } from '@/types/profile';
import { supabase } from './supabase';
import { getPhotoUrl, deleteSeedPhotos } from './seed-photos';

// Fallback to localStorage if Supabase is not configured
const STORAGE_KEY = 'simple-seed-organizer-seeds';
const PROFILE_STORAGE_KEY = 'simple-seed-organizer-profile';

// Columns to exclude photos for fast initial load
const SEEDS_COLUMNS_WITHOUT_PHOTOS =
  'id,user_id,name,variety,type,brand,source,year,purchase_date,quantity,days_to_germination,days_to_maturity,planting_depth,spacing,sun_requirement,planting_months,notes,use_first,custom_expiration_date,created_at,updated_at';

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

    return (data || []).map(convertDbSeedToSeed);
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
      return convertDbSeedToSeedWithUrls(row, photoFront, photoBack);
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
    const dbSeed = convertSeedToDbSeed(newSeed);
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
    const dbUpdates = convertSeedToDbSeed(updateData as Seed);
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
    return convertDbSeedToSeedWithUrls(data, photoFront, photoBack);
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
 * Convert Seed to database format (handles snake_case column names and array fields)
 */
function convertSeedToDbSeed(seed: Partial<Seed>): any {
  return {
    id: seed.id,
    name: seed.name,
    variety: seed.variety,
    type: seed.type,
    brand: seed.brand || null,
    source: seed.source || null,
    year: seed.year || null,
    purchase_date: seed.purchaseDate || null,
    quantity: seed.quantity || null,
    days_to_germination: seed.daysToGermination || null,
    days_to_maturity: seed.daysToMaturity || null,
    planting_depth: seed.plantingDepth || null,
    spacing: seed.spacing || null,
    sun_requirement: seed.sunRequirement || null,
    planting_months: seed.plantingMonths ? JSON.stringify(seed.plantingMonths) : null,
    notes: seed.notes || null,
    photo_front_path: seed.photoFrontPath || null,
    photo_back_path: seed.photoBackPath || null,
    photo_front: seed.photoFrontPath ? null : (seed.photoFront || null),
    photo_back: seed.photoBackPath ? null : (seed.photoBack || null),
    use_first: seed.useFirst || false,
    custom_expiration_date: seed.customExpirationDate || null,
    created_at: seed.createdAt,
    updated_at: seed.updatedAt,
  };
}

/**
 * Convert database format to Seed (handles snake_case column names and array fields)
 */
function convertDbSeedToSeed(dbSeed: any): Seed {
  return {
    id: dbSeed.id,
    user_id: dbSeed.user_id || undefined,
    name: dbSeed.name,
    variety: dbSeed.variety,
    type: dbSeed.type,
    brand: dbSeed.brand || undefined,
    source: dbSeed.source || undefined,
    year: dbSeed.year || undefined,
    purchaseDate: dbSeed.purchase_date || undefined,
    quantity: dbSeed.quantity || undefined,
    daysToGermination: dbSeed.days_to_germination || undefined,
    daysToMaturity: dbSeed.days_to_maturity || undefined,
    plantingDepth: dbSeed.planting_depth || undefined,
    spacing: dbSeed.spacing || undefined,
    sunRequirement: dbSeed.sun_requirement || undefined,
    plantingMonths: dbSeed.planting_months ? JSON.parse(dbSeed.planting_months) : undefined,
    notes: dbSeed.notes || undefined,
    photoFront: getPhotoUrl(dbSeed.photo_front_path) || dbSeed.photo_front || undefined,
    photoBack: getPhotoUrl(dbSeed.photo_back_path) || dbSeed.photo_back || undefined,
    photoFrontPath: dbSeed.photo_front_path || undefined,
    photoBackPath: dbSeed.photo_back_path || undefined,
    useFirst: dbSeed.use_first || undefined,
    customExpirationDate: dbSeed.custom_expiration_date || undefined,
    createdAt: dbSeed.created_at,
    updatedAt: dbSeed.updated_at,
  };
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
  return convertDbSeedToSeedWithUrls(row, photoFront, photoBack);
}

/**
 * Convert database format to Seed with pre-resolved photo URLs (for signed URLs)
 */
function convertDbSeedToSeedWithUrls(dbSeed: any, photoFront?: string, photoBack?: string): Seed {
  return {
    id: dbSeed.id,
    user_id: dbSeed.user_id || undefined,
    name: dbSeed.name,
    variety: dbSeed.variety,
    type: dbSeed.type,
    brand: dbSeed.brand || undefined,
    source: dbSeed.source || undefined,
    year: dbSeed.year || undefined,
    purchaseDate: dbSeed.purchase_date || undefined,
    quantity: dbSeed.quantity || undefined,
    daysToGermination: dbSeed.days_to_germination || undefined,
    daysToMaturity: dbSeed.days_to_maturity || undefined,
    plantingDepth: dbSeed.planting_depth || undefined,
    spacing: dbSeed.spacing || undefined,
    sunRequirement: dbSeed.sun_requirement || undefined,
    plantingMonths: dbSeed.planting_months ? JSON.parse(dbSeed.planting_months) : undefined,
    notes: dbSeed.notes || undefined,
    photoFront: photoFront || undefined,
    photoBack: photoBack || undefined,
    photoFrontPath: dbSeed.photo_front_path || undefined,
    photoBackPath: dbSeed.photo_back_path || undefined,
    useFirst: dbSeed.use_first || undefined,
    customExpirationDate: dbSeed.custom_expiration_date || undefined,
    createdAt: dbSeed.created_at,
    updatedAt: dbSeed.updated_at,
  };
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
