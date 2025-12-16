'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Template, TemplateType } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';
import PageHeader from '@/components/shared/PageHeader';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.id as string | undefined;
  
  // Debug: Log params to help diagnose routing issues
  useEffect(() => {
    console.log('Template Edit Page - params:', params);
    console.log('Template Edit Page - templateId:', templateId);
  }, [params, templateId]);
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    types: [] as TemplateType[],
    numberOfItems: 'single' as 'single' | 'three' | 'five',
    commonInstructions: '',
  });
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const fetchTemplate = useCallback(async () => {
    if (!templateId) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data);
        setTemplateFormData({
          name: data.name || '',
          types: data.types || [],
          numberOfItems: data.numberOfItems || 'single',
          commonInstructions: data.commonInstructions || '',
        });
        
      } else {
        showToast('Template not found', 'error');
        router.push('/templates');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      showToast('Error loading template', 'error');
    } finally {
      setLoading(false);
    }
  }, [templateId, showToast, router]);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    } else {
      setLoading(false);
    }
  }, [templateId, fetchTemplate]);




  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          name: templateFormData.name,
          types: templateFormData.types,
          numberOfItems: templateFormData.numberOfItems,
          commonInstructions: templateFormData.commonInstructions || null,
        }),
      });

      if (response.ok) {
        showToast('Template saved successfully', 'success');
        fetchTemplate();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save template' }));
        console.error('Save error:', errorData);
        showToast(errorData.error || 'Failed to save template', 'error');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showToast('Error saving template', 'error');
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

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="px-4 py-8 max-w-7xl mx-auto">
        <PageHeader
          title="Edit Template"
          description="Templates can be applied to one or more patterns"
          backButton={true}
        />

        <form onSubmit={handleSave} className="space-y-6">
          {/* Product Details */}
          <div className="bg-background-secondary border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Product Details</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
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
                {(['digital', 'physical'] as TemplateType[]).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 p-2 hover:bg-background-secondary rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={templateFormData.types.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTemplateFormData({
                            ...templateFormData,
                            types: [...templateFormData.types, type],
                          });
                        } else {
                          setTemplateFormData({
                            ...templateFormData,
                            types: templateFormData.types.filter((t) => t !== type),
                          });
                        }
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
              {templateFormData.types.length === 0 && (
                <p className="text-xs text-red-400 mt-1">Please select at least one type</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Number of Items *</label>
              <p className="text-xs text-text-secondary mb-2">
                How many items are bundled in listings using this template
              </p>
              <div className="space-y-2">
                {(['single', 'three', 'five'] as const).map((count) => (
                  <label
                    key={count}
                    className="flex items-center gap-2 p-2 hover:bg-background-secondary rounded cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="numberOfItems"
                      checked={templateFormData.numberOfItems === count}
                      onChange={() => {
                        setTemplateFormData({
                          ...templateFormData,
                          numberOfItems: count,
                        });
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-sm capitalize">{count === 'single' ? 'Single' : count === 'three' ? 'Three' : 'Five'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Common Instructions</label>
              <textarea
                value={templateFormData.commonInstructions}
                onChange={(e) => setTemplateFormData({ ...templateFormData, commonInstructions: e.target.value })}
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
              {saving ? 'Saving...' : 'Save Template'}
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

