import Link from 'next/link';
import { getAllZipCodes, getZipCodesByHardinessZone } from '@/lib/data';

export default function HomePage() {
  const allZips = getAllZipCodes();
  
  // Top 10 metro areas (by population) - using available zip codes and adding some common ones
  const topMetroAreas = [
    { zip: '10001', city: 'New York', state: 'NY', metro: 'New York City' },
    { zip: '90012', city: 'Los Angeles', state: 'CA', metro: 'Los Angeles' },
    { zip: '60601', city: 'Chicago', state: 'IL', metro: 'Chicago' },
    { zip: '77001', city: 'Houston', state: 'TX', metro: 'Houston' },
    { zip: '33101', city: 'Miami', state: 'FL', metro: 'Miami' },
    { zip: '30301', city: 'Atlanta', state: 'GA', metro: 'Atlanta' },
    { zip: '78701', city: 'Austin', state: 'TX', metro: 'Austin' },
    { zip: '98101', city: 'Seattle', state: 'WA', metro: 'Seattle' },
    { zip: '02101', city: 'Boston', state: 'MA', metro: 'Boston' },
    { zip: '97201', city: 'Portland', state: 'OR', metro: 'Portland' },
  ];

  // Get example zip codes for each hardiness zone (3-11)
  const hardinessZones = [3, 4, 5, 6, 7, 8, 9, 10, 11].map(zone => {
    const zips = getZipCodesByHardinessZone(zone);
    return {
      zone,
      exampleZip: zips.length > 0 ? zips[0] : null,
    };
  }).filter(hz => hz.exampleZip !== null);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Seeds for Your Zone</h1>
        <p className="text-lg text-gray-600 mb-8">
          Discover seeds and plants that grow in your zip code's hardiness zone
        </p>
        
        {/* Top 10 Metro Areas */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 10 Metro Areas</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Browse seeds for major metropolitan areas in the United States:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topMetroAreas.map((metro) => {
              // Check if we have this zip in our database
              const hasZip = allZips.some(z => z.zip_code === metro.zip);
              if (!hasZip) return null;
              
              return (
                <Link
                  key={metro.zip}
                  href={`/zip/${metro.zip}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{metro.metro}</div>
                  <div className="text-sm text-gray-600">{metro.city}, {metro.state}</div>
                  <div className="text-xs text-gray-500 mt-1">Zip: {metro.zip}</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Hardiness Zones */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Hardiness Zones</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Browse seeds by USDA hardiness zone. Each zone represents the average annual minimum temperature range:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {hardinessZones.map(({ zone, exampleZip }) => {
              if (!exampleZip) return null;
              
              return (
                <Link
                  key={zone}
                  href={`/zip/${exampleZip.zip_code}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                >
                  <div className="font-semibold text-lg text-gray-900">Zone {zone}</div>
                  {exampleZip.city && exampleZip.state && (
                    <div className="text-xs text-gray-600 mt-1">
                      {exampleZip.city}, {exampleZip.state}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">{exampleZip.zip_code}</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Try it out */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Try it out</h2>
          <p className="text-gray-600 mb-4">
            Enter a zip code to see seeds that grow in that area:
          </p>
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/zip/90210"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View 90210 (Beverly Hills, CA)
            </Link>
            <Link 
              href="/zip/10001"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View 10001 (New York, NY)
            </Link>
            <Link 
              href="/zip/60601"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View 60601 (Chicago, IL)
            </Link>
            <Link 
              href="/zip/78726"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View 78726 (Austin, TX)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
