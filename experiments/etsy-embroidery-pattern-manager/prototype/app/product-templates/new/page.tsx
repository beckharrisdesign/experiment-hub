'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProductTemplate, ProductTemplateType } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function NewProductTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productTemplateFormData, setProductTemplateFormData] = useState({
    name: 'Single Digital Pattern Download',
    types: ['digital'] as ProductTemplateType[],
    commonInstructions: '',
  });
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productTemplateFormData.name || productTemplateFormData.types.length === 0) {
      showToast('Name and at least one type are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/product-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          name: productTemplateFormData.name,
          types: productTemplateFormData.types,
          commonInstructions: productTemplateFormData.commonInstructions || null,
        }),
      });

      if (response.ok) {
        const newProductTemplate = await response.json();
        showToast('Product template created successfully', 'success');
        router.push(`/product-templates/${newProductTemplate.id}`);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create product template', 'error');
      }
    } catch (error) {
      console.error('Error creating product template:', error);
      showToast('Error creating product template', 'error');
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
          <h1 className="text-3xl font-bold">Create Product Template</h1>
          <p className="text-text-secondary mt-2">
            Product templates can be applied to one or more patterns
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info Section */}
          <div className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name *</label>
                <input
                  type="text"
                  value={productTemplateFormData.name}
                  onChange={(e) => setProductTemplateFormData({ ...productTemplateFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  placeholder="e.g., Single Digital Pattern Download"
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
            </div>
          </div>

          {/* Optional Fields Section */}
          <div className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Optional Fields</h2>
            <p className="text-sm text-text-secondary mb-4">
              These can be filled in later or generated when creating listings.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Common Instructions</label>
                <textarea
                  value={productTemplateFormData.commonInstructions}
                  onChange={(e) => setProductTemplateFormData({ ...productTemplateFormData, commonInstructions: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  rows={4}
                  placeholder="Common instructions that will be included in all listings using this template"
                />
              </div>

            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Product Template'}
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

