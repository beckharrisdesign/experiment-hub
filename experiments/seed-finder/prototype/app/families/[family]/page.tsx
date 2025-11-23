import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllUSDAFamilies, getPlantsByFamily } from '@/lib/data';
import SeedList from '@/components/SeedList';
import USDAPlantList from '@/components/USDAPlantList';

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ family: string }>;
}) {
  const { family } = await params;
  const decodedFamily = decodeURIComponent(family);
  
  // Verify family exists
  const allFamilies = getAllUSDAFamilies();
  if (!allFamilies.includes(decodedFamily)) {
    notFound();
  }
  
  const { seeds, usdaPlants } = getPlantsByFamily(decodedFamily);
  
  // Add hardiness zones to USDA plants
  const usdaPlantsWithZones = usdaPlants.map(plant => ({
    ...plant,
    zones: [] as number[], // We could fetch these if needed
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/families" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to all families
        </Link>
        
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{decodedFamily}</h1>
          <p className="text-lg text-gray-600 mb-2">
            Plant Family
          </p>
          <p className="text-sm text-gray-500">
            {seeds.length} {seeds.length === 1 ? 'seed' : 'seeds'} and {usdaPlants.length} {usdaPlants.length === 1 ? 'plant' : 'plants'} in this family
          </p>
        </div>

        {/* Seeds in this family */}
        {seeds.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Seeds in {decodedFamily}</h2>
            <SeedList seeds={seeds} />
          </div>
        )}

        {/* USDA Plants in this family */}
        {usdaPlants.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">USDA Plants in {decodedFamily}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {usdaPlants.length} {usdaPlants.length === 1 ? 'plant' : 'plants'} from the USDA Plants database
            </p>
            <USDAPlantList 
              plants={usdaPlantsWithZones} 
              families={[decodedFamily]} 
            />
          </div>
        )}

        {seeds.length === 0 && usdaPlants.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">No seeds or plants found in this family.</p>
          </div>
        )}
      </div>
    </div>
  );
}

