'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  requiresBrandIdentity?: boolean;
  disabled?: boolean;
}

export default function Header() {
  const pathname = usePathname();
  const [hasBrandIdentity, setHasBrandIdentity] = useState(false);

  useEffect(() => {
    // Check if brand identity exists
    fetch('/api/brand-identity')
      .then((res) => res.json())
      .then((data) => {
        setHasBrandIdentity(!!data);
      })
      .catch(() => setHasBrandIdentity(false));
  }, []);

  const navItems: NavItem[] = [
    { href: '/', label: 'Dashboard' },
    { href: '/patterns', label: 'Patterns' },
    { href: '/product-templates', label: 'Product Templates' },
    { href: '/listings', label: 'Listings' },
    { href: '/store', label: 'Store' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-background-primary border-b border-border backdrop-blur-sm bg-opacity-95">
      <div className="px-4">
        <div className="flex items-center gap-6 h-14">
          {/* Logo/Title */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
            <h1 className="text-lg font-bold text-text-primary">Shop Manager</h1>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto flex-1">
            {navItems.map((item) => {
              const isDisabled = item.disabled || (item.requiresBrandIdentity && !hasBrandIdentity);
              const active = isActive(item.href);

              if (isDisabled) {
                return (
                  <span
                    key={item.href}
                    className="px-3 py-1.5 text-sm text-text-muted cursor-not-allowed opacity-50 whitespace-nowrap"
                    title={item.disabled ? 'Coming soon' : 'Requires Brand Identity'}
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-1.5 text-sm transition whitespace-nowrap ${
                    active
                      ? 'text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
