'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pattern } from '@/types';
import Spinner from '@/components/shared/Spinner';
import PatternItem from '@/components/patterns/PatternItem';
import Toast from '@/components/shared/Toast';
import PageHeader from '@/components/shared/PageHeader';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

interface PatternWithTemplates extends Pattern {
  templates?: Array<{ id: string; name: string }>;
}

interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  fileSize?: number;
  resolution?: string;
  formattedSize?: string;
}

interface PatternWithMetadata extends PatternWithTemplates {
  imageMetadata?: ImageMetadata | null;
}

export default function PatternsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<PatternWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const fetchPatterns = useCallback(async () => {
    try {
      // Fetch both patterns and templates from central source
      const [patternsResponse, templatesResponse] = await Promise.all([
        fetch('/api/patterns'),
        fetch('/api/product-templates'),
      ]);

      if (patternsResponse.ok && templatesResponse.ok) {
        const patternsData: Pattern[] = await patternsResponse.json();
        const templatesData = await templatesResponse.json();

        // Patterns don't need to be pre-associated with templates - any pattern can be used with any template
        const patternsWithTemplates: PatternWithTemplates[] = patternsData.map((pattern) => ({
          ...pattern,
          templates: [], // No pre-filtering - templates are selected when creating listings
        }));

        // Sort by updated date (newest first)
        patternsWithTemplates.sort((a, b) => {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        
        // Fetch image metadata for patterns with images
        const patternsWithMetadata: PatternWithMetadata[] = await Promise.all(
          patternsWithTemplates.map(async (pattern) => {
            if (!pattern.imageUrl) {
              return { ...pattern, imageMetadata: null };
            }
            
            try {
              const metadataResponse = await fetch(`/api/patterns/${pattern.id}/metadata`);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                console.log(`[Patterns] Metadata for ${pattern.id}:`, metadata);
                return { ...pattern, imageMetadata: metadata };
              } else {
                const errorText = await metadataResponse.text();
                console.error(`[Patterns] Metadata fetch failed for pattern ${pattern.id}:`, {
                  status: metadataResponse.status,
                  statusText: metadataResponse.statusText,
                  error: errorText
                });
              }
            } catch (error) {
              console.error(`[Patterns] Error fetching metadata for pattern ${pattern.id}:`, error);
            }
            
            return { ...pattern, imageMetadata: null };
          })
        );
        
        setPatterns(patternsWithMetadata);
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
          title="Patterns"
          description="Manage your embroidery patterns"
          action={
            <div className="flex flex-col items-end gap-3">
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
              {/* Compact Dropzone in Upper Right */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="w-64 bg-background-secondary border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-accent-primary transition"
              >
                <div className="text-2xl mb-2">📷</div>
                <p className="text-xs text-text-secondary mb-1">
                  Drag & drop or paste (⌘V)
                </p>
                <p className="text-xs text-text-muted">
                  Each image creates a pattern
                </p>
              </div>
            </div>
          }
        />

        {patterns.length === 0 ? (
          <div className="bg-background-secondary border border-border rounded-lg p-12 text-center">
            <p className="text-text-secondary mb-4">No patterns yet</p>
            <p className="text-sm text-text-muted">
              Upload images using the file picker or drag & drop above to create patterns
            </p>
          </div>
        ) : (
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-border bg-background-tertiary">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Image</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Category</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Difficulty</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Style</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Format</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Size</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Dimensions</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary whitespace-nowrap">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {patterns.map((pattern) => {
                    const updatedDate = new Date(pattern.updatedAt);
                    const formattedDate = updatedDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    
                    return (
                      <tr
                        key={pattern.id}
                        className="border-b border-border hover:bg-background-tertiary transition cursor-pointer"
                        onClick={() => router.push(`/patterns/${pattern.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-16 h-16 bg-background-tertiary border border-border rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                            {pattern.imageUrl ? (
                              <img
                                src={pattern.imageUrl}
                                alt={pattern.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-text-muted text-xs">
                                {pattern.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/patterns/${pattern.id}`}
                            className="font-medium text-text-primary hover:text-accent-primary transition block truncate max-w-xs"
                            onClick={(e) => e.stopPropagation()}
                            title={pattern.name}
                          >
                            {pattern.name}
                          </Link>
                          {pattern.notes && (
                            <div className="text-xs text-text-secondary mt-1 truncate max-w-xs" title={pattern.notes}>
                              {pattern.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-secondary truncate block max-w-xs" title={pattern.category || undefined}>
                            {pattern.category || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-secondary">
                            {pattern.difficulty ? pattern.difficulty.charAt(0).toUpperCase() + pattern.difficulty.slice(1) : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-secondary truncate block max-w-xs" title={pattern.style || undefined}>
                            {pattern.style || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-secondary">
                            {pattern.imageMetadata?.format || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-secondary">
                            {pattern.imageMetadata?.formattedSize || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-secondary">
                            {pattern.imageMetadata?.width && pattern.imageMetadata?.height
                              ? `${pattern.imageMetadata.width}×${pattern.imageMetadata.height}`
                              : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
