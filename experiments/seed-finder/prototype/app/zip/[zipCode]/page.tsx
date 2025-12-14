import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getZipHardiness, getSeedsByHardinessZone, getZipCodesByHardinessZone } from '@/lib/data';
import SeedList from '@/components/SeedList';
import ZipCodeSearch from '@/components/ZipCodeSearch';

export default async function ZipCodePage({
  params,
}: {
  params: Promise<{ zipCode: string }>;
}) {
  const { zipCode } = await params;
  
  const zipInfo = getZipHardiness(zipCode);
  
  if (!zipInfo) {
    notFound();
  }
  
  const seeds = getSeedsByHardinessZone(zipInfo.hardiness_zone);
  const otherZipsInZone = getZipCodesByHardinessZone(zipInfo.hardiness_zone)
    .filter(zip => zip.zip_code !== zipCode)
    .slice(0, 5);
  
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
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Seeds for {zipCode}
        </h1>
        
        {zipInfo.city && zipInfo.state && (
          <p className="text-lg text-gray-600 mb-2">
            {zipInfo.city}, {zipInfo.state}
          </p>
        )}
        
        {/* Hardiness Zone Section - Now Actionable */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-gray-700 font-medium">
                Hardiness Zone: <Link href={`/zip/${zipCode}`} className="text-blue-600 hover:text-blue-800 font-semibold">{zipInfo.hardiness_zone}</Link>
              </p>
              {zoneInfo[zipInfo.hardiness_zone] && (
                <p className="text-sm text-gray-600 mt-1">
                  Average minimum temperature: {zoneInfo[zipInfo.hardiness_zone]}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Seeds shown below can grow in Hardiness Zone {zipInfo.hardiness_zone}. Each seed's zone range includes Zone {zipInfo.hardiness_zone}.
          </p>
          
          {/* Other locations in same zone */}
          {otherZipsInZone.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Other locations in Zone {zipInfo.hardiness_zone}:</p>
              <div className="flex flex-wrap gap-2">
                {otherZipsInZone.map((zip) => (
                  <Link
                    key={zip.zip_code}
                    href={`/zip/${zip.zip_code}`}
                    className="text-sm px-3 py-1 bg-white border border-blue-300 rounded hover:bg-blue-100 hover:border-blue-400 text-blue-700 transition-colors"
                  >
                    {zip.zip_code}
                    {zip.city && zip.state && ` (${zip.city}, ${zip.state})`}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Zip Code Search */}
        <ZipCodeSearch />
        
        {/* Seed List with Matching Explanation */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>{seeds.length} {seeds.length === 1 ? 'seed' : 'seeds'}</strong> can grow in Hardiness Zone {zipInfo.hardiness_zone}. 
            Each seed's hardiness zone range includes Zone {zipInfo.hardiness_zone} (highlighted in <strong className="text-blue-600">blue</strong> below).
          </p>
        </div>
        
        <SeedList seeds={seeds} highlightZone={zipInfo.hardiness_zone} />
      </div>
    </div>
  );
}

