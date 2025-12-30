'use client';

import { useState } from 'react';
import { ExtractedSeedData } from '@/lib/packetReader';
import { AIExtractedData } from '@/lib/packetReaderAI';

export default function PacketTestPage() {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<{ front?: string; back?: string }>({});
  const [extractedData, setExtractedData] = useState<ExtractedSeedData | null>(null);
  const [aiExtractedData, setAiExtractedData] = useState<AIExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [useAI, setUseAI] = useState<boolean>(true);

  const loadSampleImage = async (side: 'front' | 'back') => {
    try {
      const imagePath = side === 'front' 
        ? '/data/packet-front.png'
        : '/data/packet-back.png';
      
      // Load image from public directory
      const response = await fetch(imagePath);
      if (!response.ok) {
        // Try alternative path
        const altPath = side === 'front'
          ? '/packet-front.png'
          : '/packet-back.png';
        const altResponse = await fetch(altPath);
        if (!altResponse.ok) {
          throw new Error(`Failed to load ${side} image from both paths`);
        }
        const blob = await altResponse.blob();
        const imageUrl = URL.createObjectURL(blob);
        if (side === 'front') {
          setFrontImage(imageUrl);
        } else {
          setBackImage(imageUrl);
        }
        return;
      }
      
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      if (side === 'front') {
        setFrontImage(imageUrl);
      } else {
        setBackImage(imageUrl);
      }
    } catch (err) {
      setError(`Failed to load sample image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleProcess = async () => {
    if (!frontImage) {
      setError('Please load at least the front image');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('');
    setExtractedText({});
    setExtractedData(null);
    setAiExtractedData(null);

    try {
      // Convert image URLs to File objects for processing
      const frontResponse = await fetch(frontImage);
      const frontBlob = await frontResponse.blob();
      const frontFile = new File([frontBlob], 'packet-front.png', { type: 'image/png' });

      let backFile: File | undefined;
      if (backImage) {
        const backResponse = await fetch(backImage);
        const backBlob = await backResponse.blob();
        backFile = new File([backBlob], 'packet-back.png', { type: 'image/png' });
      }

      if (useAI) {
        // Use AI extraction
        setProgress('Processing images with AI...');
        const formData = new FormData();
        formData.append('frontImage', frontFile);
        if (backFile) {
          formData.append('backImage', backFile);
        }

        const response = await fetch('/api/packet/read-ai', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to process images with AI');
        }

        setAiExtractedData(result.data);
        setProgress('AI extraction complete!');
      } else {
        // Use OCR extraction
        setProgress('Initializing OCR...');
        const { extractTextFromImage, parsePacketText } = await import('@/lib/packetReader');
        
        setProgress('Processing front image with OCR...');
        const frontText = await extractTextFromImage(frontFile);
        setExtractedText(prev => ({ ...prev, front: frontText.text }));
        setProgress(`Front image processed. Confidence: ${(frontText.confidence * 100).toFixed(1)}%`);

        let backText = null;
        if (backFile) {
          setProgress('Processing back image with OCR...');
          backText = await extractTextFromImage(backFile);
          setExtractedText(prev => ({ ...prev, back: backText!.text }));
          setProgress(`Back image processed. Confidence: ${(backText.confidence * 100).toFixed(1)}%`);
        }

        setProgress('Parsing extracted text...');
        const combinedText = backText 
          ? `${frontText.text}\n\n${backText.text}`
          : frontText.text;
        
        const parsed = parsePacketText(combinedText);
        parsed.confidence = backText 
          ? (frontText.confidence + backText.confidence) / 2
          : frontText.confidence;
        
        setExtractedData(parsed);
        setProgress('Complete!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#101828] mb-6">Seed Packet OCR Test</h1>

        {/* Sample Image Loader */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#4a5565] mb-4">Load Sample Images</h2>
          <div className="flex gap-4">
            <button
              onClick={() => loadSampleImage('front')}
              disabled={loading}
              className="px-4 py-2 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Load Front Image
            </button>
            <button
              onClick={() => loadSampleImage('back')}
              disabled={loading}
              className="px-4 py-2 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Load Back Image
            </button>
          </div>
        </div>

        {/* Image Preview */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[#4a5565] mb-2">Front Image</h3>
            {frontImage ? (
              <div className="space-y-2">
                <img
                  src={frontImage}
                  alt="Front of packet"
                  className="w-full rounded border border-gray-200"
                />
                <button
                  onClick={() => setFrontImage(null)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                No image loaded
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[#4a5565] mb-2">Back Image</h3>
            {backImage ? (
              <div className="space-y-2">
                <img
                  src={backImage}
                  alt="Back of packet"
                  className="w-full rounded border border-gray-200"
                />
                <button
                  onClick={() => setBackImage(null)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                No image loaded
              </div>
            )}
          </div>
        </div>

        {/* Process Options */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-[#4a5565]">
                Use AI (OpenAI Vision) for better extraction
              </span>
            </label>
            <p className="text-xs text-[#6a7282] ml-6 mt-1">
              AI extraction provides better accuracy and extracts more fields (planting instructions, latin name, summary)
            </p>
          </div>
          <button
            onClick={handleProcess}
            disabled={!frontImage || loading}
            className="w-full py-3 bg-[#16a34a] text-white rounded-lg font-medium hover:bg-[#15803d] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : useAI ? 'Process Images with AI' : 'Process Images with OCR'}
          </button>
          {progress && (
            <p className="mt-2 text-sm text-[#6a7282] text-center">{progress}</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Extracted Text Display */}
        {(extractedText.front || extractedText.back) && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#4a5565] mb-4">Extracted Text</h2>
            <div className="grid grid-cols-2 gap-4">
              {extractedText.front && (
                <div>
                  <h3 className="text-sm font-medium text-[#6a7282] mb-2">Front:</h3>
                  <pre className="bg-gray-50 p-4 rounded text-xs text-[#101828] whitespace-pre-wrap overflow-auto max-h-64">
                    {extractedText.front}
                  </pre>
                </div>
              )}
              {extractedText.back && (
                <div>
                  <h3 className="text-sm font-medium text-[#6a7282] mb-2">Back:</h3>
                  <pre className="bg-gray-50 p-4 rounded text-xs text-[#101828] whitespace-pre-wrap overflow-auto max-h-64">
                    {extractedText.back}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Extracted Data Display */}
        {aiExtractedData && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-[#4a5565] mb-4">AI Extracted Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {aiExtractedData.name && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Name:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.name}</span>
                  </div>
                )}
                {aiExtractedData.variety && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Variety:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.variety}</span>
                  </div>
                )}
                {aiExtractedData.latinName && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Latin Name:</span>
                    <span className="ml-2 text-[#101828] italic">{aiExtractedData.latinName}</span>
                  </div>
                )}
                {aiExtractedData.brand && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Brand:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.brand}</span>
                  </div>
                )}
                {aiExtractedData.year && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Year:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.year}</span>
                  </div>
                )}
                {aiExtractedData.quantity && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Quantity:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.quantity}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {aiExtractedData.daysToGermination && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Days to Germination:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.daysToGermination}</span>
                  </div>
                )}
                {aiExtractedData.daysToMaturity && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Days to Maturity:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.daysToMaturity}</span>
                  </div>
                )}
                {aiExtractedData.plantingDepth && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Planting Depth:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.plantingDepth}</span>
                  </div>
                )}
                {aiExtractedData.spacing && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Spacing:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.spacing}</span>
                  </div>
                )}
                {aiExtractedData.sunRequirement && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Sun Requirement:</span>
                    <span className="ml-2 text-[#101828]">{aiExtractedData.sunRequirement}</span>
                  </div>
                )}
              </div>
            </div>
            {aiExtractedData.summary && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#4a5565] mb-2">Summary:</h3>
                <p className="text-sm text-[#101828]">{aiExtractedData.summary}</p>
              </div>
            )}
            {aiExtractedData.plantingInstructions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#4a5565] mb-2">Planting Instructions:</h3>
                <p className="text-sm text-[#101828] whitespace-pre-wrap">{aiExtractedData.plantingInstructions}</p>
              </div>
            )}
            {aiExtractedData.additionalNotes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#4a5565] mb-2">Additional Notes:</h3>
                <p className="text-sm text-[#101828] whitespace-pre-wrap">{aiExtractedData.additionalNotes}</p>
              </div>
            )}
            {aiExtractedData.confidence && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm font-medium text-[#6a7282]">Confidence:</span>
                <span className="ml-2 text-[#101828]">{(aiExtractedData.confidence * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}

        {/* OCR Parsed Data Display */}
        {extractedData && !aiExtractedData && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#4a5565] mb-4">OCR Parsed Seed Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {extractedData.name && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Name:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.name}</span>
                  </div>
                )}
                {extractedData.variety && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Variety:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.variety}</span>
                  </div>
                )}
                {extractedData.brand && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Brand:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.brand}</span>
                  </div>
                )}
                {extractedData.year && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Year:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.year}</span>
                  </div>
                )}
                {extractedData.quantity && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Quantity:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.quantity}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {extractedData.daysToGermination && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Days to Germination:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.daysToGermination}</span>
                  </div>
                )}
                {extractedData.daysToMaturity && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Days to Maturity:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.daysToMaturity}</span>
                  </div>
                )}
                {extractedData.plantingDepth && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Planting Depth:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.plantingDepth}</span>
                  </div>
                )}
                {extractedData.spacing && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Spacing:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.spacing}</span>
                  </div>
                )}
                {extractedData.sunRequirement && (
                  <div>
                    <span className="text-sm font-medium text-[#6a7282]">Sun Requirement:</span>
                    <span className="ml-2 text-[#101828]">{extractedData.sunRequirement}</span>
                  </div>
                )}
                {extractedData.confidence && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-[#6a7282]">Confidence:</span>
                    <span className="ml-2 text-[#101828]">{(extractedData.confidence * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
      </div>
    </div>
  );
}

