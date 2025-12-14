import Link from 'next/link';
import { getZipCodesByHardinessZone } from '@/lib/data';

export default function ZonesPage() {
  // Get all zones (3-11)
  const zones = [3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  const zoneData = zones.map(zone => {
    const zips = getZipCodesByHardinessZone(zone);
    return {
      zone,
      zipCount: zips.length,
      exampleZip: zips.length > 0 ? zips[0] : null,
    };
  });

  // Zone temperature ranges (approximate)
  const zoneInfo: Record<number, string> = {
    3: '-40 to -30°F',
    4: '-30 to -20°F',
    5: '-20 to -10°F',
    6: '-10 to 0°F',
    7: '0 to 10°F',
    8: '10 to 20°F',
    9: '20 to 30°F',
    10: '30 to 40°F',
    11: '40 to 50°F',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Hardiness Zones</h1>
          <p className="text-lg text-gray-600 mb-2">
            Browse {zones.length} USDA hardiness zones
          </p>
          <p className="text-sm text-gray-500">
            Hardiness zones indicate the average annual minimum temperature range. Click on any zone to see seeds that grow there.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneData.map(({ zone, zipCount, exampleZip }) => (
              <Link
                key={zone}
                href={exampleZip ? `/zip/${exampleZip.zip_code}` : '#'}
                className={`block p-4 border rounded-lg transition-colors ${
                  exampleZip
                    ? 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Zone {zone}</h3>
                    <p className="text-sm text-gray-600 mt-1">{zoneInfo[zone]}</p>
                  </div>
                </div>
                {exampleZip && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {zipCount} {zipCount === 1 ? 'location' : 'locations'} • Example: {exampleZip.zip_code}
                      {exampleZip.city && exampleZip.state && ` (${exampleZip.city}, ${exampleZip.state})`}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

