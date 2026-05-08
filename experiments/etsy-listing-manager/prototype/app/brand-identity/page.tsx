'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrandIdentity } from '@/types';
import PageHeader from '@/components/shared/PageHeader';

/** Built-in samples (served from /public/brand) */
const SAMPLE_LOGO_NEON = '/brand/stub-shop-logo.svg';
const SAMPLE_LOGO_BLOOM = '/brand/placeholder-bloom.svg';

function buildShopIntroBoilerplate(formData: Partial<BrandIdentity>): string {
  const name = formData.storeName?.trim() || 'My Shop';
  const tone = formData.brandTone || 'friendly';
  const style = formData.creativeDirection?.visualStyle || 'modern';
  const palette = formData.creativeDirection?.colorPalette?.filter(Boolean) || [];
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

export default function BrandIdentityPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<BrandIdentity>>({
    storeName: '',
    logoUrl: '',
    brandTone: undefined,
    creativeDirection: {
      visualStyle: undefined as any,
      colorPalette: [],
      typography: undefined,
    },
  });
  const [loading, setLoading] = useState(false);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [existingData, setExistingData] = useState<BrandIdentity | null>(null);
  const boilerplateIntro = buildShopIntroBoilerplate(formData);

  // Load existing brand identity on mount
  useEffect(() => {
    const loadBrandIdentity = async () => {
      try {
        const response = await fetch('/api/brand-identity');
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setExistingData(data);
            setFormData({
              storeName: data.storeName || '',
              logoUrl: data.logoUrl || '',
              brandTone: data.brandTone,
              creativeDirection: {
                visualStyle: data.creativeDirection?.visualStyle,
                colorPalette: data.creativeDirection?.colorPalette || [],
                typography: data.creativeDirection?.typography,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error loading brand identity:', error);
      }
    };
    loadBrandIdentity();
  }, []);

  const brandTones = [
    { value: 'friendly', label: 'Friendly', description: 'Warm, approachable, conversational' },
    { value: 'professional', label: 'Professional', description: 'Polished, trustworthy, business-like' },
    { value: 'whimsical', label: 'Whimsical', description: 'Playful, creative, lighthearted' },
    { value: 'minimalist', label: 'Minimalist', description: 'Clean, simple, focused' },
    { value: 'vintage', label: 'Vintage', description: 'Classic, nostalgic, timeless' },
    { value: 'modern', label: 'Modern', description: 'Contemporary, sleek, current' },
  ];

  const visualStyles = [
    { value: 'modern', label: 'Modern', description: 'Clean lines, contemporary design' },
    { value: 'vintage', label: 'Vintage', description: 'Classic, nostalgic aesthetic' },
    { value: 'botanical', label: 'Botanical', description: 'Nature-inspired, organic' },
    { value: 'geometric', label: 'Geometric', description: 'Structured, pattern-based' },
    { value: 'minimalist', label: 'Minimalist', description: 'Simple, uncluttered' },
    { value: 'rustic', label: 'Rustic', description: 'Handcrafted, earthy' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/brand-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          logoUrl: formData.logoUrl?.trim() || null,
        }),
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        // Toast will be handled by parent or we can add it here
        console.error('Failed to save brand identity');
      }
    } catch (error) {
      console.error('Error saving brand identity:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStoreName = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/brand-identity/suggest-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualStyle: formData.creativeDirection?.visualStyle,
          brandTone: formData.brandTone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedNames(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error generating names:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <PageHeader>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Brand Identity Setup</h1>
              <p className="text-text-secondary">Define your store brand to keep content consistent</p>
            </div>
            {!existingData && (
              <button
                type="button"
                onClick={async () => {
                  const testData: Partial<BrandIdentity> = {
                    storeName: 'Test Embroidery Shop',
                    logoUrl: SAMPLE_LOGO_BLOOM,
                    brandTone: 'friendly' as BrandIdentity['brandTone'],
                    creativeDirection: {
                      visualStyle: 'botanical' as BrandIdentity['creativeDirection']['visualStyle'],
                      colorPalette: ['sage green', 'cream', 'dusty rose'],
                      typography: 'Modern serif',
                    },
                  };
                  setFormData(testData);
                  setLoading(true);
                  
                  try {
                    const response = await fetch('/api/brand-identity', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(testData),
                    });

                    if (response.ok) {
                      router.push('/');
                      router.refresh();
                    } else {
                      console.error('Failed to save brand identity');
                    }
                  } catch (error) {
                    console.error('Error saving brand identity:', error);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Setting up...' : 'Quick Setup (Test)'}
              </button>
            )}
          </div>
          {existingData && (
            <div className="mt-4 p-4 bg-background-secondary border border-border rounded-lg space-y-3">
              <div className="flex items-center gap-4">
                {existingData.logoUrl && (
                  <img
                    src={existingData.logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg border border-border object-cover flex-shrink-0"
                  />
                )}
                <p className="text-sm text-text-secondary">
                  <strong>Current:</strong> {existingData.storeName} • {existingData.brandTone} • {existingData.creativeDirection?.visualStyle}
                  {existingData.logoUrl && (
                    <span className="block mt-1 text-xs font-mono text-text-muted truncate max-w-md">
                      {existingData.logoUrl}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Shop intro boilerplate</p>
                <p className="text-sm text-text-secondary">{boilerplateIntro}</p>
              </div>
            </div>
          )}
        </PageHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Store Name */}
          {step === 1 && (
            <div className="bg-background-secondary border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Store Name</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Store Name</label>
                  <input
                    type="text"
                    value={formData.storeName || ''}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    placeholder="Enter your store name"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={generateStoreName}
                  disabled={loading}
                  className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
                >
                  {loading ? 'Generating...' : 'Suggest Names'}
                </button>
                {suggestedNames.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-text-secondary mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedNames.map((name, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, storeName: name })}
                          className="px-3 py-1 bg-background-tertiary border border-border rounded hover:border-accent-primary transition text-sm"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold mb-2">Shop logo</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Use a public image URL, or a path under <code className="text-xs text-text-primary">/public</code> (e.g.{' '}
                    <code className="text-xs">{SAMPLE_LOGO_NEON}</code>).
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-background-tertiary flex items-center justify-center overflow-hidden flex-shrink-0"
                      aria-hidden
                    >
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs text-text-muted text-center px-1">No preview</span>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-3 min-w-0">
                      <label className="block text-sm font-medium">Logo URL</label>
                      <input
                        type="text"
                        inputMode="url"
                        value={formData.logoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary font-mono text-sm"
                        placeholder={`${SAMPLE_LOGO_NEON}`}
                        autoComplete="off"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: SAMPLE_LOGO_NEON })}
                          className="px-3 py-1.5 text-xs bg-background-tertiary border border-border rounded hover:border-accent-primary transition"
                        >
                          Use Neon Purl mark
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: SAMPLE_LOGO_BLOOM })}
                          className="px-3 py-1.5 text-xs bg-background-tertiary border border-border rounded hover:border-accent-primary transition"
                        >
                          Use Bloom sample
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: '' })}
                          className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded hover:bg-background-tertiary transition"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold mb-2">Shop intro boilerplate</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Drafted from your current profile settings. Edit as needed so it sounds like you.
                  </p>
                  <textarea
                    value={boilerplateIntro}
                    readOnly
                    rows={5}
                    className="w-full px-4 py-3 bg-background-tertiary border border-border rounded text-text-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Brand Tone */}
          {step === 2 && (
            <div className="bg-background-secondary border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Brand Tone</h2>
              <p className="text-text-secondary mb-6">Select the writing style for your store</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brandTones.map((tone) => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, brandTone: tone.value as any })}
                    className={`p-4 border rounded-lg text-left transition ${
                      formData.brandTone === tone.value
                        ? 'border-accent-primary bg-background-tertiary'
                        : 'border-border hover:border-accent-primary/50'
                    }`}
                  >
                    <h3 className="font-semibold mb-1">{tone.label}</h3>
                    <p className="text-sm text-text-secondary">{tone.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Creative Direction */}
          {step === 3 && (
            <div className="bg-background-secondary border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Creative Direction</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-4">Visual Style</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visualStyles.map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            creativeDirection: {
                              ...formData.creativeDirection!,
                              visualStyle: style.value as any,
                            },
                          })
                        }
                        className={`p-4 border rounded-lg text-left transition ${
                          formData.creativeDirection?.visualStyle === style.value
                            ? 'border-accent-primary bg-background-tertiary'
                            : 'border-border hover:border-accent-primary/50'
                        }`}
                      >
                        <h3 className="font-semibold mb-1">{style.label}</h3>
                        <p className="text-sm text-text-secondary">{style.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color Palette (comma-separated hex codes)</label>
                  <input
                    type="text"
                    value={formData.creativeDirection?.colorPalette?.join(', ') || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        creativeDirection: {
                          ...formData.creativeDirection!,
                          colorPalette: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
                        },
                      })
                    }
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                    placeholder="#3b82f6, #10b981, #f59e0b"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-4 py-2 bg-background-secondary border border-border rounded hover:bg-background-tertiary transition disabled:opacity-50"
            >
              Previous
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !formData.storeName || !formData.brandTone || !formData.creativeDirection?.visualStyle}
                className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Brand Identity'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

