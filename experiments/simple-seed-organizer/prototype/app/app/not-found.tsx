import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found | Simple Seed Organizer',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-4 text-center">
      <div className="text-5xl mb-4">🌱</div>
      <h1 className="text-2xl font-bold text-[#101828] mb-2">Page not found</h1>
      <p className="text-[#6a7282] mb-8 max-w-xs">
        This page doesn't exist. Check the URL or head back to your seeds.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors"
      >
        Back to my seeds
      </Link>
    </div>
  );
}
