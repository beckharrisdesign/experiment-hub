import Link from 'next/link';
import { getAllZipCodes } from '@/lib/data';

export default function ZipCodesPage() {
  const allZips = getAllZipCodes().sort((a, b) => {
    // Sort by state, then city, then zip code
    if (a.state !== b.state) {
      return (a.state || '').localeCompare(b.state || '');
    }
    if (a.city !== b.city) {
      return (a.city || '').localeCompare(b.city || '');
    }
    return a.zip_code.localeCompare(b.zip_code);
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Zip Codes</h1>
          <p className="text-lg text-gray-600 mb-2">
            Browse {allZips.length} zip codes in our database
          </p>
          <p className="text-sm text-gray-500">
            Click on any zip code to see seeds that grow in that area's hardiness zone.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allZips.map((zip) => (
              <Link
                key={zip.zip_code}
                href={`/zip/${zip.zip_code}`}
                className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900">{zip.zip_code}</span>
                    {zip.city && zip.state && (
                      <span className="text-gray-600 ml-2">
                        {zip.city}, {zip.state}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">Zone {zip.hardiness_zone}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

