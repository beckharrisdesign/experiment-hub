'use client';

import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center pt-[72px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] pt-24 pb-16">
      <section className="px-4 py-16">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Sign in</h1>
            <p className="text-gray-600">
              Enter your email and password to continue.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <AuthForm onSuccess={() => router.push('/')} embedded />
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            <a href="/" className="text-[#16a34a] hover:underline">
              ← Back to home
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
