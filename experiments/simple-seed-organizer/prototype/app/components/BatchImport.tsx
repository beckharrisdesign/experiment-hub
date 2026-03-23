'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Seed } from '@/types/seed';
import { AIExtractedData } from '@/lib/packetReaderAI';
import { saveSeed } from '@/lib/storage';
import { uploadSeedPhoto } from '@/lib/seed-photos';
import { processImageFile } from '@/lib/imageUtils';
import { AddSeedForm } from '@/components/AddSeedForm';
import toast from 'react-hot-toast';

type QueueStatus = 'pending' | 'extracting' | 'ready' | 'saving' | 'saved' | 'error';

interface QueueItem {
  id: string;
  file: File;
  objectUrl: string;
  status: QueueStatus;
  extracted?: AIExtractedData;
  savedSeed?: Seed;
  errorMessage?: string;
}

interface BatchImportProps {
  userId: string;
  userTier?: string;
  canUseAI?: boolean;
}

function normalizeSunRequirement(text?: string): 'full-sun' | 'partial-shade' | 'full-shade' | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower.includes('full sun') || lower.includes('full-sun')) return 'full-sun';
  if (lower.includes('partial') || lower.includes('part shade')) return 'partial-shade';
  if (lower.includes('full shade') || lower.includes('full-shade')) return 'full-shade';
  return undefined;
}

function extractedToInitialSeed(extracted: AIExtractedData, objectUrl: string): Seed {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: extracted.name || '',
    variety: extracted.variety || extracted.latinName || '',
    type: 'other',
    brand: extracted.brand,
    year: extracted.year,
    quantity: extracted.quantity,
    daysToGermination: extracted.daysToGermination,
    daysToMaturity: extracted.daysToMaturity,
    plantingDepth: extracted.plantingDepth,
    spacing: extracted.spacing,
    sunRequirement: normalizeSunRequirement(extracted.sunRequirement),
    notes: [extracted.description, extracted.plantingInstructions].filter(Boolean).join('\n\n') || undefined,
    photoFront: objectUrl,
  };
}

const CONCURRENCY = 3;

export function BatchImport({ userId, userTier = 'Seed Stash Starter', canUseAI = true }: BatchImportProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pileLoading, setPileLoading] = useState(false);
  const activeRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pileInputRef = useRef<HTMLInputElement>(null);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }, []);

  const extractItem = useCallback(async (item: QueueItem) => {
    activeRef.current++;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'extracting' } : i));
    try {
      const processed = await processImageFile(item.file);
      const formData = new FormData();
      formData.append('image', processed);
      formData.append('side', 'front');
      const res = await fetch('/api/packet/read-ai-single', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? {
          ...i,
          status: 'error',
          errorMessage: res.status === 402
            ? 'AI limit reached. Upgrade to continue.'
            : (json.message || 'Extraction failed'),
        } : i));
      } else {
        setItems(prev => prev.map(i => i.id === item.id ? {
          ...i, status: 'ready', extracted: json.data,
        } : i));
      }
    } catch (e) {
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i, status: 'error',
        errorMessage: e instanceof Error ? e.message : 'Network error',
      } : i));
    } finally {
      activeRef.current--;
      setItems(prev => [...prev]); // nudge effect to check for more pending
    }
  }, []);

  // Concurrency manager: auto-start up to CONCURRENCY extractions at once
  useEffect(() => {
    const pending = items.filter(i => i.status === 'pending');
    const toStart = Math.min(CONCURRENCY - activeRef.current, pending.length);
    if (toStart > 0) {
      pending.slice(0, toStart).forEach(extractItem);
    }
  }, [items, extractItem]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: QueueItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: crypto.randomUUID(),
        file: f,
        objectUrl: URL.createObjectURL(f),
        status: 'pending' as const,
      }));
    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems]);
    }
  }, []);

  const handlePilePhoto = useCallback(async (file: File) => {
    setPileLoading(true);
    try {
      const processed = await processImageFile(file);
      const formData = new FormData();
      formData.append('image', processed);
      const res = await fetch('/api/packet/read-ai-pile', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message || "I'm having trouble reading that photo. Try again or use a clearer shot.");
        return;
      }
      const seeds: AIExtractedData[] = json.seeds ?? [];
      if (seeds.length === 0) {
        toast.error("I couldn't spot any packets in that photo. Try a closer shot with good lighting.");
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      const newItems: QueueItem[] = seeds.map(extracted => ({
        id: crypto.randomUUID(),
        file,
        objectUrl,
        status: 'ready' as const,
        extracted,
      }));
      setItems(prev => [...prev, ...newItems]);
    } catch (e) {
      toast.error("I'm having trouble reading that photo. Try again or use a clearer shot.");
    } finally {
      setPileLoading(false);
    }
  }, []);

  const handleConfirm = useCallback(async (item: QueueItem) => {
    if (!item.extracted) return;
    updateItem(item.id, { status: 'saving' });
    try {
      const seedId = crypto.randomUUID();
      const processed = await processImageFile(item.file);
      const photoFrontPath = await uploadSeedPhoto(userId, seedId, 'front', processed);

      const name = item.extracted.name?.trim() || 'Unknown';
      const variety = (
        item.extracted.variety ||
        item.extracted.latinName ||
        item.extracted.name ||
        'Unknown'
      ).trim();

      const saved = await saveSeed({
        id: seedId,
        name,
        variety,
        type: 'other',
        brand: item.extracted.brand,
        year: item.extracted.year,
        quantity: item.extracted.quantity,
        notes: [item.extracted.description, item.extracted.plantingInstructions]
          .filter(Boolean).join('\n\n') || undefined,
        photoFrontPath,
      } as Omit<Seed, 'createdAt' | 'updatedAt'>);

      updateItem(item.id, { status: 'saved', savedSeed: saved });
    } catch (e) {
      updateItem(item.id, {
        status: 'error',
        errorMessage: e instanceof Error ? e.message : 'Save failed',
      });
    }
  }, [userId, updateItem]);

  const handleSaveAllReady = useCallback(() => {
    items.filter(i => i.status === 'ready').forEach(handleConfirm);
  }, [items, handleConfirm]);

  const handleEditSave = useCallback(async (
    seedData: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const id = editingItemId;
    setEditingItemId(null);
    if (!id) return;
    updateItem(id, { status: 'saving' });
    try {
      const saved = await saveSeed(seedData);
      updateItem(id, { status: 'saved', savedSeed: saved });
    } catch (e) {
      updateItem(id, {
        status: 'error',
        errorMessage: e instanceof Error ? e.message : 'Save failed',
      });
    }
  }, [editingItemId, updateItem]);

  const editingItem = items.find(i => i.id === editingItemId);
  const savedCount = items.filter(i => i.status === 'saved').length;
  const readyCount = items.filter(i => i.status === 'ready').length;
  const hasItems = items.length > 0;

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // Edit overlay — full-screen AddSeedForm
  if (editingItem) {
    const initialData = editingItem.extracted
      ? extractedToInitialSeed(editingItem.extracted, editingItem.objectUrl)
      : {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          name: '',
          variety: '',
          type: 'other' as const,
          photoFront: editingItem.objectUrl,
        };

    return (
      <div className="min-h-screen w-full bg-white flex flex-col pt-20 pb-24">
        <AddSeedForm
          userId={userId}
          userTier={userTier}
          canUseAI={canUseAI}
          initialData={initialData}
          onSubmit={handleEditSave}
          onClose={() => setEditingItemId(null)}
          asPage
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f9fafb] flex flex-col">
      <main className="flex-1 w-full px-4 py-4 pt-24 pb-24 max-w-[1600px] mx-auto md:px-6 lg:px-8">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-[#4a5565]">Import Seeds</h1>
          <p className="text-sm text-[#99a1af] mt-1">
            Upload packet photos and we'll extract the details automatically.
          </p>
        </div>

        {/* Drop zone / stats bar */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !hasItems && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors mb-3 ${
            isDragging
              ? 'border-[#16a34a] bg-[#f0fdf4] cursor-copy'
              : hasItems
              ? 'border-gray-200 bg-white cursor-default'
              : 'border-gray-300 hover:border-[#16a34a] hover:bg-[#f0fdf4] cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
          {/* Hidden pile input */}
          <input
            ref={pileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handlePilePhoto(f);
              e.target.value = '';
            }}
            className="hidden"
          />

          {hasItems ? (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-[#6a7282]">
                {savedCount} of {items.length} saved
              </span>
              <div className="flex gap-2 flex-wrap">
                {readyCount > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); handleSaveAllReady(); }}
                    className="px-3 py-1.5 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] transition-colors"
                  >
                    Save {readyCount} ready
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="px-3 py-1.5 text-sm text-[#6a7282] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Add more
                </button>
              </div>
            </div>
          ) : (
            <div>
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-[#4a5565] font-medium">Drop photos here or click to select</p>
              <p className="text-sm text-[#99a1af] mt-1">Select multiple images at once</p>
            </div>
          )}
        </div>

        {/* Scatter shot button */}
        <button
          onClick={() => pileInputRef.current?.click()}
          disabled={pileLoading}
          className="w-full mb-4 py-3 px-4 flex items-center justify-center gap-2 border border-gray-300 rounded-xl text-sm font-medium text-[#4a5565] bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pileLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin text-[#16a34a]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning pile...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Photograph a pile — scan many at once
            </>
          )}
        </button>

        {/* Queue list */}
        {hasItems && (
          <div className="space-y-2">
            {items.map(item => (
              <QueueCard
                key={item.id}
                item={item}
                onConfirm={() => handleConfirm(item)}
                onEdit={() => setEditingItemId(item.id)}
                onSkip={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                onRetry={() => updateItem(item.id, {
                  status: 'pending',
                  errorMessage: undefined,
                  extracted: undefined,
                })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface QueueCardProps {
  item: QueueItem;
  onConfirm: () => void;
  onEdit: () => void;
  onSkip: () => void;
  onRetry: () => void;
}

function QueueCard({ item, onConfirm, onEdit, onSkip, onRetry }: QueueCardProps) {
  const label = item.savedSeed
    ? (item.savedSeed.variety || item.savedSeed.name)
    : item.extracted
    ? (item.extracted.variety || item.extracted.name || item.file.name)
    : item.file.name;

  return (
    <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden bg-gray-100">
        <img
          src={item.objectUrl}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[#4a5565] truncate text-sm">{label}</div>
        <StatusLabel item={item} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {item.status === 'ready' && (
          <>
            <button
              onClick={onConfirm}
              className="px-2.5 py-1.5 text-xs font-medium bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] transition-colors"
            >
              Save
            </button>
            <button
              onClick={onEdit}
              className="px-2.5 py-1.5 text-xs font-medium text-[#4a5565] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onSkip}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Skip"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
        {item.status === 'error' && (
          <>
            <button
              onClick={onRetry}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onEdit}
              className="px-2.5 py-1.5 text-xs font-medium text-[#4a5565] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onSkip}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Skip"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
        {item.status === 'saved' && (
          <span className="text-xs font-medium text-[#16a34a] flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

function StatusLabel({ item }: { item: QueueItem }) {
  if (item.status === 'pending') {
    return <span className="text-xs text-[#99a1af]">Queued</span>;
  }
  if (item.status === 'extracting') {
    return (
      <span className="text-xs text-[#16a34a] flex items-center gap-1">
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Processing…
      </span>
    );
  }
  if (item.status === 'saving') {
    return (
      <span className="text-xs text-[#99a1af] flex items-center gap-1">
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Saving…
      </span>
    );
  }
  if (item.status === 'ready') {
    const parts = [item.extracted?.name, item.extracted?.year && String(item.extracted.year)].filter(Boolean);
    return (
      <span className="text-xs text-[#6a7282]">
        {parts.length > 0 ? parts.join(' · ') : 'Ready to save'}
      </span>
    );
  }
  if (item.status === 'saved') {
    return <span className="text-xs text-[#99a1af]">Saved to collection</span>;
  }
  if (item.status === 'error') {
    return <span className="text-xs text-red-500 truncate max-w-[180px]">{item.errorMessage || 'Failed'}</span>;
  }
  return null;
}
