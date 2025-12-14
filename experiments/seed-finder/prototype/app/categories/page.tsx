import Link from 'next/link';
import { getAllSeeds } from '@/lib/data';

export default function CategoriesPage() {
  const allSeeds = getAllSeeds();
  
  // Get unique categories
  const categories = Array.from(
    new Set(allSeeds.map(seed => seed.category).filter(Boolean))
  ).sort();

  // Count seeds per category
  const categoryCounts = categories.map(category => ({
    category,
    count: allSeeds.filter(seed => seed.category === category).length,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Seed Categories</h1>
          <p className="text-lg text-gray-600 mb-2">
            Browse {categories.length} seed categories
          </p>
          <p className="text-sm text-gray-500">
            Categories help organize seeds by type (vegetables, herbs, flowers, etc.).
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryCounts.map(({ category, count }) => (
              <Link
                key={category}
                href={`/seeds?category=${encodeURIComponent(category!)}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-medium capitalize">{category}</span>
                  <span className="text-sm text-gray-500">{count} {count === 1 ? 'seed' : 'seeds'}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

