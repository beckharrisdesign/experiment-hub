'use client';

import { useState } from 'react';
import Toast from '@/components/shared/Toast';
import Spinner from '@/components/shared/Spinner';
import PatternItem from '@/components/patterns/PatternItem';
import TemplateItem from '@/components/product-templates/TemplateItem';
import { Pattern, Template } from '@/types';
import PageHeader from '@/components/shared/PageHeader';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export default function DebugPage() {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  // Sample data for components
  const samplePattern: Pattern = {
    id: 'sample-pattern-1',
    name: 'Floral Embroidery Pattern',
    notes: 'A beautiful floral design perfect for beginners. Features roses, daisies, and leaves in a circular arrangement.',
    category: 'Floral',
    difficulty: 'beginner',
    style: 'Modern',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const samplePatternWithImage: Pattern = {
    id: 'sample-pattern-2',
    name: 'Geometric Mandala',
    notes: 'Intricate geometric pattern with mandala-inspired designs.',
    category: 'Geometric',
    difficulty: 'advanced',
    style: 'Traditional',
    imageUrl: '/uploads/patterns/sample.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleTemplate: Template = {
    id: 'sample-template-1',
    name: 'Single Digital Download',
    types: ['digital'],
    numberOfItems: 'single',
    patternIds: [],
    commonInstructions: 'Instant download after purchase. Includes PDF pattern file and instructions.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleTemplateWithImage: Template = {
    id: 'sample-template-2',
    name: '3-Pattern Bundle',
    types: ['digital'],
    numberOfItems: 'three',
    patternIds: [],
    commonInstructions: 'Bundle of three coordinating patterns. Great value!',
    imageUrl: '/uploads/templates/sample.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="px-4 py-8 max-w-7xl mx-auto">
        <PageHeader
          title="Component Debug"
          description="Sample instances of all common components"
        />

        <div className="space-y-12">
          {/* Toast Component */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Toast Component</h2>
            <p className="text-text-secondary mb-4">
              Toast notifications for success, error, and info messages.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => showToast('This is a success message!', 'success')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:opacity-90 transition"
              >
                Show Success Toast
              </button>
              <button
                onClick={() => showToast('This is an error message!', 'error')}
                className="px-4 py-2 bg-red-500 text-white rounded hover:opacity-90 transition"
              >
                Show Error Toast
              </button>
              <button
                onClick={() => showToast('This is an info message!', 'info')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:opacity-90 transition"
              >
                Show Info Toast
              </button>
            </div>
          </section>

          {/* Spinner Component */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Spinner Component</h2>
            <p className="text-text-secondary mb-4">
              Loading spinners in different sizes.
            </p>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-text-secondary">Small</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="md" />
                <span className="text-sm text-text-secondary">Medium</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <span className="text-sm text-text-secondary">Large</span>
              </div>
            </div>
          </section>

          {/* PatternItem Component */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">PatternItem Component</h2>
            <p className="text-text-secondary mb-4">
              Pattern item display with and without images.
            </p>
            <div className="space-y-6">
              <div className="bg-background-tertiary border border-border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3 text-text-secondary">With Details (No Image)</h3>
                <PatternItem pattern={samplePattern} showDetails={true} />
              </div>
              <div className="bg-background-tertiary border border-border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3 text-text-secondary">Without Details (No Image)</h3>
                <PatternItem pattern={samplePattern} showDetails={false} />
              </div>
              <div className="bg-background-tertiary border border-border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3 text-text-secondary">With Details (With Image)</h3>
                <PatternItem pattern={samplePatternWithImage} showDetails={true} />
              </div>
            </div>
          </section>

          {/* TemplateItem Component */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">TemplateItem Component</h2>
            <p className="text-text-secondary mb-4">
              Template item display with and without images.
            </p>
            <div className="space-y-6">
              <div className="bg-background-tertiary border border-border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3 text-text-secondary">With Details (No Image)</h3>
                <TemplateItem template={sampleTemplate} showDetails={true} />
              </div>
              <div className="bg-background-tertiary border border-border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3 text-text-secondary">Without Details (No Image)</h3>
                <TemplateItem template={sampleTemplate} showDetails={false} />
              </div>
              <div className="bg-background-tertiary border border-border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3 text-text-secondary">With Details (With Image)</h3>
                <TemplateItem template={sampleTemplateWithImage} showDetails={true} />
              </div>
            </div>
          </section>

          {/* Table Component */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Table Component</h2>
            <p className="text-text-secondary mb-4">
              Standard table styling used throughout the app.
            </p>
            <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-background-tertiary">
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Name</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Category</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Difficulty</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border hover:bg-background-tertiary transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-primary">Sample Pattern 1</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">Floral</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">Beginner</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full text-white bg-green-500">
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-border hover:bg-background-tertiary transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-primary">Sample Pattern 2</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">Geometric</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">Advanced</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full text-white bg-gray-500">
                          Draft
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-border hover:bg-background-tertiary transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-primary">Sample Pattern 3</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">Abstract</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">Intermediate</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full text-white bg-purple-500">
                          Listed
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Button Styles</h2>
            <p className="text-text-secondary mb-4">
              Common button styles used throughout the app.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="px-6 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition">
                Primary Button
              </button>
              <button className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition">
                Secondary Button
              </button>
              <button className="px-3 py-1.5 text-xs bg-background-tertiary border border-border rounded hover:bg-background-primary transition">
                Small Button
              </button>
              <button className="px-4 py-2 bg-background-tertiary border border-border rounded hover:bg-background-primary transition disabled:opacity-50" disabled>
                Disabled Button
              </button>
            </div>
          </section>

          {/* Status Badges */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Status Badges</h2>
            <p className="text-text-secondary mb-4">
              Status indicators used in tables and cards.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-2 py-1 text-xs font-medium rounded-full text-white bg-gray-500">
                Draft
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded-full text-white bg-green-500">
                Ready
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded-full text-white bg-purple-500">
                Listed
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded-full text-white bg-blue-500">
                Active
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded-full text-white bg-red-500">
                Error
              </span>
            </div>
          </section>

          {/* Cards */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Card Components</h2>
            <p className="text-text-secondary mb-4">
              Card styling used for sections and content blocks.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background-tertiary border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Card Title</h3>
                <p className="text-text-secondary text-sm">
                  This is a sample card with background-tertiary styling.
                </p>
              </div>
              <div className="bg-background-secondary border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Card Title</h3>
                <p className="text-text-secondary text-sm">
                  This is a sample card with background-secondary styling.
                </p>
              </div>
            </div>
          </section>

          {/* Form Elements */}
          <section className="bg-background-secondary border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Form Elements</h2>
            <p className="text-text-secondary mb-4">
              Input fields and form controls.
            </p>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Text Input
                </label>
                <input
                  type="text"
                  placeholder="Enter text..."
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Select Dropdown
                </label>
                <select className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary">
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Textarea
                </label>
                <textarea
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded text-text-primary"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}

