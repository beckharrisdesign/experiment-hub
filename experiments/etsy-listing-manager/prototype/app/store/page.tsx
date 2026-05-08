'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandIdentity } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';
import PageHeader from '@/components/shared/PageHeader';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

function buildShopIntroBoilerplate(brandIdentity: BrandIdentity | null): string {
  if (!brandIdentity) {
    return 'Set up Brand Identity to generate your shop intro boilerplate.';
  }

  const name = brandIdentity.storeName?.trim() || 'My Shop';
  const tone = brandIdentity.brandTone || 'friendly';
  const style = brandIdentity.creativeDirection?.visualStyle || 'modern';
  const palette = brandIdentity.creativeDirection?.colorPalette?.filter(Boolean) || [];
  const paletteText = palette.length > 0 ? palette.slice(0, 3).join(', ') : 'bold color';

  if (tone === 'professional') {
    return `${name} creates ${style} embroidery patterns with clear instructions and polished digital files. Each listing is designed to be practical, easy to follow, and enjoyable to stitch. Expect clean layouts, thoughtful details, and reliable instant-download access.`;
  }
  if (tone === 'minimalist') {
    return `${name} is a ${style} embroidery shop focused on clean patterns, clear instructions, and instant digital downloads. No fluff, no guesswork, just approachable designs you can start stitching right away.`;
  }
  if (tone === 'whimsical') {
    return `Welcome to ${name} — bright, ${style} embroidery patterns with a playful streak. I design digital downloads that are easy to follow and fun to make, with color-forward details (${paletteText}) and clear, no-drama instructions.`;
  }
  return `Welcome to ${name}. This shop makes ${style} embroidery patterns with clear instructions, practical file formats, and instant digital delivery. Every listing is built to be approachable for real makers, whether you're stitching for fun, gifts, or your own little creative reset.`;
}

export default function StorePage() {
  const router = useRouter();
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });
  const boilerplateIntro = buildShopIntroBoilerplate(brandIdentity);

  useEffect(() => {
    fetchBrandIdentity();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  const fetchBrandIdentity = async () => {
    try {
      const response = await fetch('/api/brand-identity');
      if (response.ok) {
        const data = await response.json();
        setBrandIdentity(data);
      }
    } catch (error) {
      console.error('Error fetching brand identity:', error);
    } finally {
      setLoading(false);
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
        <PageHeader
          title="Store"
          description="Manage your store brand identity and settings"
        />

        <div className="space-y-6">
          {/* Brand Identity Card */}
          <div className="bg-background-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Brand Identity</h2>
              <Link
                href="/brand-identity"
                className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
              >
                {brandIdentity ? 'Edit' : 'Setup'}
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {brandIdentity?.storeName ? (
                    <>
                      <span className="text-green-500">✓</span>
                      <span className="text-sm text-text-secondary">Store Name:</span>
                      <span className="ml-2 text-text-primary font-medium">{brandIdentity.storeName}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-text-muted">○</span>
                      <span className="text-sm text-text-secondary">Store Name:</span>
                      <span className="ml-2 text-text-muted italic">Not set</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {brandIdentity?.brandTone ? (
                    <>
                      <span className="text-green-500">✓</span>
                      <span className="text-sm text-text-secondary">Brand Tone:</span>
                      <span className="ml-2 text-text-primary capitalize">{brandIdentity.brandTone}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-text-muted">○</span>
                      <span className="text-sm text-text-secondary">Brand Tone:</span>
                      <span className="ml-2 text-text-muted italic">Not set</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {brandIdentity?.creativeDirection?.visualStyle ? (
                    <>
                      <span className="text-green-500">✓</span>
                      <span className="text-sm text-text-secondary">Visual Style:</span>
                      <span className="ml-2 text-text-primary capitalize">{brandIdentity.creativeDirection.visualStyle}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-text-muted">○</span>
                      <span className="text-sm text-text-secondary">Visual Style:</span>
                      <span className="ml-2 text-text-muted italic">Not set</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {brandIdentity?.creativeDirection?.colorPalette && brandIdentity.creativeDirection.colorPalette.length > 0 ? (
                    <>
                      <span className="text-green-500">✓</span>
                      <span className="text-sm text-text-secondary">Color Palette:</span>
                      <div className="flex gap-2 ml-2">
                        {brandIdentity.creativeDirection.colorPalette.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded border border-border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-text-muted">○</span>
                      <span className="text-sm text-text-secondary">Color Palette:</span>
                      <span className="ml-2 text-text-muted italic">Not set</span>
                    </>
                  )}
                </div>
              </div>
              
              {brandIdentity?.creativeDirection?.typography && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm text-text-secondary">Typography:</span>
                    <span className="ml-2 text-text-primary">{brandIdentity.creativeDirection.typography}</span>
                  </div>
                </div>
              )}

              <div className="pt-4 mt-2 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-primary">Shop intro boilerplate</h3>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(boilerplateIntro);
                        showToast('Shop intro copied', 'success');
                      } catch {
                        showToast('Could not copy text', 'error');
                      }
                    }}
                    className="px-3 py-1 text-xs bg-background-tertiary border border-border rounded hover:border-accent-primary transition"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-text-muted mb-2">
                  Shop-level profile text based on your current brand settings.
                </p>
                <textarea
                  value={boilerplateIntro}
                  readOnly
                  rows={4}
                  className="w-full px-3 py-2 bg-background-tertiary border border-border rounded text-sm text-text-secondary"
                />
              </div>
            </div>
          </div>

          {/* Coming Soon Sections */}
          <div className="bg-background-secondary border border-border rounded-lg p-6 opacity-50">
            <h2 className="text-xl font-semibold mb-2">Store Settings</h2>
            <p className="text-text-secondary text-sm">Coming soon</p>
          </div>

          <div className="bg-background-secondary border border-border rounded-lg p-6 opacity-50">
            <h2 className="text-xl font-semibold mb-2">Analytics</h2>
            <p className="text-text-secondary text-sm">Coming soon</p>
          </div>
        </div>
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

