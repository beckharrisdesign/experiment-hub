'use client';

import { useState } from 'react';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignUp: () => void;
  /** When true, renders without the full-screen wrapper (for embedding in landing) */
  embedded?: boolean;
}

export function LoginForm({ onSuccess, onSwitchToSignUp, embedded }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { supabase } = await import('@/lib/supabase');
      if (!supabase) throw new Error('Supabase not configured. Please check your setup.');

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      <h1 className="text-xl font-semibold text-[#101828] mb-1">Welcome back</h1>
      <p className="text-sm text-[#6a7282] mb-6">Sign in to your seed collection</p>

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
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[#6a7282]">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-[#16a34a] font-medium hover:underline"
        >
          Sign up
        </button>
      </p>
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
