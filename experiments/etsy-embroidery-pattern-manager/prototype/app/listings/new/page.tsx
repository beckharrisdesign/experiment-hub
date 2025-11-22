'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductTemplate, Pattern, Listing } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

type Step = 'template' | 'patterns' | 'edit';

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('template');
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [availablePatterns, setAvailablePatterns] = useState<Pattern[]>([]);
  const [selectedPatternIds, setSelectedPatternIds] = useState<string[]>([]);
  const [generatedListing, setGeneratedListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast({ ...toast, isVisible: false }), 3000);
  };

  useEffect(() => {
    fetchProductTemplates();
    fetchPatterns();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      // Show all patterns - user can select any pattern for a new listing
      setAvailablePatterns(patterns);
      
      // Reset selected patterns when template changes
      setSelectedPatternIds([]);
    }
  }, [selectedTemplate, patterns]);

  const fetchProductTemplates = async () => {
    try {
      const response = await fetch('/api/product-templates');
      if (response.ok) {
        const data = await response.json();
        // Show all templates - patterns will be selected in the next step
        setProductTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching product templates:', error);
      showToast('Failed to load product templates', 'error');
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
      showToast('Failed to load patterns', 'error');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = productTemplates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setStep('patterns');
    }
  };

  const handlePatternToggle = (patternId: string) => {
    setSelectedPatternIds((prev) => {
      if (prev.includes(patternId)) {
        return prev.filter((id) => id !== patternId);
      }
      return [...prev, patternId];
    });
  };

  const getRequiredPatternCount = (): number => {
    if (!selectedTemplate) return 0;
    switch (selectedTemplate.numberOfItems) {
      case 'single':
        return 1;
      case 'three':
        return 3;
      case 'five':
        return 5;
      default:
        return 1;
    }
  };

  const canProceedToGenerate = (): boolean => {
    const required = getRequiredPatternCount();
    return selectedPatternIds.length === required;
  };

  const handleGenerateListing = async () => {
    console.log('[Listing Creation] Starting listing generation...');
    console.log('[Listing Creation] Selected template:', selectedTemplate);
    console.log('[Listing Creation] Selected pattern IDs:', selectedPatternIds);
    console.log('[Listing Creation] Can proceed:', canProceedToGenerate());

    if (!selectedTemplate || !canProceedToGenerate()) {
      console.log('[Listing Creation] Validation failed - missing template or patterns');
      if (!selectedTemplate) {
        showToast('Please select a product template', 'error');
      } else {
        showToast(`Please select ${getRequiredPatternCount()} pattern${getRequiredPatternCount() !== 1 ? 's' : ''}`, 'error');
      }
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        productTemplateId: selectedTemplate.id,
        patternIds: selectedPatternIds,
      };
      console.log('[Listing Creation] Sending request to /api/listings/generate:', requestBody);

      const response = await fetch('/api/listings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[Listing Creation] Response status:', response.status, response.statusText);
      console.log('[Listing Creation] Response ok:', response.ok);

      if (response.ok) {
        const listing = await response.json();
        console.log('[Listing Creation] Generated listing:', listing);
        console.log('[Listing Creation] Listing ID:', listing.id);
        console.log('[Listing Creation] Listing title:', listing.title);
        console.log('[Listing Creation] Listing patternIds:', listing.patternIds);
        console.log('[Listing Creation] Listing productTemplateId:', listing.productTemplateId);
        setGeneratedListing(listing);
        setStep('edit');
      } else {
        // Better error handling - try to parse JSON, fallback to text
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          console.error('[Listing Creation] Error response text:', errorText);
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.details || errorMessage;
            console.error('[Listing Creation] Parsed error JSON:', errorJson);
          } catch (e) {
            // Not JSON, use text if available
            if (errorText && errorText.length > 0) {
              errorMessage = errorText;
            }
          }
        } catch (parseError) {
          console.error('[Listing Creation] Error parsing error response:', parseError);
        }
        console.error('[Listing Creation] Final error message:', errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('[Listing Creation] Exception during listing generation:', error);
      showToast('Error generating listing', 'error');
    } finally {
      setLoading(false);
      console.log('[Listing Creation] Generation complete');
    }
  };

  const handleSaveListing = async () => {
    if (!generatedListing) {
      console.log('[Listing Save] No listing to save');
      return;
    }

    console.log('[Listing Save] Starting save...');
    console.log('[Listing Save] Listing ID:', generatedListing.id);
    console.log('[Listing Save] Listing data:', generatedListing);

    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${generatedListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedListing),
      });

      console.log('[Listing Save] Response status:', response.status, response.statusText);
      console.log('[Listing Save] Response ok:', response.ok);

      if (response.ok) {
        const updatedListing = await response.json();
        console.log('[Listing Save] Listing saved successfully:', updatedListing);
        showToast('Listing saved successfully', 'success');
        router.push('/listings');
      } else {
        const error = await response.json();
        console.error('[Listing Save] Error response:', error);
        showToast(error.error || 'Failed to save listing', 'error');
      }
    } catch (error) {
      console.error('[Listing Save] Exception during save:', error);
      showToast('Error saving listing', 'error');
    } finally {
      setLoading(false);
      console.log('[Listing Save] Save complete');
    }
  };

  const handleUpdateListing = (field: keyof Listing, value: any) => {
    if (!generatedListing) return;
    setGeneratedListing({ ...generatedListing, [field]: value });
  };

  const handleUpdateTags = (tags: string[]) => {
    handleUpdateListing('tags', tags);
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8">
          <button
            onClick={() => router.push('/listings')}
            className="text-text-secondary hover:text-text-primary mb-4"
          >
            ← Back to Listings
          </button>
          <h1 className="text-3xl font-bold mb-2">Create New Listing</h1>
          <div className="flex items-center gap-4 mt-4">
            <div className={`flex items-center gap-2 ${step === 'template' ? 'text-accent-primary' : 'text-text-secondary'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'template' ? 'border-accent-primary bg-accent-primary/10' : 'border-border'}`}>
                1
              </div>
              <span className="font-medium">Select Template</span>
            </div>
            <div className="w-12 h-0.5 bg-border"></div>
            <div className={`flex items-center gap-2 ${step === 'patterns' ? 'text-accent-primary' : step === 'edit' ? 'text-text-primary' : 'text-text-secondary'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'patterns' ? 'border-accent-primary bg-accent-primary/10' : step === 'edit' ? 'border-text-primary' : 'border-border'}`}>
                2
              </div>
              <span className="font-medium">Select Patterns</span>
            </div>
            <div className="w-12 h-0.5 bg-border"></div>
            <div className={`flex items-center gap-2 ${step === 'edit' ? 'text-accent-primary' : 'text-text-secondary'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'edit' ? 'border-accent-primary bg-accent-primary/10' : 'border-border'}`}>
                3
              </div>
              <span className="font-medium">Edit Details</span>
            </div>
          </div>
        </header>

        <div className="bg-background-secondary border border-border rounded-lg p-6">
          {step === 'template' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Product Template</h2>
              <div className="space-y-3">
                {productTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className="w-full text-left p-4 bg-background-tertiary border border-border rounded hover:border-accent-primary/50 hover:bg-background-primary transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-text-primary">{template.name}</h3>
                        <p className="text-sm text-text-secondary mt-1">
                          {template.numberOfItems === 'single' ? 'Select 1 pattern' : 
                           template.numberOfItems === 'three' ? 'Select 3 patterns' : 
                           'Select 5 patterns'}
                        </p>
                      </div>
                      <span className="text-accent-primary">→</span>
                    </div>
                  </button>
                ))}
                {productTemplates.length === 0 && (
                  <p className="text-text-secondary text-center py-8">
                    No product templates available. Create a template first.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'patterns' && selectedTemplate && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Select Patterns</h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Template: {selectedTemplate.name} • Select {getRequiredPatternCount()} pattern{getRequiredPatternCount() !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStep('template');
                    setSelectedTemplate(null);
                    setSelectedPatternIds([]);
                  }}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Change Template
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {availablePatterns.map((pattern) => {
                  const isSelected = selectedPatternIds.includes(pattern.id);
                  return (
                    <button
                      key={pattern.id}
                      onClick={() => handlePatternToggle(pattern.id)}
                      className={`p-4 border-2 rounded-lg transition ${
                        isSelected
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-border hover:border-accent-primary/50'
                      }`}
                    >
                      {pattern.imageUrl && (
                        <img
                          src={pattern.imageUrl}
                          alt={pattern.name}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <div className="text-sm font-medium text-text-primary">{pattern.name}</div>
                      {isSelected && (
                        <div className="text-xs text-accent-primary mt-1">✓ Selected</div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-text-secondary">
                  {selectedPatternIds.length} of {getRequiredPatternCount()} selected
                </p>
                <button
                  onClick={handleGenerateListing}
                  disabled={!canProceedToGenerate() || loading}
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
          )}

          {step === 'edit' && generatedListing && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Edit Listing Details</h2>
                <button
                  onClick={() => {
                    setStep('patterns');
                    setGeneratedListing(null);
                  }}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Change Patterns
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={generatedListing.title}
                    onChange={(e) => handleUpdateListing('title', e.target.value)}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    {generatedListing.title.length}/140 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={generatedListing.description}
                    onChange={(e) => handleUpdateListing('description', e.target.value)}
                    rows={10}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Tags ({generatedListing.tags.length}/13)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {generatedListing.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-background-tertiary border border-border rounded text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => {
                            const newTags = generatedListing.tags.filter((_, i) => i !== idx);
                            handleUpdateTags(newTags);
                          }}
                          className="text-text-secondary hover:text-text-primary"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add a tag and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newTag = e.currentTarget.value.trim();
                        if (generatedListing.tags.length < 13 && !generatedListing.tags.includes(newTag)) {
                          handleUpdateTags([...generatedListing.tags, newTag]);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={generatedListing.category || ''}
                      onChange={(e) => handleUpdateListing('category', e.target.value)}
                      className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      value={generatedListing.price || ''}
                      onChange={(e) => handleUpdateListing('price', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                  <button
                    onClick={() => router.push('/listings')}
                    className="px-6 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveListing}
                    disabled={loading}
                    className="px-6 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      'Save Listing'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

