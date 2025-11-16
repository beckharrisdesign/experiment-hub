'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProductTemplate, ProductTemplateType } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function ProductTemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const productTemplateId = params?.id as string | undefined;
  
  // Debug: Log params to help diagnose routing issues
  useEffect(() => {
    console.log('Product Template Edit Page - params:', params);
    console.log('Product Template Edit Page - productTemplateId:', productTemplateId);
  }, [params, productTemplateId]);
  
  const [productTemplate, setProductTemplate] = useState<ProductTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productTemplateFormData, setProductTemplateFormData] = useState({
    name: '',
    types: [] as ProductTemplateType[],
    commonInstructions: '',
  });
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const fetchProductTemplate = useCallback(async () => {
    if (!productTemplateId) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/product-templates/${productTemplateId}`);
      if (response.ok) {
        const data = await response.json();
        setProductTemplate(data);
        setProductTemplateFormData({
          name: data.name || '',
          types: data.types || [],
          commonInstructions: data.commonInstructions || '',
        });
        
      } else {
        showToast('Product template not found', 'error');
        router.push('/product-templates');
      }
    } catch (error) {
      console.error('Error fetching product template:', error);
      showToast('Error loading product template', 'error');
    } finally {
      setLoading(false);
    }
  }, [productTemplateId, showToast, router]);

  useEffect(() => {
    if (productTemplateId) {
      fetchProductTemplate();
    } else {
      setLoading(false);
    }
  }, [productTemplateId, fetchProductTemplate]);




  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productTemplate) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/product-templates/${productTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          name: productTemplateFormData.name,
          types: productTemplateFormData.types,
          commonInstructions: productTemplateFormData.commonInstructions || null,
        }),
      });

      if (response.ok) {
        showToast('Product template saved successfully', 'success');
        fetchProductTemplate();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save product template' }));
        console.error('Save error:', errorData);
        showToast(errorData.error || 'Failed to save product template', 'error');
      }
    } catch (error) {
      console.error('Error saving product template:', error);
      showToast('Error saving product template', 'error');
    } finally {
      setSaving(false);
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

  if (!productTemplate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="px-4 py-8 max-w-7xl mx-auto">
        <header className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-text-secondary hover:text-text-primary transition mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Edit Product Template</h1>
          <p className="text-text-secondary mt-2">
            Product templates can be applied to one or more patterns
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Product Details */}
          <div className="bg-background-secondary border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Product Details</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={productTemplateFormData.name}
                onChange={(e) => setProductTemplateFormData({ ...productTemplateFormData, name: e.target.value })}
                className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Types *</label>
              <p className="text-xs text-text-secondary mb-2">
                Select one or more types for this template
              </p>
              <div className="space-y-2">
                {(['digital', 'physical'] as ProductTemplateType[]).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 p-2 hover:bg-background-secondary rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={productTemplateFormData.types.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setProductTemplateFormData({
                            ...productTemplateFormData,
                            types: [...productTemplateFormData.types, type],
                          });
                        } else {
                          setProductTemplateFormData({
                            ...productTemplateFormData,
                            types: productTemplateFormData.types.filter((t) => t !== type),
                          });
                        }
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
              {productTemplateFormData.types.length === 0 && (
                <p className="text-xs text-red-400 mt-1">Please select at least one type</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Common Instructions</label>
              <textarea
                value={productTemplateFormData.commonInstructions}
                onChange={(e) => setProductTemplateFormData({ ...productTemplateFormData, commonInstructions: e.target.value })}
                className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                rows={6}
                placeholder="Common instructions that will be included in all listings using this template"
              />
            </div>

          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Product Template'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
            >
              Cancel
            </button>
          </div>
        </form>
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

