'use client';

import { useState } from 'react';
import { Seed, SeedType, SunRequirement } from '@/types/seed';

interface AddSeedFormProps {
  onSubmit: (seed: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  initialData?: Seed;
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

export function AddSeedForm({ onSubmit, onClose, initialData }: AddSeedFormProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !variety.trim()) return;

    onSubmit({
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
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#101828]">
          {initialData ? 'Edit Seed' : 'Add Seed'}
        </h1>
        <button onClick={onClose} className="p-2 -mr-2">
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Photo Section */}
        <div className="mb-6">
          <h2 className="text-[#101828] font-semibold mb-1">Seed Packet Photos</h2>
          <p className="text-sm text-[#6a7282] mb-3">
            Scan your seed packet and we&apos;ll auto-fill the details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Front</label>
              <button type="button" className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-[#16a34a] hover:text-[#16a34a] transition-colors">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Back</label>
              <button type="button" className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-[#16a34a] hover:text-[#16a34a] transition-colors">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Required Fields */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Beefsteak"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Variety *</label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g., Tomato"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SeedType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent bg-white"
              >
                {SEED_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Burpee"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-[#4a5565] mb-1 block">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., Home Depot, Baker Creek, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g., 2024"
                min="1900"
                max="2100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Quantity</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 25 seeds"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Custom Expiration</label>
              <input
                type="date"
                value={customExpirationDate}
                onChange={(e) => setCustomExpirationDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-[#4a5565] mb-1 block">Days to Germination</label>
            <input
              type="text"
              value={daysToGermination}
              onChange={(e) => setDaysToGermination(e.target.value)}
              placeholder="e.g., 7-14 days"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm text-[#4a5565] mb-1 block">Days to Maturity</label>
            <input
              type="text"
              value={daysToMaturity}
              onChange={(e) => setDaysToMaturity(e.target.value)}
              placeholder="e.g., 75-85 days"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Planting Depth</label>
              <input
                type="text"
                value={plantingDepth}
                onChange={(e) => setPlantingDepth(e.target.value)}
                placeholder="e.g., 1/4 inch"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm text-[#4a5565] mb-1 block">Spacing</label>
              <input
                type="text"
                value={spacing}
                onChange={(e) => setSpacing(e.target.value)}
                placeholder="e.g., 12 inches"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-[#4a5565] mb-1 block">Sun Requirement</label>
            <select
              value={sunRequirement || ''}
              onChange={(e) => setSunRequirement(e.target.value as SunRequirement || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent bg-white"
            >
              <option value="">Select...</option>
              {SUN_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-[#4a5565] mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent resize-none"
            />
          </div>
        </div>
      </form>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!name.trim() || !variety.trim()}
          className="w-full py-3 bg-[#00a63e] text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {initialData ? 'Save Changes' : 'Add to Collection'}
        </button>
      </div>
    </div>
  );
}
