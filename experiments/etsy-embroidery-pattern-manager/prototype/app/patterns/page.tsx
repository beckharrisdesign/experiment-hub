'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pattern } from '@/types';
import Spinner from '@/components/shared/Spinner';

export default function PatternsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    category: '',
    difficulty: '' as Pattern['difficulty'] | '',
    style: '',
  });

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      const response = await fetch('/api/patterns');
      if (response.ok) {
        const data = await response.json();
        // Sort by updated date (newest first)
        data.sort((a: Pattern, b: Pattern) => {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setPatterns(data);
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({ name: '', notes: '', category: '', difficulty: '', style: '' });
        fetchPatterns();
      }
    } catch (error) {
      console.error('Error creating pattern:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary flex items-center justify-center gap-3">
        <Spinner size="md" />
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="px-4 py-8 max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Patterns</h1>
            <p className="text-text-secondary mt-2">Manage your embroidery patterns</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
          >
            {showForm ? 'Cancel' : '+ New Pattern'}
          </button>
        </header>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Pattern</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pattern Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Pattern['difficulty'] })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                >
                  <option value="">Select difficulty</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Style</label>
                <input
                  type="text"
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                  rows={3}
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              Create Pattern
            </button>
          </form>
        )}

        {patterns.length === 0 ? (
          <div className="bg-background-secondary border border-border rounded-lg p-12 text-center">
            <p className="text-text-secondary mb-4">No patterns yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition"
            >
              Create Your First Pattern
            </button>
          </div>
        ) : (
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-6 hover:bg-background-tertiary transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail Image */}
                    <Link
                      href={`/patterns/${pattern.id}`}
                      className="flex-shrink-0"
                    >
                      <div className="w-20 h-20 bg-background-tertiary border border-border rounded flex items-center justify-center overflow-hidden">
                        {/* TODO: Replace with actual image when image storage is implemented */}
                        <span className="text-text-muted text-xs text-center px-2">
                          {pattern.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </Link>
                    
                    {/* Pattern Info */}
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/patterns/${pattern.id}`}
                          className="block hover:text-accent-primary transition"
                        >
                          <h3 className="text-lg font-semibold text-text-primary mb-2">
                            {pattern.name}
                          </h3>
                          {pattern.notes && (
                            <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                              {pattern.notes}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                            {pattern.category && (
                              <span>Category: {pattern.category}</span>
                            )}
                            {pattern.difficulty && (
                              <span>Difficulty: {pattern.difficulty}</span>
                            )}
                            {pattern.style && (
                              <span>Style: {pattern.style}</span>
                            )}
                          </div>
                        </Link>
                      </div>
                      <button
                        onClick={() => router.push(`/patterns/${pattern.id}`)}
                        className="px-3 py-1.5 text-xs bg-background-tertiary border border-border rounded hover:bg-background-primary transition flex-shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
