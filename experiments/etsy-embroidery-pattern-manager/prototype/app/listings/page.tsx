'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Listing } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';
import PageHeader from '@/components/shared/PageHeader';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  useEffect(() => {
    fetchListings();
    fetchPatterns();
    fetchProducts();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      const response = await fetch('/api/patterns');
      if (response.ok) {
        const data = await response.json();
        setPatterns(data);
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/product-templates');
      if (response.ok) {
        const data = await response.json();
        // Show all templates - any pattern can be used with any template
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching product templates:', error);
    }
  };


  if (loading && listings.length === 0) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary flex items-center justify-center gap-3">
        <Spinner size="md" />
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <PageHeader
          title="Listings"
          description="Generate optimized Etsy listing content"
          action={
            <button
              onClick={() => router.push('/listings/new')}
              className="px-6 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              Create New Listing
            </button>
          }
        />

        {listings.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <p>No listings yet. Generate your first listing above!</p>
          </div>
        ) : (
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background-tertiary">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Title</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Pattern</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Template</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Price</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => {
                    const listingPatterns = patterns.filter((p) => listing.patternIds?.includes(p.id));
                    const template = products.find((p) => p.id === listing.templateId);
                    const updatedDate = new Date(listing.updatedAt);
                    const formattedDate = updatedDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    
                    return (
                      <tr
                        key={listing.id}
                        className="border-b border-border hover:bg-background-tertiary transition"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-text-primary line-clamp-2">
                            {listing.title}
                          </div>
                          {listing.seoScore && (
                            <div className="text-xs text-text-secondary mt-1">
                              SEO: {listing.seoScore}/100
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {listingPatterns.length > 0 ? (
                            <div className="text-sm text-text-primary">
                              {listingPatterns.length === 1
                                ? listingPatterns[0].name
                                : `${listingPatterns.length} patterns`}
                            </div>
                          ) : (
                            <span className="text-sm text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {template ? (
                            <span className="text-sm text-text-primary">{template.name}</span>
                          ) : (
                            <span className="text-sm text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {listing.price ? (
                            <span className="text-sm font-medium text-text-primary">
                              ${listing.price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary">{formattedDate}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}

