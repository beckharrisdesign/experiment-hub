import Link from 'next/link';
import { getAllSeeds } from '@/lib/data';
import SeedList from '@/components/SeedList';

export default function SeedsPage() {
  const allSeeds = getAllSeeds();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Browse Seeds</h1>
          <p className="text-lg text-gray-600 mb-2">
            Explore {allSeeds.length} seeds in our database
          </p>
          <p className="text-sm text-gray-500">
            Browse all available seeds, filter by category, or search by name.
          </p>
        </div>

        <SeedList seeds={allSeeds} />
      </div>
    </div>
  );
}

