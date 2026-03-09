import type { SupabaseClient } from '@supabase/supabase-js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3009');

export async function requestPasswordReset(
  email: string,
  supabase: Pick<SupabaseClient, 'auth'>
): Promise<{ error: string | null }> {
  if (!email || !EMAIL_REGEX.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function updatePassword(
  password: string,
  supabase: Pick<SupabaseClient, 'auth'>
): Promise<{ error: string | null }> {
  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  return { error: null };
}
