import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSeedBySlug, getZipsForSeed, getVarietalsForSeed, searchUSDAPlantsByScientificName, getSeedsByFamily } from '@/lib/data';

export default async function SeedDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const seed = getSeedBySlug(slug);
  
  if (!seed) {
    notFound();
  }

  const exampleZips = getZipsForSeed(seed);
  const austinVarietals = getVarietalsForSeed(seed, 'Austin, TX');
  const primaryVarietals = austinVarietals.filter(v => v.is_primary);
  const otherVarietals = austinVarietals.filter(v => !v.is_primary);
  
  // Check if there's a matching USDA plant by scientific name
  let matchingUSDAPlant = null;
  if (seed.latin_name) {
    const usdaResults = searchUSDAPlantsByScientificName(seed.latin_name, 5);
    // Check if any result matches the exact scientific name (case-insensitive)
    matchingUSDAPlant = usdaResults.find(plant => 
      plant.scientific_name.toLowerCase() === seed.latin_name!.toLowerCase()
    ) || null;
  }
  
  // Get other seeds in the same family (if seed has a family)
  const familySeeds = seed.family ? getSeedsByFamily(seed.family).filter(s => s.id !== seed.id) : [];
  const familyFromUSDA = matchingUSDAPlant?.family || seed.family;
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {seed.english_name}
        </h1>
        
        {seed.latin_name && (
          <div className="mb-6">
            <p className="text-lg text-gray-500 italic">
              {seed.latin_name}
            </p>
            {austinVarietals.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Species: <span className="italic">{seed.latin_name}</span> • {seed.english_name} is a cultivar
              </p>
            )}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Seed Information</h2>
          
          <dl className="grid grid-cols-1 gap-4">
            {seed.category && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-lg text-gray-900 capitalize">{seed.category}</dd>
              </div>
            )}
            
            {(seed.family || familyFromUSDA) && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Family</dt>
                <dd className="mt-1 text-lg text-gray-900">
                  <Link 
                    href={`/families/${encodeURIComponent(familyFromUSDA || seed.family!)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {familyFromUSDA || seed.family}
                  </Link>
                </dd>
              </div>
            )}
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Hardiness Zones</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {seed.hardiness_zones.join(', ')}
              </dd>
            </div>
          </dl>
        </div>

        {/* USDA Plant Database Information - Only if there's a match */}
        {matchingUSDAPlant && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">USDA Plants Database</h2>
            <p className="text-sm text-gray-600 mb-4">
              This plant is found in the USDA Plants database:
            </p>
            <dl className="grid grid-cols-1 gap-4">
              {matchingUSDAPlant.symbol && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">USDA Symbol</dt>
                  <dd className="mt-1 text-lg text-gray-900 font-mono">{matchingUSDAPlant.symbol}</dd>
                </div>
              )}
              {matchingUSDAPlant.family && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Family</dt>
                  <dd className="mt-1 text-lg text-gray-900">
                    <Link 
                      href={`/families/${encodeURIComponent(matchingUSDAPlant.family)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {matchingUSDAPlant.family}
                    </Link>
                  </dd>
                </div>
              )}
              {matchingUSDAPlant.common_name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Common Name</dt>
                  <dd className="mt-1 text-lg text-gray-900">{matchingUSDAPlant.common_name}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Recommended Varietals for Austin - Moved to top */}
        {austinVarietals.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Recommended Varieties for Austin, TX
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              These other cultivars of <span className="italic">{seed.latin_name}</span> are recommended for Austin's hot, humid climate (Zone 9):
            </p>
            
            {primaryVarietals.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Primary Recommendations
                </h3>
                <div className="space-y-3">
                  {primaryVarietals.map(varietal => (
                    <div key={varietal.id} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{varietal.variety_name}</h4>
                        {varietal.heat_tolerance && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                            {varietal.heat_tolerance} Heat Tolerance
                          </span>
                        )}
                      </div>
                      {varietal.disease_resistance && (
                        <p className="text-sm text-gray-700 mb-1">
                          <strong>Disease Resistance:</strong> {varietal.disease_resistance}
                        </p>
                      )}
                      {varietal.notes && (
                        <p className="text-sm text-gray-600">{varietal.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherVarietals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Other Good Options
                </h3>
                <div className="space-y-2">
                  {otherVarietals.map(varietal => (
                    <div key={varietal.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-gray-900">{varietal.variety_name}</h4>
                        {varietal.heat_tolerance && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {varietal.heat_tolerance}
                          </span>
                        )}
                      </div>
                      {varietal.notes && (
                        <p className="text-sm text-gray-600">{varietal.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other seeds in the same family */}
        {(familySeeds.length > 0 || familyFromUSDA) && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Related Seeds
            </h2>
            {familyFromUSDA && (
              <p className="text-sm text-gray-600 mb-4">
                This seed belongs to the <Link 
                  href={`/families/${encodeURIComponent(familyFromUSDA)}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  {familyFromUSDA}
                </Link> family. View other seeds and plants in this family.
              </p>
            )}
            {familySeeds.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Other Seeds in {familyFromUSDA || seed.family}
                </h3>
                <div className="grid gap-2">
                  {familySeeds.slice(0, 5).map((relatedSeed) => (
                    <Link
                      key={relatedSeed.id}
                      href={`/seeds/${relatedSeed.english_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-gray-900">
                            {relatedSeed.english_name}
                          </span>
                          {relatedSeed.latin_name && (
                            <span className="text-gray-500 italic ml-2 text-sm">
                              {relatedSeed.latin_name}
                            </span>
                          )}
                        </div>
                        {relatedSeed.category && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded capitalize">
                            {relatedSeed.category}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                {familySeeds.length > 5 && (
                  <div className="mt-4">
                    <Link
                      href={`/families/${encodeURIComponent(familyFromUSDA || seed.family!)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                    >
                      View all {familySeeds.length} seeds in this family →
                    </Link>
                  </div>
                )}
              </div>
            )}
            {familySeeds.length === 0 && familyFromUSDA && (
              <Link
                href={`/families/${encodeURIComponent(familyFromUSDA)}`}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View all plants in {familyFromUSDA} →
              </Link>
            )}
          </div>
        )}

        {/* Grows in these areas - Moved to bottom */}
        {exampleZips.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Grows in these areas:
            </h2>
            
            <div className="grid gap-2">
              {exampleZips.map((zip) => (
                <Link
                  key={zip.zip_code}
                  href={`/zip/${zip.zip_code}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-900">
                        {zip.zip_code}
                      </span>
                      {zip.city && zip.state && (
                        <span className="text-gray-600 ml-2">
                          {zip.city}, {zip.state}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      Zone {zip.hardiness_zone}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
