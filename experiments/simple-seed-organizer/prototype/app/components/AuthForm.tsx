'use client';

import { useState } from 'react';

interface AuthFormProps {
  onSuccess: () => void;
  /** When true, renders without the full-screen wrapper (for embedding in landing) */
  embedded?: boolean;
}

/**
 * Unified auth form: one experience for new and returning users.
 * Enter email + password → we try sign in first, then sign up if new.
 * No magic links (avoids email cap). No sign up vs sign in choice.
 */
export function AuthForm({ onSuccess, embedded }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { supabase } = await import('@/lib/supabase');
      if (!supabase) throw new Error('Supabase not configured. Please check your setup.');

      // Try sign in first (returning user)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        onSuccess();
        return;
      }

      // Sign in failed - try sign up (new user)
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        // "User already registered" = returning user with wrong password
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setError('Invalid email or password');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Sign up succeeded - check if we have a session (or need email confirmation)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        onSuccess();
      } else {
        setMessage('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      <h1 className="text-xl font-semibold text-[#101828] mb-1">Continue with email</h1>
      <p className="text-sm text-[#6a7282] mb-6">
        Enter your email and password. New users are added automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#4a5565] mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4a5565] mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
            placeholder="At least 6 characters"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {message && (
          <p className="text-sm text-[#16a34a]">{message}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Continuing...' : 'Continue'}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return <div className="w-full">{formContent}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          {formContent}
        </div>
      </div>
    </div>
  );
}
