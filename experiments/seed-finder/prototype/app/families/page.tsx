import Link from 'next/link';
import { getAllUSDAFamilies } from '@/lib/data';

export default function FamiliesPage() {
  const families = getAllUSDAFamilies();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Plant Families</h1>
          <p className="text-lg text-gray-600 mb-2">
            Browse {families.length} plant families from the USDA Plants database
          </p>
          <p className="text-sm text-gray-500">
            Plant families are taxonomic groupings that help organize and classify plants.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {families.map((family) => (
              <Link
                key={family}
                href={`/families/${encodeURIComponent(family)}`}
                className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-gray-900 font-medium">{family}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

