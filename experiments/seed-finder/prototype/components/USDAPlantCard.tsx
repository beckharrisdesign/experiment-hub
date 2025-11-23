import type { USDAPlant } from '@/lib/data';

interface USDAPlantCardProps {
  plant: USDAPlant;
  zones?: number[];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function USDAPlantCard({ plant, zones = [] }: USDAPlantCardProps) {
  const hasZones = zones.length > 0;
  
  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {plant.common_name || plant.scientific_name}
          </h3>
          {plant.common_name && (
            <p className="text-sm text-gray-500 italic mt-1">
              {plant.scientific_name}
            </p>
          )}
          {plant.family && (
            <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {plant.family}
            </span>
          )}
          <div className="mt-2 text-xs text-gray-500">
            Symbol: {plant.symbol}
          </div>
        </div>
        <div className="text-right ml-4">
          {hasZones ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Zones:</p>
              <p className="text-sm text-blue-600 font-semibold">
                {zones.join(', ')}
              </p>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">
              Zones not set
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

