import Link from 'next/link';
import { getAllZipCodes, getZipCodesByHardinessZone, getAllUSDAFamilies } from '@/lib/data';

export default function Footer() {
  // Get example zip codes for each hardiness zone
  const zones = [3, 4, 5, 6, 7, 8, 9, 10, 11];
  const zoneExamples = zones.map(zone => {
    const zips = getZipCodesByHardinessZone(zone);
    return { zone, zip: zips.length > 0 ? zips[0] : null };
  }).filter(z => z.zip !== null);

  // Top metro areas
  const topMetros = [
    { zip: '10001', name: 'New York, NY' },
    { zip: '90012', name: 'Los Angeles, CA' },
    { zip: '60601', name: 'Chicago, IL' },
    { zip: '78726', name: 'Austin, TX' },
    { zip: '77001', name: 'Houston, TX' },
    { zip: '33101', name: 'Miami, FL' },
  ];

  // Get top plant families (first 8)
  const allFamilies = getAllUSDAFamilies();
  const topFamilies = allFamilies.slice(0, 8);

  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Browse by Type */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Browse by Type</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/seeds" className="hover:text-white transition-colors">
                  Browse Seeds
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white transition-colors text-gray-400 italic">
                  View all categories →
                </Link>
              </li>
            </ul>
          </div>

          {/* Browse by Location */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Browse by Location</h3>
            <ul className="space-y-1.5 text-sm">
              {topMetros.map((metro) => (
                <li key={metro.zip}>
                  <Link 
                    href={`/zip/${metro.zip}`} 
                    className="hover:text-white transition-colors"
                  >
                    {metro.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/zips" className="hover:text-white transition-colors text-gray-400 italic">
                  View all locations →
                </Link>
              </li>
            </ul>
          </div>

          {/* Browse by Hardiness Zone */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Browse by Zone</h3>
            <ul className="space-y-1.5 text-sm">
              {zoneExamples.map(({ zone, zip }) => (
                <li key={zone}>
                  <Link 
                    href={`/zip/${zip!.zip_code}`} 
                    className="hover:text-white transition-colors"
                  >
                    Zone {zone}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/zones" className="hover:text-white transition-colors text-gray-400 italic">
                  View all zones →
                </Link>
              </li>
            </ul>
          </div>

          {/* Browse by Plant Family */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Browse by Family</h3>
            <ul className="space-y-1.5 text-sm">
              {topFamilies.map((family) => (
                <li key={family} className="text-gray-400">
                  {family}
                </li>
              ))}
              <li>
                <Link href="/families" className="hover:text-white transition-colors text-gray-400 italic">
                  View all families →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-6 pt-6 text-center text-xs">
          <p className="text-gray-400">
            Seed Finder - Find seeds that grow in your hardiness zone
          </p>
        </div>
      </div>
    </footer>
  );
}

