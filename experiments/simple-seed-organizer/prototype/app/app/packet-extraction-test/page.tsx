'use client';

import { useState, useEffect, useRef } from 'react';
import { AddSeedForm } from '@/components/AddSeedForm';
import { Seed } from '@/types/seed';
import { AIExtractedData } from '@/lib/packetReaderAI';
import { useAuth } from '@/lib/auth-context';

/**
 * Helper function to normalize sun requirement text to Seed type
 */
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

/**
 * Map AIExtractedData to Seed form data
 */
function mapAIDataToSeed(aiData: AIExtractedData, frontImageBase64?: string, backImageBase64?: string): Partial<Seed> {
  return {
    name: aiData.name || '',
    variety: aiData.variety || '',
    brand: aiData.brand,
    year: aiData.year,
    quantity: aiData.quantity,
    daysToGermination: aiData.daysToGermination,
    daysToMaturity: aiData.daysToMaturity,
    plantingDepth: aiData.plantingDepth,
    spacing: aiData.spacing,
    sunRequirement: normalizeSunRequirement(aiData.sunRequirement),
    notes: aiData.description || aiData.plantingInstructions || undefined,
    photoFront: frontImageBase64 ? `data:image/png;base64,${frontImageBase64}` : undefined,
    photoBack: backImageBase64 ? `data:image/png;base64,${backImageBase64}` : undefined,
  };
}

export default function PacketExtractionTestPage() {
  const { user } = useAuth();
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiExtractedData, setAiExtractedData] = useState<AIExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Loading images...');
  const [seedData, setSeedData] = useState<Partial<Seed> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

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
    
    return () => {
      if (appContainer) {
        appContainer.style.maxWidth = '';
        appContainer.style.width = '';
        appContainer.style.boxShadow = '';
      }
      if (body) {
        body.style.justifyContent = '';
      }
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

      // Convert to base64 for storing in seed data
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
      
      // Map AI data to Seed format and show form
      const mappedData = mapAIDataToSeed(result.data, frontBase64, backBase64);
      setSeedData(mappedData);
      setShowForm(true);
      setStatus('Complete!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
      setStatus('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (side: 'front' | 'back', file: File) => {
    const url = URL.createObjectURL(file);
    if (side === 'front') {
      setFrontImage(url);
    } else {
      setBackImage(url);
    }

    // If both images are loaded, process
    if (side === 'front' && backImage) {
      await processWithAI(url, backImage);
    } else if (side === 'back' && frontImage) {
      await processWithAI(frontImage, url);
    }
  };

  const handleFormSubmit = (seed: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('Seed submitted:', seed);
    // TODO: Save to storage or navigate away
    alert('Seed saved! (This is a test page - implement save logic)');
  };

  const handleFormClose = () => {
    setShowForm(false);
  };

  // Show loading/error state
  if (!showForm) {
    return (
      <div className="min-h-screen bg-[#f9fafb] pt-24 pb-4 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-semibold text-[#101828] mb-4">AI Seed Packet Extraction</h1>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a] mb-4"></div>
                <p className="text-sm text-[#6a7282]">{status}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#4a5565] mb-2 block">Front Image</label>
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
                    {frontImage ? (
                      <img src={frontImage} alt="Front" className="w-full rounded border border-gray-200" />
                    ) : (
                      <button
                        onClick={() => frontFileInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                      >
                        Click to upload front image
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-[#4a5565] mb-2 block">Back Image</label>
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
                    {backImage ? (
                      <img src={backImage} alt="Back" className="w-full rounded border border-gray-200" />
                    ) : (
                      <button
                        onClick={() => backFileInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                      >
                        Click to upload back image
                      </button>
                    )}
                  </div>
                </div>

                {aiExtractedData && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowForm(true)}
                      className="w-full py-3 bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors"
                    >
                      View Extracted Data in Form
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show AddSeedForm with extracted data
  return (
    <AddSeedForm
      userId={user?.id ?? 'test-user'}
      initialData={seedData as Seed}
      onSubmit={handleFormSubmit}
      onClose={handleFormClose}
    />
  );
}
