'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pattern } from '@/types';
import Spinner from '@/components/shared/Spinner';
import PatternItem from '@/components/patterns/PatternItem';
import Toast from '@/components/shared/Toast';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function PatternsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    category: '',
    difficulty: '' as Pattern['difficulty'] | '',
    style: '',
  });
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const fetchPatterns = useCallback(async () => {
    try {
      const response = await fetch('/api/patterns');
      if (response.ok) {
        const data = await response.json();
        // Sort by updated date (newest first)
        data.sort((a: Pattern, b: Pattern) => {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setPatterns(data);
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImageUpload = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) {
      showToast('Please select at least one image', 'info');
      return;
    }

    console.log('Files to upload:', files.length);
    files.forEach((file, index) => {
      console.log(`File ${index}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        isFile: file instanceof File
      });
    });

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        console.log(`Appending file ${index}:`, file.name);
        formData.append('images', file);
      });

      // Verify FormData contents
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}:`, {
            name: value.name,
            type: value.type,
            size: value.size
          });
        } else {
          console.log(`  ${key}:`, value);
        }
      }

      console.log('Sending request to /api/patterns/upload...');
      const response = await fetch('/api/patterns/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result);
        showToast(
          `Successfully created ${result.count} pattern${result.count > 1 ? 's' : ''} from image${result.count > 1 ? 's' : ''}`,
          'success'
        );
        fetchPatterns();
      } else {
        let errorMessage = 'Failed to upload images';
        try {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.details || errorMessage;
            console.error('Parsed error JSON:', errorJson);
          } catch (e) {
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        console.error('Upload error:', errorMessage, 'Status:', response.status);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      showToast(`Error uploading images: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setUploading(false);
    }
  }, [showToast, fetchPatterns]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  // Handle paste events for image upload
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Look for images in clipboard
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleImageUpload(imageFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleImageUpload]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleImageUpload(files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      handleImageUpload(files);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({ name: '', notes: '', category: '', difficulty: '', style: '' });
        fetchPatterns();
      }
    } catch (error) {
      console.error('Error creating pattern:', error);
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
            <h1 className="text-3xl font-bold">Patterns</h1>
            <p className="text-text-secondary mt-2">Manage your embroidery patterns</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
            >
              {showForm ? 'Cancel' : '+ New Pattern'}
            </button>
            <label className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition cursor-pointer">
              {uploading ? 'Uploading...' : '📷 Upload Images'}
              <input
                type="file"
                multiple
                accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.ico,.tiff,.tif,.heic,.heif"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </header>

        {/* Image Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="mb-8 bg-background-secondary border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent-primary transition"
        >
          <div className="max-w-md mx-auto">
            <div className="text-4xl mb-4">📷</div>
            <h3 className="text-xl font-semibold mb-2">Upload Images to Create Patterns</h3>
            <p className="text-text-secondary mb-4">
              Drag and drop images here, paste images (⌘V / Ctrl+V), or click the button above
            </p>
            <p className="text-sm text-text-muted">
              Each image will automatically create a new pattern with a default name
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Pattern</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pattern Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Pattern['difficulty'] })}
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
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  rows={3}
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              Create Pattern
            </button>
          </form>
        )}

        {patterns.length === 0 ? (
          <div className="bg-background-secondary border border-border rounded-lg p-12 text-center">
            <p className="text-text-secondary mb-4">No patterns yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              Create Your First Pattern
            </button>
          </div>
        ) : (
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-6 hover:bg-background-tertiary transition"
                >
                  <PatternItem
                    pattern={pattern}
                    showDetails={true}
                    onEdit={() => router.push(`/patterns/${pattern.id}`)}
                  />
                </div>
              ))}
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
