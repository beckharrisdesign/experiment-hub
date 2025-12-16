'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Template, Pattern, TemplateType } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';
import PageHeader from '@/components/shared/PageHeader';

interface TemplateWithPatterns extends Template {
  patterns?: Pattern[];
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateWithPatterns[]>([]);
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
      const [templatesResponse, patternsResponse] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/patterns'),
      ]);

      const templatesData: Template[] = templatesResponse.ok ? await templatesResponse.json() : [];
      const patternsData: Pattern[] = patternsResponse.ok ? await patternsResponse.json() : [];

      // Templates don't need pre-associated patterns - any pattern can be used with any template
      const templatesWithPatterns: TemplateWithPatterns[] = templatesData.map((template) => ({
        ...template,
        patterns: [], // No pre-filtering - patterns are selected when creating listings
      }));

      setTemplates(templatesWithPatterns);
      setPatterns(patternsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading templates', 'error');
    } finally {
      setLoading(false);
    }
  };


  const getTypeLabel = (type: TemplateType) => {
    return type.charAt(0).toUpperCase() + type.slice(1); // Capitalize first letter
  };

  const getNumberOfItemsLabel = (numberOfItems: 'single' | 'three' | 'five') => {
    return numberOfItems === 'single' ? 'Single' : numberOfItems === 'three' ? 'Three' : 'Five';
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
        <PageHeader
          title="Templates"
          description="Manage templates that can be applied to your patterns"
          action={
            <button
              onClick={() => router.push('/templates/new')}
              className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              + New Template
            </button>
          }
        />

        {templates.length === 0 ? (
          <div className="bg-background-secondary border border-border rounded-lg p-12 text-center">
            <p className="text-text-secondary mb-4">No templates yet</p>
            <p className="text-sm text-text-muted">
              Create a new template to get started
            </p>
          </div>
        ) : (
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background-tertiary">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Image</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Items</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => {
                    const updatedDate = new Date(template.updatedAt);
                    const formattedDate = updatedDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    
                    return (
                      <tr
                        key={template.id}
                        className="border-b border-border hover:bg-background-tertiary transition cursor-pointer"
                        onClick={() => router.push(`/templates/${template.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="w-16 h-16 bg-background-tertiary border border-border rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                            {template.imageUrl ? (
                              <img
                                src={template.imageUrl}
                                alt={template.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-text-muted text-xs">
                                {template.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/templates/${template.id}`}
                            className="font-medium text-text-primary hover:text-accent-primary transition block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {template.title || template.name}
                          </Link>
                          {template.commonInstructions && (
                            <div className="text-xs text-text-secondary mt-1 line-clamp-1">
                              {template.commonInstructions}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary">
                            {template.types
                              .filter((type): type is TemplateType => type === 'digital' || type === 'physical')
                              .map((type) => getTypeLabel(type))
                              .join(', ') || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary">
                            {getNumberOfItemsLabel(template.numberOfItems || 'single')}
                          </span>
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

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}

