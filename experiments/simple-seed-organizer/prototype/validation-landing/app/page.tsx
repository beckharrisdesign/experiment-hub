'use client';

import { useState } from 'react';
import { SeedListMockup, SearchMockup, UseFirstListMockup, SeedDetailMockup, SeedListDesktopMockup } from '@/components/Mockups';

export default function LandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    seedCount: '',
    challenge: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to email service (Mailchimp, ConvertKit, etc.)
    // For now, just log and show success
    console.log('Form submitted:', formData);
    setSubmitted(true);
    
    // Track conversion in analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'form_submission', {
        event_category: 'engagement',
        event_label: 'early_access_signup',
      });
    }
  };

  const handleCtaClick = () => {
    setShowForm(true);
    // Track CTA click
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'cta_click', {
        event_category: 'engagement',
        event_label: 'get_early_access',
      });
    }
    // Scroll to form
    setTimeout(() => {
      document.getElementById('interest-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleChallengeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      challenge: prev.challenge.includes(value)
        ? prev.challenge.filter(c => c !== value)
        : [...prev.challenge, value],
    }));
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Persistent Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-semibold text-lg text-gray-900">Simple Seed Organizer</span>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => scrollToSection('problem')}
                className="text-gray-600 hover:text-primary-600 transition-colors text-sm font-medium"
              >
                Problem
              </button>
              <button
                onClick={() => scrollToSection('solution')}
                className="text-gray-600 hover:text-primary-600 transition-colors text-sm font-medium"
              >
                Solution
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-gray-600 hover:text-primary-600 transition-colors text-sm font-medium"
              >
                Pricing
              </button>
              <button
                onClick={handleCtaClick}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Get Early Access
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={handleCtaClick}
              className="md:hidden bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
            >
              Get Access
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="px-4 py-16 md:py-24 lg:py-32 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-200 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
            Your simple seed inventory &{' '}
            <span className="text-primary-600">'use-first' list</span>, on your phone.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            No garden planning. No calendars. Just store your seed info and get it back when you need it.
          </p>
          <button
            onClick={handleCtaClick}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
          >
            Get Early Access for $12/year
          </button>
          <p className="mt-4 text-sm text-gray-500">No credit card required to join the list</p>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="px-4 py-16 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            Stop rebuying seeds you already have.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Rebuying duplicates</h3>
              <p className="text-gray-600 text-sm">
                Can't remember what you own, so you buy the same seeds again.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Lost seed info</h3>
              <p className="text-gray-600 text-sm">
                Can't find planting depth or spacing when you need it.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Wasted seeds</h3>
              <p className="text-gray-600 text-sm">
                Don't know which are still viable, so old packets go unused.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="px-4 py-16 bg-gradient-to-b from-white to-gray-50 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple Seed Organizer: Just your seeds, nothing else.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The simplest way to track your seed collection. Store, search, and prioritize—all on your phone.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
            {/* Left: Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Quick Inventory</h3>
                  <p className="text-gray-600 text-sm">
                    Add seeds in seconds. Just name, variety, and source. Add details later if you want.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Instant Search</h3>
                  <p className="text-gray-600 text-sm">
                    Find any seed in under 10 seconds. Search by name, variety, or category.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Use-First List</h3>
                  <p className="text-gray-600 text-sm">
                    See which seeds are expiring soon, so you use them before they go bad.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right: App Mockups */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-6">
                {/* Mobile mockups - uniform containers */}
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 flex items-center justify-center overflow-hidden" style={{ height: '400px' }}>
                  <div className="transform hover:scale-105 transition-transform opacity-90">
                    <SeedListMockup />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 flex items-center justify-center overflow-hidden" style={{ height: '400px' }}>
                  <div className="transform hover:scale-105 transition-transform opacity-90">
                    <SearchMockup />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 flex items-center justify-center overflow-hidden" style={{ height: '400px' }}>
                  <div className="transform hover:scale-105 transition-transform opacity-90">
                    <UseFirstListMockup />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 flex items-center justify-center overflow-hidden" style={{ height: '400px' }}>
                  <div className="transform hover:scale-105 transition-transform opacity-90">
                    <SeedDetailMockup />
                  </div>
                </div>
                
                {/* Desktop mockup spans 2 columns */}
                <div className="col-span-2 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 flex items-center justify-center overflow-hidden" style={{ height: '400px' }}>
                  <div className="w-full max-w-5xl transform hover:scale-[1.02] transition-transform opacity-90">
                    <SeedListDesktopMockup />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Simplicity message */}
          <div className="bg-white border-2 border-primary-100 rounded-xl p-6 text-center">
            <p className="text-gray-700 text-lg">
              <span className="font-semibold">No garden planning.</span> No calendars. No design tools.
              <br />
              <span className="text-primary-600">Just your seed inventory, simple and fast.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-4 py-16 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple pricing. No surprises.</h2>
          <div className="text-5xl font-bold text-primary-600 mb-2">$12/year</div>
          <p className="text-lg text-gray-600 mb-12">Less than $1/month for a tool that saves you time and money.</p>
          
          <div className="bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-xl p-8 max-w-lg mx-auto mb-12">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">Unlimited seeds</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">Mobile & web</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">No ads</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">No upsells</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCtaClick}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
          >
            Get Early Access for $12/year
          </button>
        </div>
      </section>

      {/* Interest Form */}
      <section id="interest-form" className="px-4 py-16 bg-gradient-to-b from-gray-50 to-white scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          {!submitted ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Early Access</h2>
                <p className="text-lg text-gray-600">
                  We're building Simple Seed Organizer now. Join the list to be notified when it's ready.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="bg-white border border-primary-100 p-8 rounded-xl shadow-sm">
                <div className="mb-6">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                  />
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    How many seed packets do you own? (optional)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'less-than-20', label: 'Just a few', emoji: '🌱' },
                      { value: '20-50', label: 'A respectable collection', emoji: '🌿' },
                      { value: '50-plus', label: 'I have a problem', emoji: '🌳' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, seedCount: option.value })}
                        className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                          formData.seedCount === option.value
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                        }`}
                      >
                        <span className="text-lg mr-1">{option.emoji}</span>
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    What's your biggest seed organizing challenge? (optional)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Buying duplicates', emoji: '🛒' },
                      { label: 'Lost the packet', emoji: '🔍' },
                      { label: 'Are these still good?', emoji: '❓' },
                    ].map((challenge) => (
                      <button
                        key={challenge.label}
                        type="button"
                        onClick={() => handleChallengeChange(challenge.label)}
                        className={`px-3 py-3 rounded-lg border-2 font-medium transition-all text-xs ${
                          formData.challenge.includes(challenge.label)
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg">{challenge.emoji}</span>
                          <span>{challenge.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Join the Early Access List
                </button>

                <p className="mt-4 text-sm text-gray-500 text-center">
                  We respect your privacy. We'll only email you about Simple Seed Organizer. Unsubscribe anytime.
                </p>
              </form>
            </>
          ) : (
            <div className="bg-gradient-to-br from-primary-50 to-white border-2 border-primary-200 p-12 rounded-xl text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">Thanks! 🎉</h2>
              <p className="text-lg mb-4 text-gray-700">
                We'll email you when Simple Seed Organizer is ready.
              </p>
              <p className="text-gray-600">
                In the meantime, what would make this tool most useful for you?
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 bg-gray-800 text-gray-400">
        <div className="max-w-4xl mx-auto text-center">
          <p className="mb-4">© 2025 Simple Seed Organizer. All rights reserved.</p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
