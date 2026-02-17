/**
 * Supabase client for database operations (browser).
 * Uses createBrowserClient from @supabase/ssr so the session is stored in cookies,
 * allowing API routes to read auth via createServerSupabaseClient.
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Prefer publishable key (new format: sb_publishable_...)
// Falls back to legacy anon key for backwards compatibility
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Configuration missing!');
  console.error('[Supabase] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || 'MISSING');
  console.error('[Supabase] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', supabaseKey ? 'Found' : 'MISSING');
  console.error('[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Found' : 'MISSING');
  console.error('[Supabase] Make sure .env.local is in the app directory and restart the dev server.');
}

export const supabase =
  supabaseUrl && supabaseKey
    ? createBrowserClient(supabaseUrl, supabaseKey)
    : null;
