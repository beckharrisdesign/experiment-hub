/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — only use in trusted server-to-server contexts (webhooks, admin scripts).
 * NEVER import this in client components or expose to the browser.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function createAdminSupabaseClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
