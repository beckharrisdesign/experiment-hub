'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pattern, ProductTemplate, Listing } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';
import PatternItem from '@/components/patterns/PatternItem';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  const fetchData = async () => {
    try {
      const [patternsResponse, productTemplatesResponse, listingsResponse] = await Promise.all([
        fetch('/api/patterns'),
        fetch('/api/product-templates'),
        fetch('/api/listings'),
      ]);

      const patternsData: Pattern[] = patternsResponse.ok ? await patternsResponse.json() : [];
      const productTemplatesData: ProductTemplate[] = productTemplatesResponse.ok ? await productTemplatesResponse.json() : [];
      const listingsData: Listing[] = listingsResponse.ok ? await listingsResponse.json() : [];

      // Sort patterns by updated date (newest first)
      patternsData.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      // Sort product templates by updated date (newest first)
      productTemplatesData.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      // Sort listings by updated date (newest first)
      listingsData.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      setPatterns(patternsData);
      setProductTemplates(productTemplatesData);
      setListings(listingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="px-4 py-8 max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-text-secondary mt-2">
            Overview of your patterns, templates, and listings
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Patterns Section */}
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            {/* Summary Card */}
            <div className="p-4 bg-background-tertiary border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Patterns</h2>
                <span className="text-2xl font-bold text-accent-primary">{patterns.length}</span>
              </div>
            </div>
            
            {loading ? (
              <div className="p-6 flex items-center gap-3 text-text-secondary text-sm">
                <Spinner size="sm" />
                <span>Loading patterns...</span>
              </div>
            ) : patterns.length === 0 ? (
              <div className="p-6 text-text-secondary text-sm">
                No patterns yet.{' '}
                <Link href="/patterns" className="text-accent-primary hover:underline">
                  Create your first pattern
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background-tertiary z-10">
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Name</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patterns.map((pattern) => (
                      <tr
                        key={pattern.id}
                        className="border-b border-border hover:bg-background-tertiary transition"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/patterns/${pattern.id}`}
                            className="font-medium text-text-primary hover:text-accent-primary transition block"
                          >
                            {pattern.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary">
                            {pattern.category || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Templates Section */}
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            {/* Summary Card */}
            <div className="p-4 bg-background-tertiary border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Templates</h2>
                <span className="text-2xl font-bold text-accent-primary">{productTemplates.length}</span>
              </div>
            </div>
            
            {loading ? (
              <div className="p-6 flex items-center gap-3 text-text-secondary text-sm">
                <Spinner size="sm" />
                <span>Loading templates...</span>
              </div>
            ) : productTemplates.length === 0 ? (
              <div className="p-6 text-text-secondary text-sm">
                No templates yet.{' '}
                <Link href="/product-templates" className="text-accent-primary hover:underline">
                  Create your first template
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background-tertiary z-10">
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Name</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productTemplates.map((productTemplate) => (
                      <tr
                        key={productTemplate.id}
                        className="border-b border-border hover:bg-background-tertiary transition"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/product-templates/${productTemplate.id}`}
                            className="font-medium text-text-primary hover:text-accent-primary transition block"
                          >
                            {productTemplate.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary">
                            {Array.isArray(productTemplate.types) 
                              ? productTemplate.types.join(', ') 
                              : productTemplate.types || '—'} • {productTemplate.numberOfItems}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Listings Section */}
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            {/* Summary Card */}
            <div className="p-4 bg-background-tertiary border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Listings</h2>
                <span className="text-2xl font-bold text-accent-primary">{listings.length}</span>
              </div>
            </div>
            
            {loading ? (
              <div className="p-6 flex items-center gap-3 text-text-secondary text-sm">
                <Spinner size="sm" />
                <span>Loading listings...</span>
              </div>
            ) : listings.length === 0 ? (
              <div className="p-6 text-text-secondary text-sm">
                No listings yet.{' '}
                <Link href="/listings/new" className="text-accent-primary hover:underline">
                  Create your first listing
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background-tertiary z-10">
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Title</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((listing) => (
                      <tr
                        key={listing.id}
                        className="border-b border-border hover:bg-background-tertiary transition"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-text-primary line-clamp-2">
                            {listing.title}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary">
                            {listing.price ? `$${listing.price.toFixed(2)}` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
