'use client';

import { useState, useEffect } from 'react';
import { AIExtractedData } from '@/lib/packetReaderAI';

export default function PacketExtractionTestPage() {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiExtractedData, setAiExtractedData] = useState<AIExtractedData | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Loading images...');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Remove mobile width constraint on mount
  useEffect(() => {
    const appContainer = document.getElementById('app-container');
    const body = document.body;
    
    if (appContainer) {
      appContainer.style.maxWidth = 'none';
      appContainer.style.width = '100%';
      appContainer.style.boxShadow = 'none';
    }
    if (body) {
      body.style.justifyContent = 'flex-start';
    }
    
    // Handle ESC key to close zoom
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomedImage(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    
    return () => {
      if (appContainer) {
        appContainer.style.maxWidth = '';
        appContainer.style.width = '';
        appContainer.style.boxShadow = '';
      }
      if (body) {
        body.style.justifyContent = '';
      }
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Auto-load images on mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        setStatus('Loading front image...');
        const frontPath = '/data/packet-front.png';
        const frontResponse = await fetch(frontPath);
        if (!frontResponse.ok) {
          throw new Error(`Failed to load front image: ${frontResponse.status}`);
        }
        const frontBlob = await frontResponse.blob();
        const frontUrl = URL.createObjectURL(frontBlob);
        setFrontImage(frontUrl);

        setStatus('Loading back image...');
        const backPath = '/data/packet-back.png';
        const backResponse = await fetch(backPath);
        if (!backResponse.ok) {
          throw new Error(`Failed to load back image: ${backResponse.status}`);
        }
        const backBlob = await backResponse.blob();
        const backUrl = URL.createObjectURL(backBlob);
        setBackImage(backUrl);

        setStatus('Images loaded, processing with AI...');
        
        // Auto-process after images are loaded
        await processWithAI(frontUrl, backUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load images');
        setLoading(false);
      }
    };

    loadImages();
  }, []);

  const processWithAI = async (frontUrl: string, backUrl: string) => {
    try {
      setStatus('Converting images to files...');
      
      // Convert image URLs to File objects for processing
      const frontResponse = await fetch(frontUrl);
      const frontBlob = await frontResponse.blob();
      const frontFile = new File([frontBlob], 'packet-front.png', { type: 'image/png' });

      const backResponse = await fetch(backUrl);
      const backBlob = await backResponse.blob();
      const backFile = new File([backBlob], 'packet-back.png', { type: 'image/png' });

      setStatus('Sending to OpenAI API...');
      
      const formData = new FormData();
      formData.append('frontImage', frontFile);
      formData.append('backImage', backFile);

      const response = await fetch('/api/packet/read-ai', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid response from server: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to process images with AI');
      }

      if (!result.data) {
        throw new Error('No data returned from AI extraction');
      }

      setAiExtractedData(result.data);
      setRawResponse(result);
      setStatus('Complete!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
      setStatus('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-[#f9fafb] p-4">
        <div className="w-full">
          {/* Compact Header and Status */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-[#101828]">AI Extraction Test</h1>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : error ? 'bg-red-400' : 'bg-green-400'}`}></div>
              <span className="text-[#6a7282]">{status}</span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

        {/* Main Content: Front Image 2/3, Data 1/3 */}
        <div className="grid grid-cols-[2fr_1fr] gap-6 h-[calc(100vh-8rem)]">
          {/* Left Side: Images - Independent Scroll */}
          <div className="overflow-y-auto pr-2">
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#4a5565] mb-3">Front Image</h3>
                {frontImage ? (
                  <div className="relative">
                    <img
                      src={frontImage}
                      alt="Front of packet"
                      className="w-full rounded border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                      style={{ 
                        filter: 'brightness(1.1) contrast(1.1)',
                        maxHeight: '800px',
                        objectFit: 'contain'
                      }}
                      onClick={() => setZoomedImage(frontImage)}
                    />
                    <button
                      onClick={() => setZoomedImage(frontImage)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Zoom
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                    Loading...
                  </div>
                )}
              </div>

              {backImage && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#4a5565] mb-3">Back Image</h3>
                  <div className="relative">
                    <img
                      src={backImage}
                      alt="Back of packet"
                      className="w-full rounded border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                      style={{ 
                        filter: 'brightness(1.1) contrast(1.1)',
                        maxHeight: '800px',
                        objectFit: 'contain'
                      }}
                      onClick={() => setZoomedImage(backImage)}
                    />
                    <button
                      onClick={() => setZoomedImage(backImage)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Zoom
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Extracted Data and Raw Response - Independent Scroll */}
          <div className="overflow-y-auto pr-2">
            {aiExtractedData ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-[#4a5565] mb-3">Extracted Data</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-200">
                      {aiExtractedData.name && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Name</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.name === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.name === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.name}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.variety && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Variety</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.variety === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.variety === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.variety}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.latinName && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Latin Name</td>
                          <td className="py-1.5 text-[#101828] italic">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.latinName === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.latinName === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.latinName}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.brand && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Brand</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.brand === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.brand === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.brand}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.year && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Year</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.year === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.year === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.year}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.quantity && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Quantity</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.quantity === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.quantity === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.quantity}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.daysToGermination && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Days to Germination</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.daysToGermination === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.daysToGermination === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.daysToGermination}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.daysToMaturity && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Days to Maturity</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.daysToMaturity === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.daysToMaturity === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.daysToMaturity}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.plantingDepth && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Planting Depth</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.plantingDepth === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.plantingDepth === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.plantingDepth}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.spacing && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Spacing</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.spacing === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.spacing === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.spacing}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.sunRequirement && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Sun Requirement</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.sunRequirement === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.sunRequirement === 'back' ? 'B' : 'F'}
                            </span>
                            {aiExtractedData.sunRequirement}
                          </td>
                        </tr>
                      )}
                      {aiExtractedData.plantingInstructions && (
                        <tr>
                          <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">Planting Instructions</td>
                          <td className="py-1.5 text-[#101828]">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                              aiExtractedData.fieldSources?.plantingInstructions === 'back' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {aiExtractedData.fieldSources?.plantingInstructions === 'back' ? 'B' : 'F'}
                            </span>
                            <span className="whitespace-pre-wrap">{aiExtractedData.plantingInstructions}</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                </div>

                {/* Raw Key-Value Pairs */}
                {aiExtractedData.rawKeyValuePairs && aiExtractedData.rawKeyValuePairs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs font-medium text-[#6a7282] mb-2">
                      All Key-Value Pairs ({aiExtractedData.rawKeyValuePairs.length})
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-gray-100">
                          {aiExtractedData.rawKeyValuePairs.map((pair, index) => (
                            <tr key={index}>
                              <td className="py-1 pr-3 font-medium text-[#6a7282] align-top">{pair.key}</td>
                              <td className="py-1 text-[#101828]">
                                {pair.source && (
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${
                                    pair.source === 'back' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {pair.source === 'back' ? 'B' : 'F'}
                                  </span>
                                )}
                                {pair.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-400 text-center">Waiting for extraction results...</p>
              </div>
            )}
          </div>
        </div>

        {/* Raw API Response - Full Width Below */}
        {rawResponse && (
          <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[#4a5565] mb-3">Raw API Response</h2>
            <pre className="bg-gray-50 p-3 rounded text-[10px] text-[#101828] overflow-auto max-h-96 border border-gray-200">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        )}

      </div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Zoomed view"
            className="max-w-full max-h-full object-contain"
            style={{ 
              filter: 'brightness(1.1) contrast(1.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Close (ESC)
          </button>
        </div>
      )}
    </div>
  );
}
