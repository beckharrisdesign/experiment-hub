'use client';

import { useState, useEffect } from 'react';
import { Listing } from '@/types';

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<string>('');

  useEffect(() => {
    fetchListings();
    fetchPatterns();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      const response = await fetch('/api/patterns');
      if (response.ok) {
        const data = await response.json();
        setPatterns(data.filter((p: any) => p.status === 'ready'));
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPattern) return;

    setLoading(true);
    try {
      const response = await fetch('/api/listings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: selectedPattern }),
      });

      if (response.ok) {
        fetchListings();
        setSelectedPattern('');
      } else {
        alert('Failed to generate listing');
      }
    } catch (error) {
      console.error('Error generating listing:', error);
      alert('Error generating listing');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (listing: Listing) => {
    const exportText = `Title: ${listing.title}\n\nDescription:\n${listing.description}\n\nTags: ${listing.tags.join(', ')}\n\nCategory: ${listing.category || 'N/A'}\nPrice: $${listing.price || 'N/A'}`;
    navigator.clipboard.writeText(exportText);
    alert('Listing content copied to clipboard!');
  };

  if (loading && listings.length === 0) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Listing Authoring</h1>
          <p className="text-text-secondary">Generate optimized Etsy listing content</p>
        </header>

        <div className="mb-8 bg-background-secondary border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Generate New Listing</h2>
          <div className="flex gap-4">
            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              className="flex-1 px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
            >
              <option value="">Select a pattern (status: ready)</option>
              {patterns.map((pattern) => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={!selectedPattern || loading}
              className="px-6 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Listing'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {listings.map((listing) => {
            const pattern = patterns.find((p) => p.id === listing.patternId);
            return (
              <div key={listing.id} className="bg-background-secondary border border-border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
                    {pattern && <p className="text-sm text-text-secondary">Pattern: {pattern.name}</p>}
                  </div>
                  <button
                    onClick={() => handleExport(listing)}
                    className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-text-secondary mb-1">Description:</h4>
                  <p className="text-text-primary whitespace-pre-wrap">{listing.description}</p>
                </div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-text-secondary mb-1">Tags ({listing.tags.length}):</h4>
                  <div className="flex flex-wrap gap-2">
                    {listing.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-background-tertiary border border-border rounded text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-text-secondary">
                  {listing.category && <span>Category: {listing.category}</span>}
                  {listing.price && <span>Price: ${listing.price}</span>}
                  {listing.seoScore && <span>SEO Score: {listing.seoScore}/100</span>}
                </div>
              </div>
            );
          })}
          {listings.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              <p>No listings yet. Generate your first listing above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

