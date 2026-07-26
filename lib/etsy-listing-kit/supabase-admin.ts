/**
 * Supabase admin client (service-role) for Etsy Listing Kit server routes.
 * Bypasses RLS — server-only (checkout, webhook, fulfillment). Never import
 * in client components. Adapted from the SSO prototype pattern.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function createAdminSupabaseClient(): SupabaseClient | null {
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
