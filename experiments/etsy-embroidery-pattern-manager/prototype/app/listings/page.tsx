'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Listing } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

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
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
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

  const handleGenerate = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const response = await fetch('/api/listings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productTemplateId: selectedProduct }),
      });

      if (response.ok) {
        showToast('Listing generated successfully', 'success');
        fetchListings();
        setSelectedProduct('');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to generate listing', 'error');
      }
    } catch (error) {
      console.error('Error generating listing:', error);
      showToast('Error generating listing', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (listing: Listing) => {
    const exportText = `Title: ${listing.title}\n\nDescription:\n${listing.description}\n\nTags: ${listing.tags.join(', ')}\n\nCategory: ${listing.category || 'N/A'}\nPrice: $${listing.price || 'N/A'}`;
    navigator.clipboard.writeText(exportText);
    showToast('Listing content copied to clipboard!', 'success');
  };

  const handleBulkGenerate = async () => {
    setBulkGenerating(true);
    try {
      const response = await fetch('/api/listings/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: 'Single Digital Download' }),
      });

      const responseStatus = response.status;
      const responseStatusText = response.statusText;
      const responseOk = response.ok;
      
      console.log('Bulk generate response:', { 
        status: responseStatus, 
        statusText: responseStatusText, 
        ok: responseOk,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (responseOk) {
        const data = await response.json();
        console.log('Bulk generate success data:', data);
        showToast(
          `Generated ${data.successful} listing${data.successful !== 1 ? 's' : ''} successfully${data.failed > 0 ? ` (${data.failed} failed)` : ''}`,
          data.failed > 0 ? 'info' : 'success'
        );
        fetchListings();
      } else {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          // Clone the response so we can read it multiple times
          const responseClone = response.clone();
          const errorData = await responseClone.json();
          console.log('Bulk generate error data:', errorData);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData && Object.keys(errorData).length > 0) {
            errorMessage = JSON.stringify(errorData);
          }
        } catch (e) {
          console.log('Failed to parse error as JSON, trying text:', e);
          // Response is not JSON (might be HTML error page), try to extract error message
          try {
            const responseClone = response.clone();
            const text = await responseClone.text();
            console.log('Bulk generate error text (first 500 chars):', text.substring(0, 500));
            
            // Try to extract error message from Next.js error page JSON
            const jsonMatch = text.match(/"message":"([^"]+)"/);
            if (jsonMatch && jsonMatch[1]) {
              errorMessage = jsonMatch[1];
            } else if (text.length < 500) {
              // If it's a short text response, use it
              errorMessage = text;
            } else {
              // For HTML error pages, use a generic message
              errorMessage = `Server error: ${responseStatus} ${responseStatusText}`;
            }
          } catch (textError) {
            console.log('Failed to read error as text:', textError);
            errorMessage = `Server error: ${responseStatus} ${responseStatusText}`;
          }
        }
        console.error('Bulk generate error:', { status: response.status, statusText: response.statusText, message: errorMessage });
        showToast(errorMessage, 'error');
      }
    } catch (error: any) {
      console.error('Error bulk generating listings:', error);
      showToast(error.message || 'Error bulk generating listings. Check console for details.', 'error');
    } finally {
      setBulkGenerating(false);
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
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Listings</h1>
          <p className="text-text-secondary">Generate optimized Etsy listing content</p>
        </header>

        <div className="mb-8 bg-background-secondary border border-border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Generate New Listing</h2>
            <div className="flex gap-3">
              <button
                onClick={handleBulkGenerate}
                disabled={bulkGenerating}
                className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition disabled:opacity-50 flex items-center gap-2"
              >
                {bulkGenerating ? (
                  <>
                    <Spinner size="sm" />
                    <span>Generating...</span>
                  </>
                ) : (
                  'Bulk Generate (Single Digital Download)'
                )}
              </button>
              <button
                onClick={() => router.push('/listings/new')}
                className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
              >
                Create New Listing
              </button>
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="flex-1 px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
            >
              <option value="">Select a product template</option>
              {products.map((productTemplate) => (
                <option key={productTemplate.id} value={productTemplate.id}>
                  {productTemplate.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={!selectedProduct || loading}
              className="px-6 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Generating...</span>
                </>
              ) : (
                'Generate Listing'
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {listings.map((listing) => {
            const listingPatterns = patterns.filter((p) => listing.patternIds?.includes(p.id));
            return (
              <div key={listing.id} className="bg-background-secondary border border-border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
                    {listingPatterns.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        Pattern{listingPatterns.length > 1 ? 's' : ''}: {listingPatterns.map((p) => p.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleExport(listing)}
                    className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-text-secondary mb-1">Description:</h4>
                  <p className="text-text-primary whitespace-pre-wrap">{listing.description}</p>
                </div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-text-secondary mb-1">Tags ({listing.tags.length}):</h4>
                  <div className="flex flex-wrap gap-2">
                    {listing.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-background-tertiary border border-border rounded text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-text-secondary">
                  {listing.category && <span>Category: {listing.category}</span>}
                  {listing.price && <span>Price: ${listing.price}</span>}
                  {listing.seoScore && <span>SEO Score: {listing.seoScore}/100</span>}
                </div>
              </div>
            );
          })}
          {listings.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              <p>No listings yet. Generate your first listing above!</p>
            </div>
          )}
        </div>
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

