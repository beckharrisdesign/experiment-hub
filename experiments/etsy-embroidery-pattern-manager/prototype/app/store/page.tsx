'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandIdentity } from '@/types';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function StorePage() {
  const router = useRouter();
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

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
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Store</h1>
          <p className="text-text-secondary mt-2">
            Manage your store brand identity and settings
          </p>
        </header>

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
            {brandIdentity ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-text-secondary">Store Name:</span>
                  <span className="ml-2 text-text-primary font-medium">{brandIdentity.storeName}</span>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Brand Tone:</span>
                  <span className="ml-2 text-text-primary capitalize">{brandIdentity.brandTone}</span>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Visual Style:</span>
                  <span className="ml-2 text-text-primary capitalize">{brandIdentity.creativeDirection.visualStyle}</span>
                </div>
                {brandIdentity.creativeDirection.colorPalette && brandIdentity.creativeDirection.colorPalette.length > 0 && (
                  <div>
                    <span className="text-sm text-text-secondary">Color Palette:</span>
                    <div className="flex gap-2 mt-2">
                      {brandIdentity.creativeDirection.colorPalette.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded border border-border"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-text-secondary text-sm">
                Set up your brand identity to start generating listings and content.
              </p>
            )}
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

