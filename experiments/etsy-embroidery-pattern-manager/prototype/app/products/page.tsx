'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Product, Pattern } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ProductWithPattern extends Product {
  pattern?: Pattern;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithPattern[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
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
      const [productsResponse, patternsResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/patterns'),
      ]);

      const productsData: Product[] = productsResponse.ok ? await productsResponse.json() : [];
      const patternsData: Pattern[] = patternsResponse.ok ? await patternsResponse.json() : [];

      // Match patterns to products
      const productsWithPatterns: ProductWithPattern[] = productsData.map((product) => ({
        ...product,
        pattern: patternsData.find((p) => p.id === product.patternId),
      }));

      setProducts(productsWithPatterns);
      setPatterns(patternsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Product['status']) => {
    switch (status) {
      case 'listed':
        return 'bg-purple-500';
      case 'ready':
        return 'bg-green-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: Product['type']) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary flex items-center justify-center gap-3">
        <Spinner size="md" />
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="px-4 py-8 max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-text-secondary mt-2">
              Manage different product offerings from your patterns
            </p>
          </div>
          <button
            onClick={() => router.push('/products/new')}
            className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
          >
            + New Product
          </button>
        </header>

        {products.length === 0 ? (
          <div className="bg-background-secondary border border-border rounded-lg p-12 text-center">
            <p className="text-text-secondary mb-4">No products yet</p>
            <button
              onClick={() => router.push('/products/new')}
              className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              Create Your First Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background-tertiary">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Product</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Pattern</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Price</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border hover:bg-background-tertiary transition"
                  >
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 text-xs font-medium rounded-full text-white ${getStatusColor(product.status)}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-text-primary">
                          {product.title || product.name}
                        </div>
                        {product.description && (
                          <div className="text-sm text-text-secondary line-clamp-1 mt-1">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.pattern ? (
                        <Link
                          href={`/patterns/${product.pattern.id}`}
                          className="text-accent-primary hover:underline"
                        >
                          {product.pattern.name}
                        </Link>
                      ) : (
                        <span className="text-text-muted">Unknown pattern</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-secondary">{getTypeLabel(product.type)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-secondary">
                        {product.price ? `$${product.price.toFixed(2)}` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/products/${product.id}`)}
                        className="px-3 py-1.5 text-xs bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

