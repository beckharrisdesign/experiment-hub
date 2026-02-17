'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Profile } from '@/components/Profile';

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center pt-[72px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center pt-[72px]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sign in to view your profile.</p>
          <Link href="/" className="text-[#16a34a] hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return <Profile />;
}
