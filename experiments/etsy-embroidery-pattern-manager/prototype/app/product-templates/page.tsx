'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProductTemplate, Pattern, ProductTemplateType } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ProductTemplateWithPatterns extends ProductTemplate {
  patterns?: Pattern[];
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function ProductTemplatesPage() {
  const router = useRouter();
  const [productTemplates, setProductTemplates] = useState<ProductTemplateWithPatterns[]>([]);
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
      const [productTemplatesResponse, patternsResponse] = await Promise.all([
        fetch('/api/product-templates'),
        fetch('/api/patterns'),
      ]);

      const productTemplatesData: ProductTemplate[] = productTemplatesResponse.ok ? await productTemplatesResponse.json() : [];
      const patternsData: Pattern[] = patternsResponse.ok ? await patternsResponse.json() : [];

      // Match patterns to product templates (product templates can have multiple patterns now)
      const productTemplatesWithPatterns: ProductTemplateWithPatterns[] = productTemplatesData.map((productTemplate) => ({
        ...productTemplate,
        patterns: productTemplate.patternIds
          ? patternsData.filter((p) => productTemplate.patternIds.includes(p.id))
          : [],
      }));

      setProductTemplates(productTemplatesWithPatterns);
      setPatterns(patternsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading product templates', 'error');
    } finally {
      setLoading(false);
    }
  };


  const getTypeLabel = (type: ProductTemplateType) => {
    return type.charAt(0).toUpperCase() + type.slice(1); // Capitalize first letter
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
            <h1 className="text-3xl font-bold">Product Templates</h1>
            <p className="text-text-secondary mt-2">
              Manage product templates that can be applied to your patterns
            </p>
          </div>
          <button
            onClick={() => router.push('/product-templates/new')}
            className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
          >
            + New Product Template
          </button>
        </header>

        {productTemplates.length === 0 ? (
          <div className="bg-background-secondary border border-border rounded-lg p-12 text-center">
            <p className="text-text-secondary mb-4">No product templates yet</p>
            <button
              onClick={() => router.push('/product-templates/new')}
              className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              Create Your First Product Template
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background-tertiary">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Product Template</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Pattern</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {productTemplates.map((productTemplate) => (
                  <tr
                    key={productTemplate.id}
                    className="border-b border-border hover:bg-background-tertiary transition"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-text-primary">
                          {productTemplate.title || productTemplate.name}
                        </div>
                        {productTemplate.commonInstructions && (
                          <div className="text-sm text-text-secondary line-clamp-1 mt-1">
                            {productTemplate.commonInstructions}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {productTemplate.patterns && productTemplate.patterns.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {productTemplate.patterns.map((pattern) => (
                            <Link
                              key={pattern.id}
                              href={`/patterns/${pattern.id}`}
                              className="text-accent-primary hover:underline text-sm"
                            >
                              {pattern.name}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted text-sm">No patterns</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {productTemplate.types.map((type, index) => (
                          <span key={type} className="text-sm text-text-secondary">
                            {index > 0 && <span className="text-text-secondary">, </span>}
                            {getTypeLabel(type)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/product-templates/${productTemplate.id}`)}
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

