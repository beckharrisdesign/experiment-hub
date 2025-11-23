import Link from 'next/link';
import { getAllUSDAPlants, getUSDAPlantsCount, getAllUSDAFamilies, getHardinessZonesForPlant } from '@/lib/data';
import USDAPlantList from '@/components/USDAPlantList';

export default function PlantsPage() {
  // Get first page of plants (50 plants)
  const usdaPlants = getAllUSDAPlants(50, 0);
  const totalCount = getUSDAPlantsCount();
  const families = getAllUSDAFamilies();
  
  // Add hardiness zones to each plant
  const plants = usdaPlants.map(plant => ({
    ...plant,
    zones: getHardinessZonesForPlant(plant.symbol),
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            USDA Plants Database
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Browse {totalCount.toLocaleString()} plants from the USDA Plants database
          </p>
          <p className="text-sm text-gray-500">
            Showing first 50 plants. More plants available - search and filter to find specific plants.
          </p>
        </div>

        <USDAPlantList plants={plants} families={families} />
      </div>
    </div>
  );
}

