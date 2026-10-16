/**
 * Supabase admin client (service-role) for Estate Sale Planner server routes.
 * Bypasses RLS — server-only (exit, checkout, webhook, sheet page). Never
 * import in client components. Identical to lib/etsy-listing-kit/supabase-admin.ts;
 * the hub-level copy is a hand-off (review queue #31).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAdminSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
