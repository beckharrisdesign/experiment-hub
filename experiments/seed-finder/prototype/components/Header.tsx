import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold text-gray-900">Seed Finder</h1>
            </Link>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Home
              </Link>
              <Link 
                href="/seeds" 
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Browse Seeds
              </Link>
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Quick zip code search link */}
            <Link
              href="/zip/78726"
              className="hidden sm:inline-block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
            >
              Austin, TX
            </Link>
            <Link
              href="/zip/10001"
              className="hidden sm:inline-block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
            >
              New York, NY
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

