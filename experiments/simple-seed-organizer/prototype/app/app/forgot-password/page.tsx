'use client';

import { useState } from 'react';
import { requestPasswordReset } from '@/lib/auth-actions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { supabase } = await import('@/lib/supabase');
      if (!supabase) throw new Error("I'm having trouble connecting right now. Try reloading the page.");

      const { error: resetError } = await requestPasswordReset(email, supabase);
      if (resetError) {
        setError(resetError);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] pt-24 pb-16">
      <section className="px-4 py-16">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
            <p className="text-gray-600">
              {submitted
                ? "Check your email for a reset link."
                : "Enter your email and we'll send you a link."}
            </p>
          </div>

          {!submitted && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4a5565] mb-1">
                    Email
                  </label>
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
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </div>
          )}

          <p className="mt-4 text-center text-sm text-gray-500">
            <a href="/login" className="text-[#16a34a] hover:underline">
              Back to sign in
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
