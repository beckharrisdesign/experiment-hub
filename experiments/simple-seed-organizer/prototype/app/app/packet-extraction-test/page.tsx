'use client';

import { useState, useEffect } from 'react';
import { AIExtractedData } from '@/lib/packetReaderAI';

interface QualityAnalysis {
  actualValue: string | null;
  issues: string[];
  promptImprovements: string[];
  visibility: 'clear' | 'unclear' | 'not-visible';
  confidence: number;
}

interface FieldFeedback {
  fieldName: string;
  analysis: QualityAnalysis | null;
  analyzing: boolean;
}

export default function PacketExtractionTestPage() {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiExtractedData, setAiExtractedData] = useState<AIExtractedData | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Loading images...');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [fieldFeedback, setFieldFeedback] = useState<Record<string, FieldFeedback>>({});
  const [hoverZoom, setHoverZoom] = useState<{ image: string; x: number; y: number; rect: { left: number; top: number; width: number; height: number } } | null>(null);

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
      setStatus('Loading images...');
      
      // Convert image URLs to File objects for processing
      const frontResponse = await fetch(frontUrl);
      const frontBlob = await frontResponse.blob();
      const frontFile = new File([frontBlob], 'packet-front.png', { type: 'image/png' });
      console.log(`[Client] Front image size: ${(frontFile.size / 1024).toFixed(0)}KB`);

      const backResponse = await fetch(backUrl);
      const backBlob = await backResponse.blob();
      const backFile = new File([backBlob], 'packet-back.png', { type: 'image/png' });
      console.log(`[Client] Back image size: ${(backFile.size / 1024).toFixed(0)}KB`);

      // Convert to base64 for quality analysis using FileReader (avoids stack overflow)
      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix if present
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      const frontBase64 = await blobToBase64(frontBlob);
      setFrontImageBase64(frontBase64);

      const backBase64 = await blobToBase64(backBlob);
      setBackImageBase64(backBase64);

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

  const handleThumbsDown = async (fieldName: string, extractedValue: string, source: 'front' | 'back') => {
    // Initialize feedback state
    setFieldFeedback(prev => ({
      ...prev,
      [fieldName]: {
        fieldName,
        analysis: null,
        analyzing: true
      }
    }));

    try {
      const response = await fetch('/api/packet/analyze-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldName,
          extractedValue,
          sourceImage: source,
          frontImageBase64: frontImageBase64,
          backImageBase64: backImageBase64
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze quality');
      }

      setFieldFeedback(prev => ({
        ...prev,
        [fieldName]: {
          fieldName,
          analysis: result.analysis,
          analyzing: false
        }
      }));
    } catch (err) {
      setFieldFeedback(prev => ({
        ...prev,
        [fieldName]: {
          fieldName,
          analysis: null,
          analyzing: false
        }
      }));
      console.error('Error analyzing quality:', err);
    }
  };

  const getAllKeyValuePairs = (data: AIExtractedData): Array<{ key: string; value: string; source?: 'front' | 'back'; italic?: boolean }> => {
    const pairs: Array<{ key: string; value: string; source?: 'front' | 'back'; italic?: boolean }> = [];
    const seenKeys = new Set<string>();

    // Add structured fields
    if (data.name) {
      pairs.push({ key: 'Name', value: data.name, source: data.fieldSources?.name, italic: false });
      seenKeys.add('name');
    }
    if (data.variety) {
      pairs.push({ key: 'Variety', value: data.variety, source: data.fieldSources?.variety, italic: false });
      seenKeys.add('variety');
    }
    if (data.latinName) {
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
        // Check if this key matches any structured field (case-insensitive)
        const isDuplicate = Array.from(seenKeys).some(seenKey => {
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
          return normalizedKey === fieldLabels[seenKey]?.toLowerCase();
        });
        
        if (!isDuplicate) {
          pairs.push({ key: pair.key, value: pair.value, source: pair.source, italic: false });
        }
      });
    }

    return pairs;
  };

  const toTitleCase = (text: string): string => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getKeyValuePairsBySource = (data: AIExtractedData): { front: Array<{ key: string; value: string; source?: 'front' | 'back'; italic?: boolean }>; back: Array<{ key: string; value: string; source?: 'front' | 'back'; italic?: boolean }> } => {
    const allPairs = getAllKeyValuePairs(data);
    return {
      front: allPairs.filter(pair => !pair.source || pair.source === 'front'),
      back: allPairs.filter(pair => pair.source === 'back')
    };
  };

  const renderFieldRow = (
    fieldName: string,
    label: string,
    value: string | number | undefined,
    source: 'front' | 'back' | undefined,
    italic?: boolean
  ) => {
    if (!value) return null;

    const feedback = fieldFeedback[fieldName];
    const sourceColor = source === 'back' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
    const sourceLabel = source === 'back' ? 'B' : 'F';

    return (
      <tr key={fieldName}>
        <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">{label}</td>
        <td className="py-1.5 text-[#101828]">
          <div className="flex items-start gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${sourceColor}`}>
                {sourceLabel}
              </span>
              <span className={italic ? 'italic' : ''}>{String(value)}</span>
            </div>
            <button
              onClick={() => handleThumbsDown(fieldName, String(value), source || 'front')}
              className="shrink-0 text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
              disabled={feedback?.analyzing}
            >
              {feedback?.analyzing ? 'Analyzing...' : '👎'}
            </button>
          </div>
          {feedback?.analysis && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px]">
              <div className="font-medium text-yellow-800 mb-1">Quality Analysis:</div>
              {feedback.analysis.actualValue && (
                <div className="mb-1"><span className="font-medium">Actual:</span> {feedback.analysis.actualValue}</div>
              )}
              {feedback.analysis.issues.length > 0 && (
                <div className="mb-1"><span className="font-medium">Issues:</span> {feedback.analysis.issues.join(', ')}</div>
              )}
              {feedback.analysis.promptImprovements.length > 0 && (
                <div><span className="font-medium">Suggestions:</span> {feedback.analysis.promptImprovements.join('; ')}</div>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
      <div className="min-h-screen bg-[#f9fafb] p-4">
        <div className="w-full">
          {/* Compact Header and Status */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-[#101828]">AI Extraction Test</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (frontImage && backImage) {
                    setAiExtractedData(null);
                    setRawResponse(null);
                    setFieldFeedback({});
                    processWithAI(frontImage, backImage);
                  }
                }}
                disabled={loading || !frontImage || !backImage}
                className="text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Re-extract
              </button>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : error ? 'bg-red-400' : 'bg-green-400'}`}></div>
                <span className="text-[#6a7282]">{status}</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

        {/* Main Content: Front Image + Data, Back Image + Data */}
        <div className="space-y-6">
          {/* Front Image and Data */}
          <div className="grid grid-cols-[1fr_1fr] gap-6">
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
                    <img
                      src={frontImage}
                      alt="Front of packet"
                      className="w-full rounded border border-gray-200"
                      style={{ 
                        filter: 'brightness(1.1) contrast(1.1)',
                        maxHeight: '800px',
                        objectFit: 'contain'
                      }}
                    />
                    {hoverZoom && hoverZoom.image === frontImage && (
                      <div 
                        className="fixed pointer-events-none z-50 border-2 border-blue-400 bg-white shadow-2xl rounded overflow-hidden"
                        style={{
                          width: '400px',
                          height: '400px',
                          left: `${hoverZoom.x + 20}px`,
                          top: `${hoverZoom.y - 200}px`,
                          backgroundImage: `url(${frontImage})`,
                          backgroundSize: '200%',
                          backgroundPosition: `${((hoverZoom.x - hoverZoom.rect.left) / hoverZoom.rect.width) * 100}% ${((hoverZoom.y - hoverZoom.rect.top) / hoverZoom.rect.height) * 100}%`,
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                    Loading...
                  </div>
                )}
              </div>
            </div>

            {/* Front Data */}
            <div className="pr-2">
              {aiExtractedData ? (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h2 className="text-lg font-semibold text-[#4a5565] mb-3">Front Image Data</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-200">
                        {getKeyValuePairsBySource(aiExtractedData).front.map((pair, index) => {
                          const keyToFieldName: Record<string, string> = {
                            'Name': 'name',
                            'Variety': 'variety',
                            'Latin Name': 'latinName',
                            'Brand': 'brand',
                            'Year': 'year',
                            'Quantity': 'quantity',
                            'Days to Germination': 'daysToGermination',
                            'Days to Maturity': 'daysToMaturity',
                            'Planting Depth': 'plantingDepth',
                            'Spacing': 'spacing',
                            'Sun Requirement': 'sunRequirement',
                            'Description': 'description',
                            'Planting Instructions': 'plantingInstructions'
                          };
                          const fieldName = keyToFieldName[pair.key] || `raw_${pair.key}_${index}`;
                          const feedback = fieldFeedback[fieldName];
                          const sourceColor = 'bg-blue-100 text-blue-700';
                          const sourceLabel = 'F';
                          const isLongText = pair.key === 'Planting Instructions' || pair.key === 'Description';
                          const isScientificName = pair.key === 'Latin Name';
                          const displayValue = isLongText || isScientificName ? pair.value : toTitleCase(pair.value);
                          
                          return (
                            <tr key={index}>
                              <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">{pair.key}</td>
                              <td className="py-1.5 text-[#101828]">
                                <div className="flex items-start gap-2 min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${sourceColor}`}>
                                      {sourceLabel}
                                    </span>
                                    <span className={pair.italic ? 'italic' : isLongText ? 'whitespace-pre-wrap' : ''}>
                                      {displayValue}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleThumbsDown(fieldName, pair.value, 'front')}
                                    className="shrink-0 text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                                    disabled={feedback?.analyzing}
                                  >
                                    {feedback?.analyzing ? 'Analyzing...' : '👎'}
                                  </button>
                                </div>
                                {feedback?.analysis && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px]">
                                    <div className="font-medium text-yellow-800 mb-1">Quality Analysis:</div>
                                    {feedback.analysis.actualValue && (
                                      <div className="mb-1"><span className="font-medium">Actual:</span> {feedback.analysis.actualValue}</div>
                                    )}
                                    {feedback.analysis.issues.length > 0 && (
                                      <div className="mb-1"><span className="font-medium">Issues:</span> {feedback.analysis.issues.join(', ')}</div>
                                    )}
                                    {feedback.analysis.promptImprovements.length > 0 && (
                                      <div><span className="font-medium">Suggestions:</span> {feedback.analysis.promptImprovements.join('; ')}</div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-400">No data extracted yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Back Image and Data */}
          {backImage && (
            <div className="grid grid-cols-[1fr_1fr] gap-6">
              {/* Back Image */}
              <div className="pr-2">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#4a5565] mb-3">Back Image</h3>
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
                    <img
                      src={backImage}
                      alt="Back of packet"
                      className="w-full rounded border border-gray-200"
                      style={{ 
                        filter: 'brightness(1.1) contrast(1.1)',
                        maxHeight: '800px',
                        objectFit: 'contain'
                      }}
                    />
                    {hoverZoom && hoverZoom.image === backImage && (
                      <div 
                        className="fixed pointer-events-none z-50 border-2 border-green-400 bg-white shadow-2xl rounded overflow-hidden"
                        style={{
                          width: '400px',
                          height: '400px',
                          left: `${hoverZoom.x + 20}px`,
                          top: `${hoverZoom.y - 200}px`,
                          backgroundImage: `url(${backImage})`,
                          backgroundSize: '200%',
                          backgroundPosition: `${((hoverZoom.x - hoverZoom.rect.left) / hoverZoom.rect.width) * 100}% ${((hoverZoom.y - hoverZoom.rect.top) / hoverZoom.rect.height) * 100}%`,
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Back Data */}
              <div className="pr-2">
                {aiExtractedData ? (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h2 className="text-lg font-semibold text-[#4a5565] mb-3">Back Image Data</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-gray-200">
                          {getKeyValuePairsBySource(aiExtractedData).back.map((pair, index) => {
                            const keyToFieldName: Record<string, string> = {
                              'Name': 'name',
                              'Variety': 'variety',
                              'Latin Name': 'latinName',
                              'Brand': 'brand',
                              'Year': 'year',
                              'Quantity': 'quantity',
                              'Days to Germination': 'daysToGermination',
                              'Days to Maturity': 'daysToMaturity',
                              'Planting Depth': 'plantingDepth',
                              'Spacing': 'spacing',
                              'Sun Requirement': 'sunRequirement',
                              'Description': 'description',
                              'Planting Instructions': 'plantingInstructions'
                            };
                            const fieldName = keyToFieldName[pair.key] || `raw_${pair.key}_${index}`;
                            const feedback = fieldFeedback[fieldName];
                            const sourceColor = 'bg-green-100 text-green-700';
                            const sourceLabel = 'B';
                            const isLongText = pair.key === 'Planting Instructions' || pair.key === 'Description';
                            const isScientificName = pair.key === 'Latin Name';
                            const displayValue = isLongText || isScientificName ? pair.value : toTitleCase(pair.value);
                            
                            return (
                              <tr key={index}>
                                <td className="py-1.5 pr-4 font-medium text-[#6a7282] align-top">{pair.key}</td>
                                <td className="py-1.5 text-[#101828]">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <div className="flex-1 min-w-0">
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 ${sourceColor}`}>
                                        {sourceLabel}
                                      </span>
                                      <span className={pair.italic ? 'italic' : isLongText ? 'whitespace-pre-wrap' : ''}>
                                        {displayValue}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleThumbsDown(fieldName, pair.value, 'back')}
                                      className="shrink-0 text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                                      disabled={feedback?.analyzing}
                                    >
                                      {feedback?.analyzing ? 'Analyzing...' : '👎'}
                                    </button>
                                  </div>
                                  {feedback?.analysis && (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px]">
                                      <div className="font-medium text-yellow-800 mb-1">Quality Analysis:</div>
                                      {feedback.analysis.actualValue && (
                                        <div className="mb-1"><span className="font-medium">Actual:</span> {feedback.analysis.actualValue}</div>
                                      )}
                                      {feedback.analysis.issues.length > 0 && (
                                        <div className="mb-1"><span className="font-medium">Issues:</span> {feedback.analysis.issues.join(', ')}</div>
                                      )}
                                      {feedback.analysis.promptImprovements.length > 0 && (
                                        <div><span className="font-medium">Suggestions:</span> {feedback.analysis.promptImprovements.join('; ')}</div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-400">No data extracted yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Prompt Refinement Suggestions */}
        {Object.keys(fieldFeedback).length > 0 && Object.values(fieldFeedback).some(f => f.analysis) && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[#4a5565] mb-3">Prompt Refinement Suggestions</h2>
            <div className="space-y-2 text-xs">
              {Object.values(fieldFeedback)
                .filter(f => f.analysis && f.analysis.promptImprovements.length > 0)
                .map((f, idx) => (
                  <div key={idx} className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-medium text-[#4a5565] mb-1">{f.fieldName}:</div>
                    <ul className="list-disc list-inside text-[#6a7282] space-y-1">
                      {f.analysis!.promptImprovements.map((improvement, i) => (
                        <li key={i}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px]">
              <div className="font-medium text-yellow-800 mb-1">Summary:</div>
              <p className="text-yellow-700">
                Based on {Object.values(fieldFeedback).filter(f => f.analysis).length} field(s) marked as inaccurate, 
                consider incorporating the suggestions above into the extraction prompt to improve accuracy.
              </p>
            </div>
          </div>
        )}

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
