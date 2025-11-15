import Link from 'next/link';
import { getBrandIdentity } from '@/lib/brand-identity';

export default function HomePage() {
  const brandIdentity = getBrandIdentity();
  const hasBrandIdentity = !!brandIdentity;

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-text-secondary">Workflow automation for pattern creators</p>
        </header>

        {!hasBrandIdentity && (
          <div className="mb-8 p-6 bg-background-secondary border border-border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Get Started</h2>
            <p className="text-text-secondary mb-4">
              Start by setting up your store brand identity. This will inform all generated content.
            </p>
            <Link
              href="/brand-identity"
              className="inline-block px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              Set Up Brand Identity
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            title="Brand Identity"
            description="Set up your store name, tone, and creative direction"
            href="/brand-identity"
            status={hasBrandIdentity ? 'complete' : 'available'}
          />
          <FeatureCard
            title="Product Planning"
            description="Track pattern ideas and plan releases"
            href="/patterns"
            status="available"
          />
          <FeatureCard
            title="Listing Authoring"
            description="Generate optimized Etsy listing content"
            href="/listings"
            status={hasBrandIdentity ? 'available' : 'locked'}
          />
          <FeatureCard
            title="Customer Communication"
            description="Generate order confirmations and support messages"
            href="/communication"
            status={hasBrandIdentity ? 'available' : 'locked'}
          />
          <FeatureCard
            title="Image Generation"
            description="Generate store assets and product images"
            href="/images"
            status="coming-soon"
          />
          <FeatureCard
            title="SEO & Keywords"
            description="Research and optimize keywords"
            href="/seo"
            status="coming-soon"
          />
          <FeatureCard
            title="Export"
            description="Export complete listing packages"
            href="/export"
            status={hasBrandIdentity ? 'available' : 'locked'}
          />
        </div>

      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  href,
  status,
}: {
  title: string;
  description: string;
  href: string;
  status: 'complete' | 'available' | 'locked' | 'coming-soon';
}) {
  const statusColors = {
    complete: 'border-green-500',
    available: 'border-accent-primary',
    locked: 'border-border opacity-50',
    'coming-soon': 'border-border opacity-50',
  };

  const statusText = {
    complete: '✓ Complete',
    available: '→ Available',
    locked: '🔒 Requires Brand Identity',
    'coming-soon': '🚧 Coming Soon',
  };

  return (
    <Link
      href={status === 'locked' || status === 'coming-soon' ? '#' : href}
      className={`block p-6 bg-background-secondary border rounded-lg hover:bg-background-tertiary transition ${
        status === 'locked' || status === 'coming-soon' ? 'cursor-not-allowed' : ''
      } ${statusColors[status]}`}
    >
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-text-secondary text-sm mb-4">{description}</p>
      <span className="text-xs text-text-muted">{statusText[status]}</span>
    </Link>
  );
}

