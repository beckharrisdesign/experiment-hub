'use client';

import { useState, useEffect } from 'react';
import { Pattern } from '@/types';

export default function PatternsPage() {
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

  const handleStatusChange = async (id: string, status: Pattern['status']) => {
    try {
      const response = await fetch(`/api/patterns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchPatterns();
      }
    } catch (error) {
      console.error('Error updating pattern:', error);
    }
  };

  const statusColors = {
    idea: 'bg-gray-500',
    'in-progress': 'bg-blue-500',
    ready: 'bg-yellow-500',
    listed: 'bg-green-500',
  };

  const groupedPatterns = patterns.reduce((acc, pattern) => {
    if (!acc[pattern.status]) acc[pattern.status] = [];
    acc[pattern.status].push(pattern);
    return acc;
  }, {} as Record<Pattern['status'], Pattern[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Product Planning</h1>
            <p className="text-text-secondary">Track pattern ideas and plan releases</p>
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
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
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

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['idea', 'in-progress', 'ready', 'listed'] as Pattern['status'][]).map((status) => (
            <div key={status} className="bg-background-secondary border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-4 capitalize flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                {status.replace('-', ' ')}
                <span className="text-sm text-text-muted">({groupedPatterns[status]?.length || 0})</span>
              </h3>
              <div className="space-y-2">
                {(groupedPatterns[status] || []).map((pattern) => (
                  <div
                    key={pattern.id}
                    className="bg-background-tertiary border border-border rounded p-3 hover:border-accent-primary transition cursor-pointer"
                  >
                    <h4 className="font-medium mb-1">{pattern.name}</h4>
                    {pattern.category && (
                      <p className="text-xs text-text-secondary mb-2">Category: {pattern.category}</p>
                    )}
                    <select
                      value={pattern.status}
                      onChange={(e) => handleStatusChange(pattern.id, e.target.value as Pattern['status'])}
                      className="w-full text-xs px-2 py-1 bg-background-secondary border border-border rounded text-text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="idea">Idea</option>
                      <option value="in-progress">In Progress</option>
                      <option value="ready">Ready</option>
                      <option value="listed">Listed</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

