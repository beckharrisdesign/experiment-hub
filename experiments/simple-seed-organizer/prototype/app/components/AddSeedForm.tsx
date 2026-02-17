'use client';

import { useState, useRef, useEffect } from 'react';
import { Seed, SeedType, SunRequirement } from '@/types/seed';
import { AIExtractedData } from '@/lib/packetReaderAI';
import { processImageFile } from '@/lib/imageUtils';
import { uploadSeedPhoto } from '@/lib/seed-photos';

interface AddSeedFormProps {
  onSubmit: (seed: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void | Promise<void>;
  onClose: () => void;
  initialData?: Seed;
  userId: string;
  userTier?: string;
}

const SEED_TYPES: { value: SeedType; label: string }[] = [
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'herb', label: 'Herb' },
  { value: 'flower', label: 'Flower' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'other', label: 'Other' },
];

const SUN_OPTIONS: { value: SunRequirement; label: string }[] = [
  { value: 'full-sun', label: 'Full sun' },
  { value: 'partial-shade', label: 'Partial shade' },
  { value: 'full-shade', label: 'Full shade' },
];

function normalizeSunRequirement(sunText?: string): 'full-sun' | 'partial-shade' | 'full-shade' | undefined {
  if (!sunText) return undefined;
  const lower = sunText.toLowerCase();
  if (lower.includes('full sun') || lower.includes('full-sun') || lower === 'sun') {
    return 'full-sun';
  }
  if (lower.includes('partial') || lower.includes('part shade') || lower.includes('part-shade')) {
    return 'partial-shade';
  }
  if (lower.includes('full shade') || lower.includes('full-shade') || lower === 'shade') {
    return 'full-shade';
  }
  return undefined;
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getKeyValuePairsBySource(data: AIExtractedData): { front: Array<{ key: string; value: string; source?: 'front' | 'back'; italic?: boolean }>; back: Array<{ key: string; value: string; source?: 'front' | 'back'; italic?: boolean }> } {
  const pairs: Array<{ key: string; value: string; source?: 'front' | 'back'; italic?: boolean }> = [];
  const seenKeys = new Set<string>();

  // Always include Name and Variety first (required fields) - even when empty, so user can edit
  pairs.push({ key: 'Name', value: data.name || '', source: data.fieldSources?.name, italic: false });
  seenKeys.add('name');
  pairs.push({ key: 'Variety', value: data.variety || data.latinName || '', source: data.fieldSources?.variety || data.fieldSources?.latinName, italic: false });
  seenKeys.add('variety');
  if (data.latinName && !seenKeys.has('latinName')) {
    pairs.push({ key: 'Latin Name', value: data.latinName, source: data.fieldSources?.latinName, italic: true });
    seenKeys.add('latinName');
  }
  if (data.brand) {
    pairs.push({ key: 'Brand', value: data.brand, source: data.fieldSources?.brand, italic: false });
    seenKeys.add('brand');
  }
  if (data.year) {
    pairs.push({ key: 'Year', value: String(data.year), source: data.fieldSources?.year, italic: false });
    seenKeys.add('year');
  }
  if (data.quantity) {
    pairs.push({ key: 'Quantity', value: data.quantity, source: data.fieldSources?.quantity, italic: false });
    seenKeys.add('quantity');
  }
  if (data.daysToGermination) {
    pairs.push({ key: 'Days to Germination', value: data.daysToGermination, source: data.fieldSources?.daysToGermination, italic: false });
    seenKeys.add('daysToGermination');
  }
  if (data.daysToMaturity) {
    pairs.push({ key: 'Days to Maturity', value: data.daysToMaturity, source: data.fieldSources?.daysToMaturity, italic: false });
    seenKeys.add('daysToMaturity');
  }
  if (data.plantingDepth) {
    pairs.push({ key: 'Planting Depth', value: data.plantingDepth, source: data.fieldSources?.plantingDepth, italic: false });
    seenKeys.add('plantingDepth');
  }
  if (data.spacing) {
    pairs.push({ key: 'Spacing', value: data.spacing, source: data.fieldSources?.spacing, italic: false });
    seenKeys.add('spacing');
  }
  if (data.sunRequirement) {
    pairs.push({ key: 'Sun Requirement', value: data.sunRequirement, source: data.fieldSources?.sunRequirement, italic: false });
    seenKeys.add('sunRequirement');
  }
  if (data.description) {
    pairs.push({ key: 'Description', value: data.description, source: data.fieldSources?.description, italic: false });
    seenKeys.add('description');
  }
  if (data.plantingInstructions) {
    pairs.push({ key: 'Planting Instructions', value: data.plantingInstructions, source: data.fieldSources?.plantingInstructions, italic: false });
    seenKeys.add('plantingInstructions');
  }

  // Add raw key-value pairs that aren't already in structured fields
  if (data.rawKeyValuePairs) {
    data.rawKeyValuePairs.forEach((pair) => {
      const normalizedKey = pair.key.toLowerCase().trim();
      const fieldLabels: Record<string, string> = {
        name: 'name',
        variety: 'variety',
        latinName: 'latin name',
        brand: 'brand',
        year: 'year',
        quantity: 'quantity',
        daysToGermination: 'days to germination',
        daysToMaturity: 'days to maturity',
        plantingDepth: 'planting depth',
        spacing: 'spacing',
        sunRequirement: 'sun requirement',
        description: 'description',
        plantingInstructions: 'planting instructions'
      };
      const isDuplicate = Array.from(seenKeys).some(seenKey => normalizedKey === fieldLabels[seenKey]?.toLowerCase());
      if (!isDuplicate) {
        pairs.push({ key: pair.key, value: pair.value, source: pair.source, italic: false });
      }
    });
  }

  return {
    front: pairs.filter(pair => !pair.source || pair.source === 'front'),
    back: pairs.filter(pair => pair.source === 'back')
  };
}

const EDIT_SECTIONS = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
] as const;

export function AddSeedForm({ onSubmit, onClose, initialData, userId, userTier = 'Seed Stash Starter' }: AddSeedFormProps) {
  const hasAutoEntry = userTier === 'Serious Hobby';
  const isEditMode = !!initialData;
  const [activeSection, setActiveSection] = useState<string>('front');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const [name, setName] = useState(initialData?.name || '');
  const [variety, setVariety] = useState(initialData?.variety || '');
  const [type, setType] = useState<SeedType>(initialData?.type || 'vegetable');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [source, setSource] = useState(initialData?.source || '');
  const [year, setYear] = useState(initialData?.year?.toString() || '');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate ? initialData.purchaseDate.split('T')[0] : ''
  );
  const [quantity, setQuantity] = useState(initialData?.quantity || '');
  const [daysToGermination, setDaysToGermination] = useState(initialData?.daysToGermination || '');
  const [daysToMaturity, setDaysToMaturity] = useState(initialData?.daysToMaturity || '');
  const [plantingDepth, setPlantingDepth] = useState(initialData?.plantingDepth || '');
  const [spacing, setSpacing] = useState(initialData?.spacing || '');
  const [sunRequirement, setSunRequirement] = useState<SunRequirement | undefined>(initialData?.sunRequirement);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [customExpirationDate, setCustomExpirationDate] = useState(
    initialData?.customExpirationDate ? initialData.customExpirationDate.split('T')[0] : ''
  );

  // Extraction state - separate loading per image for parallel extraction
  const [frontImage, setFrontImage] = useState<string | null>(initialData?.photoFront || null);
  const [backImage, setBackImage] = useState<string | null>(initialData?.photoBack || null);
  const [loadingFront, setLoadingFront] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);
  const [aiExtractedData, setAiExtractedData] = useState<AIExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const [hoverZoom, setHoverZoom] = useState<{ image: string; x: number; y: number; rect: { left: number; top: number; width: number; height: number } } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isEditMode) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    EDIT_SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isEditMode]);

  // Merge extracted data from one side into existing data
  const mergeExtractedData = (existing: AIExtractedData | null, incoming: AIExtractedData, side: 'front' | 'back'): AIExtractedData => {
    const merged: AIExtractedData = {
      ...(existing || {}),
      fieldSources: { ...(existing?.fieldSources || {}), ...(incoming.fieldSources || {}) },
      rawKeyValuePairs: [
        ...(existing?.rawKeyValuePairs || []).filter((p) => p.source !== side),
        ...(incoming.rawKeyValuePairs || []).filter((p) => p.source === side),
      ],
    };
    // Overlay fields from incoming that belong to this side. Prefer front for name/variety when both exist.
    const fields = ['name', 'variety', 'latinName', 'brand', 'year', 'quantity', 'daysToGermination', 'daysToMaturity', 'plantingDepth', 'spacing', 'sunRequirement', 'description', 'plantingInstructions'] as const;
    for (const f of fields) {
      const val = incoming[f];
      if (val == null || val === '') continue;
      if (incoming.fieldSources?.[f] !== side) continue;
      // Prefer front for name/variety when existing has them from front
      if ((f === 'name' || f === 'variety') && side === 'back' && existing?.fieldSources?.[f] === 'front') continue;
      (merged as any)[f] = val;
    }
    if (merged.rawKeyValuePairs?.length === 0) merged.rawKeyValuePairs = undefined;
    return merged;
  };

  const applyFormFieldsFromExtracted = (data: AIExtractedData) => {
    if (data.name) setName(data.name);
    if (data.variety) setVariety(data.variety);
    else if (data.latinName) setVariety(data.latinName);
    if (data.brand) setBrand(data.brand);
    if (data.year) setYear(String(data.year));
    if (data.quantity) setQuantity(data.quantity);
    if (data.daysToGermination) setDaysToGermination(data.daysToGermination);
    if (data.daysToMaturity) setDaysToMaturity(data.daysToMaturity);
    if (data.plantingDepth) setPlantingDepth(data.plantingDepth);
    if (data.spacing) setSpacing(data.spacing);
    if (data.sunRequirement) {
      const normalized = normalizeSunRequirement(data.sunRequirement);
      if (normalized) setSunRequirement(normalized);
    }
    if (data.description || data.plantingInstructions) {
      setNotes([data.description, data.plantingInstructions].filter(Boolean).join('\n\n'));
    }
  };

  const extractSingleImage = async (imageUrl: string, side: 'front' | 'back') => {
    if (side === 'front') setLoadingFront(true);
    else setLoadingBack(true);
    setError(null);

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch ${side} image: ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], `packet-${side}.png`, { type: blob.type || 'image/png' });

      const formData = new FormData();
      formData.append('image', file);
      formData.append('side', side);

      const res = await fetch('/api/packet/read-ai-single', { method: 'POST', body: formData });
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
      }
      if (!res.ok) throw new Error(result.error || result.message || 'Failed to extract');
      if (!result.data) throw new Error('No data returned from AI extraction');

      setAiExtractedData((prev) => {
        const merged = mergeExtractedData(prev, result.data, side);
        applyFormFieldsFromExtracted(merged);
        return merged;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
    } finally {
      if (side === 'front') setLoadingFront(false);
      else setLoadingBack(false);
    }
  };

  const handleFileSelect = async (side: 'front' | 'back', file: File) => {
    try {
      setError(null);
      const processedFile = await processImageFile(file, 1024, 0.8);
      const url = URL.createObjectURL(processedFile);

      if (side === 'front') {
        setFrontImage(url);
      } else {
        setBackImage(url);
      }
    } catch (err) {
      console.error('[AddSeedForm] Error processing image:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !variety.trim() || submitting) return;

    setSubmitting(true);
    try {
      const seedId = initialData?.id ?? crypto.randomUUID();
      const frontIsNew = !initialData?.photoFront || frontImage !== initialData.photoFront;
      const backIsNew = !initialData?.photoBack || backImage !== initialData.photoBack;

      let photoFrontPath: string | undefined;
      let photoBackPath: string | undefined;

      if (frontIsNew && frontImage) {
        const blob = await (await fetch(frontImage)).blob();
        photoFrontPath = await uploadSeedPhoto(userId, seedId, 'front', blob);
      } else if (initialData?.photoFrontPath) {
        photoFrontPath = initialData.photoFrontPath;
      }

      if (backIsNew && backImage) {
        const blob = await (await fetch(backImage)).blob();
        photoBackPath = await uploadSeedPhoto(userId, seedId, 'back', blob);
      } else if (initialData?.photoBackPath) {
        photoBackPath = initialData.photoBackPath;
      }

      const seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } = {
        ...(initialData ? {} : { id: seedId }),
        name: name.trim(),
        variety: variety.trim(),
        type,
        brand: brand.trim() || undefined,
        source: source.trim() || undefined,
        year: year ? parseInt(year) : undefined,
        purchaseDate: purchaseDate || undefined,
        quantity: quantity.trim() || undefined,
        daysToGermination: daysToGermination.trim() || undefined,
        daysToMaturity: daysToMaturity.trim() || undefined,
        plantingDepth: plantingDepth.trim() || undefined,
        spacing: spacing.trim() || undefined,
        sunRequirement,
        notes: notes.trim() || undefined,
        customExpirationDate: customExpirationDate || undefined,
        photoFrontPath,
        photoBackPath,
      };

      if (!photoFrontPath && !frontIsNew && initialData?.photoFront?.startsWith('data:')) {
        (seedData as any).photoFront = initialData.photoFront;
      }
      if (!photoBackPath && !backIsNew && initialData?.photoBack?.startsWith('data:')) {
        (seedData as any).photoBack = initialData.photoBack;
      }

      await onSubmit(seedData);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      console.error('[AddSeedForm] Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to update form state from extracted data key
  const updateFieldFromKey = (key: string, value: string) => {
    const keyMap: Record<string, (val: string) => void> = {
      'Name': setName,
      'Variety': setVariety,
      'Latin Name': setVariety,
      'Brand': setBrand,
      'Year': setYear,
      'Quantity': setQuantity,
      'Days to Germination': setDaysToGermination,
      'Days to Maturity': setDaysToMaturity,
      'Planting Depth': setPlantingDepth,
      'Spacing': setSpacing,
      'Sun Requirement': (val: string) => {
        const normalized = normalizeSunRequirement(val);
        if (normalized) setSunRequirement(normalized);
        else setSunRequirement(val as any); // Allow verbatim text
      },
      'Description': (val: string) => {
        // Append to notes if planting instructions also exists
        const currentNotes = notes;
        if (aiExtractedData?.plantingInstructions) {
          setNotes(val + '\n\n' + aiExtractedData.plantingInstructions);
        } else {
          setNotes(val);
        }
      },
      'Planting Instructions': (val: string) => {
        // Append to notes if description also exists
        const currentNotes = notes;
        if (aiExtractedData?.description) {
          setNotes(aiExtractedData.description + '\n\n' + val);
        } else {
          setNotes(val);
        }
      },
    };
    const setter = keyMap[key];
    if (setter) {
      setter(value);
    }
  };

  return (
    <div
      className={`fixed z-50 flex flex-col bg-white ${
        isEditMode ? 'top-20 left-0 right-0 bottom-0' : 'inset-0'
      }`}
    >
      {/* Header - only for add mode; edit mode uses app header + left nav */}
      {!isEditMode && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#101828]">Add Seed</h1>
          <button onClick={onClose} className="p-2 -mr-2">
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading status when extracting */}
      {(loadingFront || loadingBack) && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-4">
          {loadingFront && (
            <span className="text-sm text-[#6a7282] flex items-center gap-2">
              <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#16a34a]" />
              Extracting front...
            </span>
          )}
          {loadingBack && (
            <span className="text-sm text-[#6a7282] flex items-center gap-2">
              <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#16a34a]" />
              Extracting back...
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-start justify-between gap-2">
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 shrink-0 p-1"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className={`flex-1 flex min-h-0 ${isEditMode ? 'bg-[#f9fafb]' : ''}`}>
          {isEditMode && (
            <>
            <nav className="hidden lg:flex flex-col w-48 shrink-0 pt-4 pl-6 pr-4 bg-[#f9fafb] border-r border-gray-200">
              {EDIT_SECTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === id ? 'bg-[#16a34a] text-white' : 'text-[#4a5565] hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#4a5565] hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </nav>
            {/* Mobile nav - edit mode */}
            <div className="lg:hidden fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2 overflow-x-auto z-20">
              {EDIT_SECTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium ${
                    activeSection === id ? 'bg-[#16a34a] text-white' : 'bg-gray-100 text-[#4a5565]'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium text-[#4a5565] bg-gray-100 ml-auto"
              >
                Cancel
              </button>
            </div>
            </>
          )}
          <div className={`flex-1 overflow-y-auto min-w-0 ${isEditMode ? 'px-4 lg:pl-8 py-6 pb-32 lg:pb-24' : 'p-4 pb-24'}`}>
            <div className={isEditMode ? 'max-w-4xl' : 'space-y-6 mb-6'}>
              {/* Front Image and Data */}
              <section
                id="front"
                ref={(el) => { sectionRefs.current.front = el; }}
                className={isEditMode ? 'scroll-mt-24 mb-8' : 'mb-6'}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            {/* Front Image */}
            <div className="pr-2">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#4a5565] mb-3">Front Image</h3>
                {frontImage ? (
                  <div 
                    className="relative group"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverZoom({ 
                        image: frontImage, 
                        x: e.clientX, 
                        y: e.clientY, 
                        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                      });
                    }}
                    onMouseLeave={() => setHoverZoom(null)}
                  >
                    {loadingFront && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded border border-gray-200">
                        <div className="flex flex-col items-center gap-2">
                          <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#16a34a] border-t-transparent" />
                          <span className="text-sm font-medium text-[#4a5565]">Extracting...</span>
                        </div>
                      </div>
                    )}
                    <img
                      src={frontImage}
                      alt="Front of packet"
                      className="w-full rounded border border-gray-200"
                      style={{ 
                        filter: 'brightness(1.1) contrast(1.1)',
                        maxHeight: '400px',
                        objectFit: 'contain'
                      }}
                    />
                    {hasAutoEntry && !loadingFront && (
                      <button
                        type="button"
                        onClick={() => extractSingleImage(frontImage, 'front')}
                        className="absolute top-2 right-2 z-10 px-2 py-1 text-xs font-medium bg-white/90 text-gray-600 rounded shadow hover:bg-white transition-colors"
                      >
                        Auto Entry
                      </button>
                    )}
                    {hoverZoom && hoverZoom.image === frontImage && (
                      <div 
                        className="fixed pointer-events-none z-50 border-2 border-blue-400 bg-white shadow-2xl rounded overflow-hidden"
                        style={{
                          width: '300px',
                          height: '300px',
                          left: `${hoverZoom.x + 20}px`,
                          top: `${hoverZoom.y - 150}px`,
                          backgroundImage: `url(${frontImage})`,
                          backgroundSize: '200%',
                          backgroundPosition: `${((hoverZoom.x - hoverZoom.rect.left) / hoverZoom.rect.width) * 100}% ${((hoverZoom.y - hoverZoom.rect.top) / hoverZoom.rect.height) * 100}%`,
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      ref={frontFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect('front', file);
                      }}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => frontFileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                    >
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Front Data - Editable */}
            <div className="pr-2">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-[#4a5565] mb-3">Front Image Data</h2>
                {aiExtractedData ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-200">
                        {getKeyValuePairsBySource(aiExtractedData).front.map((pair, index) => {
                          const isLongText = pair.key === 'Planting Instructions' || pair.key === 'Description';
                          const isScientificName = pair.key === 'Latin Name';
                          const sourceColor = 'bg-blue-100 text-blue-700';
                          const sourceLabel = 'F';
                          
                          // Get current value from form state
                          const getCurrentValue = () => {
                            const keyMap: Record<string, string> = {
                              'Name': name,
                              'Variety': variety,
                              'Latin Name': variety,
                              'Brand': brand,
                              'Year': year,
                              'Quantity': quantity,
                              'Days to Germination': daysToGermination,
                              'Days to Maturity': daysToMaturity,
                              'Planting Depth': plantingDepth,
                              'Spacing': spacing,
                              'Sun Requirement': sunRequirement || '',
                              'Description': notes.split('\n\n')[0] || '',
                              'Planting Instructions': notes.split('\n\n')[1] || notes,
                            };
                            return keyMap[pair.key] || pair.value;
                          };
                          
                          const isRequired = pair.key === 'Name' || pair.key === 'Variety';
                          const isEmpty = isRequired && !getCurrentValue().trim();
                          return (
                            <tr key={index}>
                              <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">
                                {pair.key}
                                {isRequired && <span className="text-red-500 ml-0.5">*</span>}
                              </td>
                              <td className="py-1.5 text-[#101828]">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 shrink-0 ${sourceColor}`}>
                                    {sourceLabel}
                                  </span>
                                  {isLongText ? (
                                    <textarea
                                      value={getCurrentValue()}
                                      onChange={(e) => updateFieldFromKey(pair.key, e.target.value)}
                                      className={`flex-1 min-w-0 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a] resize-none ${isEmpty ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                      rows={3}
                                      placeholder={pair.value || (isRequired ? 'Required' : undefined)}
                                    />
                                  ) : (
                                    <input
                                      type={pair.key === 'Year' ? 'number' : 'text'}
                                      value={getCurrentValue()}
                                      onChange={(e) => updateFieldFromKey(pair.key, e.target.value)}
                                      className={`flex-1 min-w-0 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a] ${pair.italic ? 'italic' : ''} ${isEmpty ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                      placeholder={pair.value || (isRequired ? 'Required' : undefined)}
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Name *</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="e.g., Beefsteak"
                              required
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Variety *</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={variety}
                              onChange={(e) => setVariety(e.target.value)}
                              placeholder="e.g., Tomato"
                              required
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Brand</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={brand}
                              onChange={(e) => setBrand(e.target.value)}
                              placeholder="e.g., Burpee"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Year</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="number"
                              value={year}
                              onChange={(e) => setYear(e.target.value)}
                              placeholder="e.g., 2024"
                              min="1900"
                              max="2100"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Quantity</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value)}
                              placeholder="e.g., 25 seeds"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Days to Germination</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={daysToGermination}
                              onChange={(e) => setDaysToGermination(e.target.value)}
                              placeholder="e.g., 7-14 days"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Days to Maturity</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={daysToMaturity}
                              onChange={(e) => setDaysToMaturity(e.target.value)}
                              placeholder="e.g., 75-85 days"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Planting Depth</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={plantingDepth}
                              onChange={(e) => setPlantingDepth(e.target.value)}
                              placeholder="e.g., 1/4 inch"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Spacing</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={spacing}
                              onChange={(e) => setSpacing(e.target.value)}
                              placeholder="e.g., 12 inches"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Sun Requirement</td>
                          <td className="py-1.5 text-[#101828]">
                            <input
                              type="text"
                              value={sunRequirement || ''}
                              onChange={(e) => setSunRequirement(e.target.value as SunRequirement || undefined)}
                              placeholder="e.g., Full sun"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">Notes</td>
                          <td className="py-1.5 text-[#101828]">
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Any additional notes..."
                              rows={3}
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a] resize-none"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
              </section>

              {/* Back Image and Data */}
              <section
                id="back"
                ref={(el) => { sectionRefs.current.back = el; }}
                className={isEditMode ? 'scroll-mt-24' : ''}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            {/* Back Image */}
            <div className="pr-2">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#4a5565] mb-3">Back Image</h3>
                {backImage ? (
                  <div 
                    className="relative group"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverZoom({ 
                        image: backImage, 
                        x: e.clientX, 
                        y: e.clientY, 
                        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                      });
                    }}
                    onMouseLeave={() => setHoverZoom(null)}
                  >
                    {loadingBack && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded border border-gray-200">
                        <div className="flex flex-col items-center gap-2">
                          <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#16a34a] border-t-transparent" />
                          <span className="text-sm font-medium text-[#4a5565]">Extracting...</span>
                        </div>
                      </div>
                    )}
                    <img
                      src={backImage}
                      alt="Back of packet"
                      className="w-full rounded border border-gray-200"
                      style={{ 
                        filter: 'brightness(1.1) contrast(1.1)',
                        maxHeight: '400px',
                        objectFit: 'contain'
                      }}
                    />
                    {hasAutoEntry && !loadingBack && (
                      <button
                        type="button"
                        onClick={() => extractSingleImage(backImage, 'back')}
                        className="absolute top-2 right-2 z-10 px-2 py-1 text-xs font-medium bg-white/90 text-gray-600 rounded shadow hover:bg-white transition-colors"
                      >
                        Auto Entry
                      </button>
                    )}
                    {hoverZoom && hoverZoom.image === backImage && (
                      <div 
                        className="fixed pointer-events-none z-50 border-2 border-green-400 bg-white shadow-2xl rounded overflow-hidden"
                        style={{
                          width: '300px',
                          height: '300px',
                          left: `${hoverZoom.x + 20}px`,
                          top: `${hoverZoom.y - 150}px`,
                          backgroundImage: `url(${backImage})`,
                          backgroundSize: '200%',
                          backgroundPosition: `${((hoverZoom.x - hoverZoom.rect.left) / hoverZoom.rect.width) * 100}% ${((hoverZoom.y - hoverZoom.rect.top) / hoverZoom.rect.height) * 100}%`,
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      ref={backFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect('back', file);
                      }}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => backFileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                    >
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Back Data - Editable */}
            <div className="pr-2">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-[#4a5565] mb-3">Back Image Data</h2>
                {aiExtractedData && getKeyValuePairsBySource(aiExtractedData).back.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-200">
                        {getKeyValuePairsBySource(aiExtractedData).back.map((pair, index) => {
                          const isLongText = pair.key === 'Planting Instructions' || pair.key === 'Description';
                          const isScientificName = pair.key === 'Latin Name';
                          const sourceColor = 'bg-green-100 text-green-700';
                          const sourceLabel = 'B';
                          
                          // Get current value from form state
                          const getCurrentValue = () => {
                            const keyMap: Record<string, string> = {
                              'Name': name,
                              'Variety': variety,
                              'Latin Name': variety,
                              'Brand': brand,
                              'Year': year,
                              'Quantity': quantity,
                              'Days to Germination': daysToGermination,
                              'Days to Maturity': daysToMaturity,
                              'Planting Depth': plantingDepth,
                              'Spacing': spacing,
                              'Sun Requirement': sunRequirement || '',
                              'Description': notes.split('\n\n')[0] || '',
                              'Planting Instructions': notes.split('\n\n')[1] || notes,
                            };
                            return keyMap[pair.key] || pair.value;
                          };
                          
                          const isRequired = pair.key === 'Name' || pair.key === 'Variety';
                          const isEmpty = isRequired && !getCurrentValue().trim();
                          return (
                            <tr key={index}>
                              <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top w-1/3">
                                {pair.key}
                                {isRequired && <span className="text-red-500 ml-0.5">*</span>}
                              </td>
                              <td className="py-1.5 text-[#101828]">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 shrink-0 ${sourceColor}`}>
                                    {sourceLabel}
                                  </span>
                                  {isLongText ? (
                                    <textarea
                                      value={getCurrentValue()}
                                      onChange={(e) => updateFieldFromKey(pair.key, e.target.value)}
                                      className={`flex-1 min-w-0 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a] resize-none ${isEmpty ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                      rows={3}
                                      placeholder={pair.value || (isRequired ? 'Required' : undefined)}
                                    />
                                  ) : (
                                    <input
                                      type={pair.key === 'Year' ? 'number' : 'text'}
                                      value={getCurrentValue()}
                                      onChange={(e) => updateFieldFromKey(pair.key, e.target.value)}
                                      className={`flex-1 min-w-0 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-[#16a34a] ${pair.italic ? 'italic' : ''} ${isEmpty ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                      placeholder={pair.value || (isRequired ? 'Required' : undefined)}
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Upload back image to extract data</p>
                )}
              </div>
            </div>
          </div>
              </section>
            </div>
          </div>
        </div>
      </form>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        {(!name.trim() || !variety.trim()) && !submitting && (
          <p className="text-sm text-amber-600 mb-2">
            {!name.trim() && !variety.trim()
              ? 'Name and Variety are required'
              : !name.trim()
                ? 'Name is required'
                : 'Variety is required'}
          </p>
        )}
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!name.trim() || !variety.trim() || submitting}
          className="w-full py-3 bg-[#00a63e] text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              {initialData ? 'Saving...' : 'Adding...'}
            </>
          ) : (
            initialData ? 'Save Changes' : 'Add to Collection'
          )}
        </button>
      </div>
    </div>
  );
}
