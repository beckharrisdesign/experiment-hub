import Link from 'next/link';
import type { Seed } from '@/lib/data';

interface SeedCardProps {
  seed: Seed;
  highlightZone?: number;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function SeedCard({ seed, highlightZone }: SeedCardProps) {
  const formatZones = (zones: number[], highlight?: number) => {
    return zones.map(zone => {
      if (highlight && zone === highlight) {
        return <strong key={zone} className="text-blue-600 font-semibold">{zone}</strong>;
      }
      return <span key={zone}>{zone}</span>;
    }).reduce((acc, el, idx) => {
      if (idx > 0) {
        acc.push(<span key={`sep-${idx}`}>, </span>);
      }
      acc.push(el);
      return acc;
    }, [] as React.ReactNode[]);
  };

  return (
    <Link
      href={`/seeds/${slugify(seed.english_name)}`}
      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {seed.english_name}
          </h3>
          {seed.latin_name && (
            <p className="text-sm text-gray-500 italic mt-1">
              {seed.latin_name}
            </p>
          )}
          {seed.category && (
            <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {seed.category}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            Zones: {formatZones(seed.hardiness_zones, highlightZone)}
          </p>
        </div>
      </div>
    </Link>
  );
}

