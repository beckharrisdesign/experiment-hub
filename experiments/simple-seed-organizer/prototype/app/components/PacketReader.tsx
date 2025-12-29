'use client';

import { useState } from 'react';
import { ExtractedSeedData } from '@/lib/packetReader';

interface PacketReaderProps {
  onDataExtracted: (data: ExtractedSeedData) => void;
  onClose?: () => void;
}

export function PacketReader({ onDataExtracted, onClose }: PacketReaderProps) {
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedSeedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (
    file: File | null,
    side: 'front' | 'back',
    setPreview: (preview: string | null) => void
  ) => {
    if (file) {
      if (side === 'front') {
        setFrontImage(file);
      } else {
        setBackImage(file);
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!frontImage) {
      setError('Please select at least a front image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('frontImage', frontImage);
      if (backImage) {
        formData.append('backImage', backImage);
      }

      const response = await fetch('/api/packet/read', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process images');
      }

      setExtractedData(result.data);
      onDataExtracted(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#101828]">Scan Seed Packet</h2>
      
      {/* Image Upload Sections */}
      <div className="grid grid-cols-2 gap-4">
        {/* Front Image */}
        <div>
          <label className="block text-sm font-medium text-[#4a5565] mb-2">
            Front of Packet
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {frontPreview ? (
              <div className="space-y-2">
                <img
                  src={frontPreview}
                  alt="Front preview"
                  className="max-h-48 mx-auto rounded"
                />
                <button
                  onClick={() => {
                    setFrontImage(null);
                    setFrontPreview(null);
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleImageSelect(file, 'front', setFrontPreview);
                  }}
                />
                <div className="space-y-2">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">Click to upload</p>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Back Image */}
        <div>
          <label className="block text-sm font-medium text-[#4a5565] mb-2">
            Back of Packet (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {backPreview ? (
              <div className="space-y-2">
                <img
                  src={backPreview}
                  alt="Back preview"
                  className="max-h-48 mx-auto rounded"
                />
                <button
                  onClick={() => {
                    setBackImage(null);
                    setBackPreview(null);
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleImageSelect(file, 'back', setBackPreview);
                  }}
                />
                <div className="space-y-2">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">Click to upload</p>
                </div>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={!frontImage || loading}
        className="w-full py-3 bg-[#16a34a] text-white rounded-lg font-medium hover:bg-[#15803d] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : 'Extract Information'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Extracted Data Display */}
      {extractedData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-green-900">Extracted Information:</h3>
          <div className="text-sm text-green-800 space-y-1">
            {extractedData.name && <p><strong>Name:</strong> {extractedData.name}</p>}
            {extractedData.variety && <p><strong>Variety:</strong> {extractedData.variety}</p>}
            {extractedData.brand && <p><strong>Brand:</strong> {extractedData.brand}</p>}
            {extractedData.year && <p><strong>Year:</strong> {extractedData.year}</p>}
            {extractedData.quantity && <p><strong>Quantity:</strong> {extractedData.quantity}</p>}
            {extractedData.daysToGermination && <p><strong>Days to Germination:</strong> {extractedData.daysToGermination}</p>}
            {extractedData.daysToMaturity && <p><strong>Days to Maturity:</strong> {extractedData.daysToMaturity}</p>}
            {extractedData.plantingDepth && <p><strong>Planting Depth:</strong> {extractedData.plantingDepth}</p>}
            {extractedData.spacing && <p><strong>Spacing:</strong> {extractedData.spacing}</p>}
            {extractedData.sunRequirement && <p><strong>Sun Requirement:</strong> {extractedData.sunRequirement}</p>}
            {extractedData.confidence && (
              <p className="text-xs text-green-600 mt-2">
                Confidence: {(extractedData.confidence * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

