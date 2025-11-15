'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pattern, Product } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
      const [patternsResponse, productsResponse] = await Promise.all([
        fetch('/api/patterns'),
        fetch('/api/products'),
      ]);

      const patternsData: Pattern[] = patternsResponse.ok ? await patternsResponse.json() : [];
      const productsData: Product[] = productsResponse.ok ? await productsResponse.json() : [];

      // Sort patterns by updated date (newest first)
      patternsData.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      // Sort products by status and then by updated date
      const productStatusOrder = { draft: 1, ready: 2, listed: 3 };
      productsData.sort((a, b) => {
        const statusDiff = (productStatusOrder[a.status] || 0) - (productStatusOrder[b.status] || 0);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      setPatterns(patternsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };


  const getProductStatusColor = (status: Product['status']) => {
    const colors = {
      draft: 'bg-gray-500',
      ready: 'bg-green-500',
      listed: 'bg-purple-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getProductTypeLabel = (type: Product['type']) => {
    switch (type) {
      case 'printable-pdf':
        return 'PDF';
      case 'svg':
        return 'SVG';
      case 'kit':
        return 'Kit';
      case 'custom':
        return 'Custom';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="px-4 py-8 max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-text-secondary mt-2">
            Overview of your patterns and products
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patterns Section */}
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold">Patterns</h2>
              <Link
                href="/patterns"
                className="text-sm text-accent-primary hover:underline"
              >
                View All →
              </Link>
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
              <div className="divide-y divide-border">
                {patterns.slice(0, 5).map((pattern) => (
                  <div
                    key={pattern.id}
                    className="p-4 hover:bg-background-tertiary transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/patterns/${pattern.id}`}
                          className="block hover:text-accent-primary transition"
                        >
                          <div className="font-medium text-text-primary mb-1 truncate">
                            {pattern.name}
                          </div>
                          {pattern.notes && (
                            <div className="text-sm text-text-secondary line-clamp-1">
                              {pattern.notes}
                            </div>
                          )}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {patterns.length > 5 && (
                  <div className="p-4 text-center">
                    <Link
                      href="/patterns"
                      className="text-sm text-accent-primary hover:underline"
                    >
                      View {patterns.length - 5} more patterns →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Products Section */}
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold">Products</h2>
              <Link
                href="/products"
                className="text-sm text-accent-primary hover:underline"
              >
                View All →
              </Link>
            </div>
            {loading ? (
              <div className="p-6 flex items-center gap-3 text-text-secondary text-sm">
                <Spinner size="sm" />
                <span>Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="p-6 text-text-secondary text-sm">
                No products yet.{' '}
                <Link href="/products" className="text-accent-primary hover:underline">
                  Create your first product
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {products.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="p-4 hover:bg-background-tertiary transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${product.id}`}
                          className="block hover:text-accent-primary transition"
                        >
                          <div className="font-medium text-text-primary mb-1 truncate">
                            {product.title || product.name}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {getProductTypeLabel(product.type)}
                            {product.price && ` • $${product.price.toFixed(2)}`}
                          </div>
                        </Link>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getProductStatusColor(product.status)}`}>
                        {product.status}
                      </span>
                    </div>
                  </div>
                ))}
                {products.length > 5 && (
                  <div className="p-4 text-center">
                    <Link
                      href="/products"
                      className="text-sm text-accent-primary hover:underline"
                    >
                      View {products.length - 5} more products →
                    </Link>
                  </div>
                )}
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
