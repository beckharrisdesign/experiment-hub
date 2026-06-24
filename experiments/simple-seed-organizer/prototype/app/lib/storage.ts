import { Seed, SeedPhoto } from "@/types/seed";
import { UserProfile } from "@/types/profile";
import { supabase } from "./supabase";
import { getPhotoUrl, deleteSeedPhotos } from "./seed-photos";
import {
  buildPhotoCollection,
  convertDbSeedToSeed,
  convertSeedToDbSeed,
  SEEDS_COLUMNS_WITHOUT_PHOTOS,
} from "./seedConverters";

// Fallback to localStorage if Supabase is not configured
const STORAGE_KEY = "simple-seed-organizer-seeds";
// Profile previously stored in localStorage under this key. Removed when
// migrating to Supabase user_profiles (sso-zip-code-persistence).
// Kept only if some legacy code in this file still references it; otherwise prune.

const SEEDS_COLUMNS_WITHOUT_USER_ID = SEEDS_COLUMNS_WITHOUT_PHOTOS.split(",")
  .filter((column) => column !== "user_id")
  .join(",");
const LEGACY_SEEDS_COLUMNS_WITHOUT_PHOTOS =
  "id,name,variety,type,brand,year,planting_months,notes,created_at,updated_at";

/**
 * Get seed count for usage display (profile, limits).
 */
export async function getSeedCount(userId: string): Promise<number> {
  if (!supabase || !userId) return 0;
  try {
    const { count, error } = await supabase
      .from("seeds")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) {
      console.warn("[Storage] getSeedCount error:", error);
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
export async function getSeedsWithoutPhotos(userId: string): Promise<Seed[]> {
  if (!supabase || !userId) {
    console.warn(
      "[Storage] Supabase not configured or no userId, returning empty array",
    );
    return [];
  }

  try {
    const { data, error } = await selectSeedsWithoutPhotos(userId);

    if (error) {
      console.error("[Storage] Supabase error:", error);
      throw new Error(`Failed to load seeds from database: ${error.message}`);
    }

    return (data || []).map((row) => convertDbSeedToSeed(row));
  } catch (err) {
    console.error("[Storage] Error fetching from Supabase:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to load seeds from database");
  }
}

async function selectSeedsWithoutPhotos(userId: string) {
  // Each attempt specifies whether to add an explicit user_id WHERE filter.
  // The filter is applied only on column sets that include user_id; older
  // schema fallbacks skip it since the column may not exist yet, relying on
  // RLS for isolation in that degraded path.
  const attempts = [
    { columns: SEEDS_COLUMNS_WITHOUT_PHOTOS, filterByUserId: true },
    { columns: SEEDS_COLUMNS_WITHOUT_USER_ID, filterByUserId: false },
    { columns: LEGACY_SEEDS_COLUMNS_WITHOUT_PHOTOS, filterByUserId: false },
  ];

  let lastError: any = null;
  for (const { columns, filterByUserId } of attempts) {
    let query = supabase!.from("seeds").select(columns);
    if (filterByUserId && userId) {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (!error) {
      return { data, error: null };
    }

    lastError = error;
    if (!isMissingColumnError(error)) {
      return { data: null, error };
    }

    console.warn(
      "[Storage] Seed list query hit a missing column; retrying with a compatible column set:",
      error.message,
    );
  }

  return { data: null, error: lastError };
}

function isMissingColumnError(error: any): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("could not find") && message.includes("schema cache"))
  );
}

/**
 * Get photo collections for all seeds - use after getSeedsWithoutPhotos() for two-phase load.
 * Returns a map of seedId -> SeedPhoto[] (resolved, ordered), synthesizing the legacy
 * front/back pair through the same shim as full reads.
 */
export async function getSeedPhotos(
  userId: string,
): Promise<Map<string, SeedPhoto[]>> {
  if (!supabase || !userId) return new Map();

  try {
    const { data, error } = await supabase
      .from("seeds")
      .select(
        "id,photos,photo_front_path,photo_back_path,photo_front,photo_back",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Storage] Failed to load seed photos:", error);
      return new Map();
    }

    const map = new Map<string, SeedPhoto[]>();
    for (const row of data || []) {
      const photos = buildPhotoCollection(row);
      if (photos && photos.length > 0) {
        map.set(row.id, photos);
      }
    }
    return map;
  } catch (err) {
    console.warn("[Storage] Error fetching seed photos:", err);
    return new Map();
  }
}

/**
 * Get all seeds from Supabase (REQUIRED - no fallback).
 * Includes photos - use getSeedsWithoutPhotos + getSeedPhotos for faster perceived load.
 */
export async function getSeeds(): Promise<Seed[]> {
  if (!supabase) {
    console.warn("[Storage] Supabase not configured, returning empty array");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("seeds")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Storage] Supabase error:", error);
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
    console.error("[Storage] Error fetching from Supabase:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to load seeds from database");
  }
}

/**
 * Get seeds from localStorage (fallback)
 */
function getSeedsLocal(): Seed[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Save a seed to Supabase (REQUIRED - no fallback)
 */
export async function saveSeed(
  seedData: Omit<Seed, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<Seed> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please check your environment variables.",
    );
  }

  const newSeed: Seed = {
    ...seedData,
    id: seedData.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const dbSeed = convertSeedToDbSeed(newSeed, { mode: "insert" });
    console.log("[Storage] Attempting to save to Supabase:", {
      name: newSeed.name,
      variety: newSeed.variety,
    });

    const { data, error } = await supabase
      .from("seeds")
      .insert([dbSeed])
      .select()
      .single();

    if (error) {
      console.error("[Storage] Supabase insert error:", error);
      throw new Error(`Failed to save seed to database: ${error.message}`);
    }

    if (!data) {
      throw new Error("No data returned from Supabase after insert");
    }

    console.log("[Storage] Successfully saved to Supabase:", {
      id: data.id,
      name: data.name,
    });
    return convertDbRowToSeedWithUrls(data);
  } catch (err) {
    console.error("[Storage] Error saving to Supabase:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to save seed to database");
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
export async function updateSeed(
  id: string,
  updates: Partial<Seed>,
  userId?: string,
): Promise<Seed | null> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please check your environment variables.",
    );
  }

  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    const dbUpdates = convertSeedToDbSeed(updateData as Seed, {
      mode: "update",
    });
    const runUpdate = async (filterByUserId: boolean) => {
      let query = supabase!.from("seeds").update(dbUpdates).eq("id", id);
      if (filterByUserId && userId) {
        query = query.eq("user_id", userId);
      }
      return query.select().single();
    };

    let { data, error } = await runUpdate(Boolean(userId));
    if (error && userId && isMissingColumnError(error)) {
      console.warn(
        "[Storage] user_id missing during update; retrying without user filter:",
        error.message,
      );
      ({ data, error } = await runUpdate(false));
    }

    if (error) {
      console.error("[Storage] Supabase update error:", error);
      throw new Error(`Failed to update seed in database: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return convertDbRowToSeedWithUrls(data);
  } catch (err) {
    console.error("[Storage] Error updating in Supabase:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to update seed in database");
  }
}

/**
 * Update seed in localStorage (fallback)
 */
function updateSeedLocal(id: string, updates: Partial<Seed>): Seed | null {
  const seeds = getSeedsLocal();
  const index = seeds.findIndex((s) => s.id === id);
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
export async function deleteSeed(
  id: string,
  userId?: string,
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please check your environment variables.",
    );
  }

  try {
    if (userId) {
      await deleteSeedPhotos(userId, id);
    }

    let deleteQuery = supabase.from("seeds").delete().eq("id", id);
    if (userId) {
      const { error: scopedDeleteError } = await deleteQuery.eq(
        "user_id",
        userId,
      );

      if (!scopedDeleteError) {
        return true;
      }

      if (!isMissingColumnError(scopedDeleteError)) {
        console.error("[Storage] Supabase delete error:", scopedDeleteError);
        throw new Error(
          `Failed to delete seed from database: ${scopedDeleteError.message}`,
        );
      }

      console.warn(
        "[Storage] Seed delete query hit a missing column; retrying with a compatible filter:",
        scopedDeleteError.message,
      );
      deleteQuery = supabase.from("seeds").delete().eq("id", id);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error("[Storage] Supabase delete error:", error);
      throw new Error(`Failed to delete seed from database: ${error.message}`);
    }

    return true;
  } catch (err) {
    console.error("[Storage] Error deleting from Supabase:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to delete seed from database");
  }
}

/**
 * Delete seed from localStorage (fallback)
 */
function deleteSeedLocal(id: string): boolean {
  const seeds = getSeedsLocal();
  const filtered = seeds.filter((s) => s.id !== id);
  if (filtered.length === seeds.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Clear all seeds from Supabase (REQUIRED - no fallback)
 */
export async function clearAllSeeds(): Promise<void> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please check your environment variables.",
    );
  }

  try {
    const { error } = await supabase
      .from("seeds")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (using a condition that matches all)

    if (error) {
      console.error("[Storage] Supabase clear error:", error);
      throw new Error(`Failed to clear seeds from database: ${error.message}`);
    }
  } catch (err) {
    console.error("[Storage] Error clearing Supabase:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to clear seeds from database");
  }
}

function clearAllSeedsLocal(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get a seed by ID from Supabase (REQUIRED - no fallback)
 */
export async function getSeedById(
  id: string,
  userId?: string,
): Promise<Seed | null> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please check your environment variables.",
    );
  }

  try {
    const baseQuery = supabase.from("seeds").select("*").eq("id", id);
    const { data, error } = await (
      userId ? baseQuery.eq("user_id", userId) : baseQuery
    ).single();

    if (error) {
      console.error("[Storage] Supabase getById error:", error);
      if (error.code === "PGRST116") {
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
    console.error("[Storage] Error getting seed from Supabase:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to get seed from database");
  }
}

function getSeedByIdLocal(id: string): Seed | null {
  const seeds = getSeedsLocal();
  return seeds.find((s) => s.id === id) || null;
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

// Profile storage — backed by Supabase user_profiles (migration 008).
// See openspec/changes/sso-zip-code-persistence/ for the bug history.
// One row per auth user; created lazily on first save via upsert.

// Convert a DB row (snake_case columns) to the UserProfile shape (camelCase).
function rowToProfile(row: {
  zip_code: string | null;
  growing_zone: string | null;
  previous_zone: string | null;
  location: string | null;
  updated_at: string;
}): UserProfile {
  return {
    zipCode: row.zip_code ?? undefined,
    growingZone: row.growing_zone ?? undefined,
    previousZone: row.previous_zone ?? undefined,
    location: row.location ?? undefined,
    updatedAt: row.updated_at,
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("zip_code, growing_zone, previous_zone, location, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getProfile failed:", error);
    return null;
  }
  if (!data) return null;
  return rowToProfile(data);
}

export async function saveProfile(
  profile: Partial<UserProfile>,
): Promise<UserProfile> {
  if (!supabase) {
    throw new Error("Supabase not configured — cannot save profile.");
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error("Not signed in — cannot save profile.");
  }
  const userId = authData.user.id;

  // Merge with existing so partial updates don't blank other columns.
  const existing = await getProfile();
  const merged = { ...existing, ...profile };

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        zip_code: merged.zipCode ?? null,
        growing_zone: merged.growingZone ?? null,
        previous_zone: merged.previousZone ?? null,
        location: merged.location ?? null,
      },
      { onConflict: "user_id" },
    )
    .select("zip_code, growing_zone, previous_zone, location, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save profile.");
  }
  return rowToProfile(data);
}
