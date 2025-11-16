'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Product, Pattern } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    type: '' as Product['type'] | '',
    status: 'draft' as Product['status'],
    title: '',
    description: '',
    tags: [] as string[],
    category: '',
    price: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  useEffect(() => {
    if (productId) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [productId]);

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

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
        setProductFormData({
          name: data.name || '',
          type: data.type || '',
          status: data.status || 'draft',
          title: data.title || '',
          description: data.description || '',
          tags: data.tags || [],
          category: data.category || '',
          price: data.price?.toString() || '',
        });
        
        // Set image preview if image exists
        if (data.imageUrl) {
          setImagePreview(data.imageUrl);
        }
        
        // Fetch pattern if patternId exists
        if (data.patternId) {
          fetchPattern(data.patternId);
        }
      } else {
        showToast('Product not found', 'error');
        router.push('/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      showToast('Error loading product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPattern = async (patternId: string) => {
    try {
      const response = await fetch(`/api/patterns/${patternId}`);
      if (response.ok) {
        const data = await response.json();
        setPattern(data);
      }
    } catch (error) {
      console.error('Error fetching pattern:', error);
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
    if (!imageFile || !productId) {
      showToast('Please select an image first', 'info');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`/api/products/${productId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { imageUrl } = await response.json();
        
        // Update product with image URL
        const updateResponse = await fetch(`/api/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });

        if (updateResponse.ok) {
          showToast('Image uploaded and saved successfully', 'success');
          setImageFile(null);
          fetchProduct(); // Refresh product data
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productFormData.name,
          type: productFormData.type,
          status: productFormData.status,
          title: productFormData.title || null,
          description: productFormData.description || null,
          tags: productFormData.tags,
          category: productFormData.category || null,
          price: productFormData.price ? parseFloat(productFormData.price) : null,
        }),
      });

      if (response.ok) {
        showToast('Product saved successfully', 'success');
        fetchProduct();
      } else {
        showToast('Failed to save product', 'error');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !productFormData.tags.includes(tagInput.trim())) {
      setProductFormData({
        ...productFormData,
        tags: [...productFormData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setProductFormData({
      ...productFormData,
      tags: productFormData.tags.filter((tag) => tag !== tagToRemove),
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

  if (!product) {
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
          {pattern && (
            <p className="text-text-secondary mt-2">
              Pattern: <span className="font-medium">{pattern.name}</span>
            </p>
          )}
        </header>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Image Section */}
          <div className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Product Image</h2>
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
                      setImagePreview(product.imageUrl || null);
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
                  <label className="px-4 py-2 bg-accent-primary text-white rounded cursor-pointer hover:opacity-90 transition">
                    Upload Image
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              )}
              {!imagePreview && (
                <div className="mt-2">
                  <label className="sr-only">Upload image</label>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    id="image-upload"
                  />
                </div>
              )}
              {imageFile && imagePreview && imagePreview !== product.imageUrl && (
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

          {/* Product Details */}
          <div className="bg-background-secondary border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Product Details</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={productFormData.name}
                onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  value={productFormData.type}
                  onChange={(e) => setProductFormData({ ...productFormData, type: e.target.value as Product['type'] })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  required
                >
                  <option value="">Select type</option>
                  <option value="printable-pdf">Printable PDF</option>
                  <option value="svg">SVG</option>
                  <option value="kit">Kit</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status *</label>
                <select
                  value={productFormData.status}
                  onChange={(e) => setProductFormData({ ...productFormData, status: e.target.value as Product['status'] })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="listed">Listed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={productFormData.title}
                onChange={(e) => setProductFormData({ ...productFormData, title: e.target.value })}
                className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                placeholder="Etsy listing title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={productFormData.description}
                onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                rows={6}
                placeholder="Product description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
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
                  className="flex-1 px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
                >
                  Add
                </button>
              </div>
              {productFormData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {productFormData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-background-tertiary border border-border rounded text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={productFormData.category}
                  onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  placeholder="Etsy category"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={productFormData.price}
                  onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  placeholder="0.00"
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
              {saving ? 'Saving...' : 'Save Product'}
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

