'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pattern, Listing } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function PatternDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patternId = params.id as string;
  
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [patternFormData, setPatternFormData] = useState({
    name: '',
    notes: '',
    category: '',
    difficulty: '' as Pattern['difficulty'] | '',
    style: '',
  });
  const [listingFormData, setListingFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    category: '',
    price: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });
  const [showPatternSelectionModal, setShowPatternSelectionModal] = useState(false);
  const [selectedProductTemplate, setSelectedProductTemplate] = useState<any>(null);
  const [selectedPatternIds, setSelectedPatternIds] = useState<string[]>([]);
  const [availablePatterns, setAvailablePatterns] = useState<Pattern[]>([]);

  useEffect(() => {
    if (patternId) {
      fetchPattern();
      fetchListing();
    } else {
      setLoading(false);
    }
  }, [patternId]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  // Handle paste events for image upload
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Look for image in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            // Convert blob to File
            const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
            setImageFile(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
              setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            
            showToast('Image pasted successfully', 'success');
          }
          break;
        }
      }
    };

    // Add paste listener to document
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [showToast]);

  const fetchPattern = async () => {
    try {
      const response = await fetch(`/api/patterns/${patternId}`);
      if (response.ok) {
        const data = await response.json();
        setPattern(data);
        setPatternFormData({
          name: data.name || '',
          notes: data.notes || '',
          category: data.category || '',
          difficulty: data.difficulty || '',
          style: data.style || '',
        });
        
        // Set image preview if image exists
        if (data.imageUrl) {
          setImagePreview(data.imageUrl);
        }
      } else {
        showToast('Pattern not found', 'error');
        router.push('/patterns');
      }
    } catch (error) {
      console.error('Error fetching pattern:', error);
      showToast('Error loading pattern', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchListing = async () => {
    try {
      const response = await fetch('/api/listings');
      if (response.ok) {
        const listings: Listing[] = await response.json();
        // Find listing that includes this pattern
        const productListing = listings.find((l) => l.patternIds?.includes(patternId));
        if (productListing) {
          setListing(productListing);
          setListingFormData({
            title: productListing.title || '',
            description: productListing.description || '',
            tags: productListing.tags || [],
            category: productListing.category || '',
            price: productListing.price?.toString() || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !patternId) {
      showToast('Please select an image first', 'info');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`/api/patterns/${patternId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { imageUrl } = await response.json();
        
        // Update pattern with image URL
        const updateResponse = await fetch(`/api/patterns/${patternId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });

        if (updateResponse.ok) {
          showToast('Image uploaded and saved successfully', 'success');
          setImageFile(null);
          fetchPattern(); // Refresh pattern data
        } else {
          showToast('Failed to save image URL', 'error');
        }
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to upload image', 'error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Error uploading image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePatternSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/patterns/${patternId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patternFormData),
      });

      if (response.ok) {
        showToast('Pattern saved successfully', 'success');
        fetchPattern();
      } else {
        showToast('Failed to save pattern', 'error');
      }
    } catch (error) {
      console.error('Error saving pattern:', error);
      showToast('Error saving pattern', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleListingSave = async () => {
    if (!listing) {
      showToast('Please generate a listing first', 'info');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: listingFormData.title,
          description: listingFormData.description,
          tags: listingFormData.tags,
          category: listingFormData.category || null,
          price: listingFormData.price ? parseFloat(listingFormData.price) : null,
        }),
      });

      if (response.ok) {
        showToast('Listing saved successfully', 'success');
        fetchListing();
      } else {
        showToast('Failed to save listing', 'error');
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      showToast('Error saving listing', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateListing = async () => {
    if (!pattern) return;

    try {
      // Get all product templates - any template can be used with any pattern
      const productTemplatesResponse = await fetch('/api/product-templates');
      if (!productTemplatesResponse.ok) {
        showToast('Failed to load product templates', 'error');
        return;
      }
      
      const allProductTemplates = await productTemplatesResponse.json();
      
      if (allProductTemplates.length === 0) {
        showToast('No product templates available. Please create a product template first.', 'error');
        return;
      }
      
      // Use the first single-item template, or let user select
      const singleTemplate = allProductTemplates.find((p: any) => p.numberOfItems === 'single');
      const productTemplate = singleTemplate || allProductTemplates[0];
      setSelectedProductTemplate(productTemplate);
      
      // Load all patterns - any pattern can be selected
      const patternsResponse = await fetch('/api/patterns');
      if (patternsResponse.ok) {
        const allPatterns = await patternsResponse.json();
        setAvailablePatterns(allPatterns);
        
        // Pre-select the current pattern
        const expectedCount = productTemplate.numberOfItems === 'single' ? 1 
          : productTemplate.numberOfItems === 'three' ? 3 
          : 5;
        
        if (expectedCount === 1) {
          setSelectedPatternIds([pattern.id]);
          // If single, generate immediately
          await generateListingWithPatterns(productTemplate.id, [pattern.id]);
        } else {
          // Show modal for selection
          setSelectedPatternIds([pattern.id]);
          setShowPatternSelectionModal(true);
        }
      }
    } catch (error) {
      console.error('Error generating listing:', error);
      showToast('Error generating listing', 'error');
    }
  };

  const generateListingWithPatterns = async (productTemplateId: string, patternIds: string[]) => {
    setSaving(true);
    try {
      const response = await fetch('/api/listings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productTemplateId, patternIds }),
      });

      if (response.ok) {
        const newListing = await response.json();
        setListing(newListing);
        setListingFormData({
          title: newListing.title || '',
          description: newListing.description || '',
          tags: newListing.tags || [],
          category: newListing.category || '',
          price: newListing.price?.toString() || '',
        });
        showToast('Listing generated successfully', 'success');
        fetchListing();
        setShowPatternSelectionModal(false);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to generate listing', 'error');
      }
    } catch (error) {
      console.error('Error generating listing:', error);
      showToast('Error generating listing', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePatternToggle = (patternId: string) => {
    if (!selectedProductTemplate) return;
    
    const expectedCount = selectedProductTemplate.numberOfItems === 'single' ? 1 
      : selectedProductTemplate.numberOfItems === 'three' ? 3 
      : 5;
    
    if (selectedPatternIds.includes(patternId)) {
      // Deselect
      setSelectedPatternIds(selectedPatternIds.filter(id => id !== patternId));
    } else {
      // Select (but limit to expected count)
      if (selectedPatternIds.length < expectedCount) {
        setSelectedPatternIds([...selectedPatternIds, patternId]);
      } else {
        showToast(`You can only select ${expectedCount} pattern(s) for this template`, 'error');
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !listingFormData.tags.includes(tagInput.trim())) {
      setListingFormData({
        ...listingFormData,
        tags: [...listingFormData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setListingFormData({
      ...listingFormData,
      tags: listingFormData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary flex items-center justify-center gap-3">
        <Spinner size="md" />
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!pattern) {
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
          <h1 className="text-3xl font-bold">Edit Product</h1>
        </header>

        <div className="space-y-6">
          {/* Image Section */}
          <div className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Main Image</h2>
            <div className="max-w-xs">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full aspect-square object-cover rounded border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(pattern?.imageUrl || null);
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-square bg-background-tertiary border-2 border-dashed border-border rounded flex flex-col items-center justify-center">
                  <span className="text-text-muted text-sm mb-2">No image</span>
                  <div className="text-xs text-text-muted mb-3">Paste an image (⌘V / Ctrl+V) or</div>
                  <label className="px-4 py-2 bg-background-primary border border-border rounded hover:bg-background-secondary transition cursor-pointer text-sm">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
              {imageFile && imagePreview && imagePreview !== pattern?.imageUrl && (
                <button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={uploadingImage}
                  className="mt-4 w-full px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
                >
                  {uploadingImage ? 'Uploading...' : 'Save Image'}
                </button>
              )}
            </div>
          </div>

          {/* Pattern Details Form */}
          <form onSubmit={handlePatternSave} className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Pattern Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pattern Name *</label>
                <input
                  type="text"
                  value={patternFormData.name}
                  onChange={(e) => setPatternFormData({ ...patternFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <input
                    type="text"
                    value={patternFormData.category}
                    onChange={(e) => setPatternFormData({ ...patternFormData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    placeholder="e.g., Floral, Geometric, Animals"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={patternFormData.difficulty}
                    onChange={(e) => setPatternFormData({ ...patternFormData, difficulty: e.target.value as Pattern['difficulty'] })}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  >
                    <option value="">Select difficulty</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Style</label>
                  <input
                    type="text"
                    value={patternFormData.style}
                    onChange={(e) => setPatternFormData({ ...patternFormData, style: e.target.value })}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    placeholder="e.g., Modern, Vintage, Minimalist"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={patternFormData.notes}
                  onChange={(e) => setPatternFormData({ ...patternFormData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  rows={4}
                  placeholder="Pattern ideas, inspiration, design notes..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Pattern'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>

          {/* Listing Section */}
          <div className="bg-background-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Listing</h2>
              {!listing && (
                <button
                  onClick={handleGenerateListing}
                  disabled={saving}
                  className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    'Generate Listing'
                  )}
                </button>
              )}
            </div>
            {listing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={listingFormData.title}
                    onChange={(e) => setListingFormData({ ...listingFormData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    value={listingFormData.description}
                    onChange={(e) => setListingFormData({ ...listingFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    rows={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tags ({listingFormData.tags.length}/13)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {listingFormData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-background-tertiary border border-border rounded text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-text-muted hover:text-text-primary transition"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {listingFormData.tags.length < 13 && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Add tag..."
                        className="flex-1 px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <input
                      type="text"
                      value={listingFormData.category}
                      onChange={(e) => setListingFormData({ ...listingFormData, category: e.target.value })}
                      className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={listingFormData.price}
                      onChange={(e) => setListingFormData({ ...listingFormData, price: e.target.value })}
                      className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleListingSave}
                    disabled={saving || !listingFormData.title || !listingFormData.description}
                    className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
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
            ) : (
              <div className="text-text-secondary text-sm">
                <p>Click "Generate Listing" above to create optimized Etsy listing content for this pattern.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pattern Selection Modal */}
      {showPatternSelectionModal && selectedProductTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-primary border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Select Patterns for Listing</h2>
            <p className="text-text-secondary mb-4">
              Template requires {selectedProductTemplate.numberOfItems === 'single' ? '1' : selectedProductTemplate.numberOfItems === 'three' ? '3' : '5'} pattern(s). 
              Select {selectedProductTemplate.numberOfItems === 'single' ? '1' : selectedProductTemplate.numberOfItems === 'three' ? '3' : '5'} pattern(s) from the available options:
            </p>
            
            <div className="space-y-2 mb-6">
              {availablePatterns.map((p) => {
                const isSelected = selectedPatternIds.includes(p.id);
                const expectedCount = selectedProductTemplate.numberOfItems === 'single' ? 1 
                  : selectedProductTemplate.numberOfItems === 'three' ? 3 
                  : 5;
                const canSelect = isSelected || selectedPatternIds.length < expectedCount;
                
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition ${
                      isSelected 
                        ? 'bg-accent-primary bg-opacity-20 border-accent-primary' 
                        : canSelect
                        ? 'bg-background-secondary border-border hover:bg-background-tertiary'
                        : 'bg-background-secondary border-border opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handlePatternToggle(p.id)}
                      disabled={!canSelect && !isSelected}
                      className="rounded border-border"
                    />
                    <span className="flex-1 font-medium">{p.name}</span>
                    {p.category && (
                      <span className="text-sm text-text-secondary">{p.category}</span>
                    )}
                  </label>
                );
              })}
            </div>
            
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPatternSelectionModal(false);
                  setSelectedPatternIds([]);
                }}
                className="px-6 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedProductTemplate) {
                    const expectedCount = selectedProductTemplate.numberOfItems === 'single' ? 1 
                      : selectedProductTemplate.numberOfItems === 'three' ? 3 
                      : 5;
                    if (selectedPatternIds.length === expectedCount) {
                      generateListingWithPatterns(selectedProductTemplate.id, selectedPatternIds);
                    } else {
                      showToast(`Please select exactly ${expectedCount} pattern(s)`, 'error');
                    }
                  }
                }}
                disabled={saving || selectedPatternIds.length !== (selectedProductTemplate.numberOfItems === 'single' ? 1 : selectedProductTemplate.numberOfItems === 'three' ? 3 : 5)}
                className="px-6 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? 'Generating...' : 'Generate Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

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
