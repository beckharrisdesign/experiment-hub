'use client';

import { useState } from 'react';
import { AuthForm } from './AuthForm';
import { useAuth } from '@/lib/auth-context';

function PricingCard({
  title,
  subTitle,
  badge,
  highlight,
  features,
  monthlyPrice,
  yearlyPrice,
  yearlyDiscount,
  priceIds,
  onSubscribe,
  loadingPriceId,
}: {
  title: string;
  subTitle?: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyDiscount: string;
  priceIds: { monthly?: string; yearly?: string };
  onSubscribe: (priceId: string) => void;
  loadingPriceId: string | null;
}) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const priceId = billing === 'monthly' ? priceIds.monthly : priceIds.yearly;
  const hasStripe = priceId;

  return (
    <div
      className={`rounded-xl border-2 p-6 flex flex-col relative ${
        highlight ? 'border-[#16a34a] bg-[#f0fdf4]' : 'border-gray-200 bg-white'
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-4 px-2 py-0.5 bg-[#16a34a] text-white text-xs font-medium rounded">
          {badge}
        </span>
      )}
      <h3 className="text-xl font-bold text-[#101828] mb-1">{title}</h3>
      {subTitle && <p className="text-sm text-gray-600 mb-4">{subTitle}</p>}
      <ul className="space-y-2 text-sm text-gray-700 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-[#16a34a] shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setBilling('monthly')}
          className={`flex-1 py-1.5 text-sm font-medium rounded ${
            billing === 'monthly' ? 'bg-[#16a34a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling('yearly')}
          className={`flex-1 py-1.5 text-sm font-medium rounded ${
            billing === 'yearly' ? 'bg-[#16a34a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Yearly
        </button>
      </div>
      <p className="text-lg font-bold text-[#101828]">
        {billing === 'monthly' ? monthlyPrice : yearlyPrice}
        <span className="text-sm font-normal text-gray-600">/{billing === 'monthly' ? 'month' : 'year'}</span>
      </p>
      <p className="text-sm min-h-[1.25rem]">
        {billing === 'yearly' ? <span className="text-[#16a34a]">{yearlyDiscount}</span> : '\u00A0'}
      </p>
      {hasStripe ? (
        <button
          type="button"
          onClick={() => priceId && onSubscribe(priceId)}
          disabled={!priceId || loadingPriceId === priceId}
          className="mt-4 w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loadingPriceId === priceId ? 'Redirecting…' : 'Subscribe'}
        </button>
      ) : (
        <a
          href="#signup"
          className="mt-4 block w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors"
        >
          Get started
        </a>
      )}
    </div>
  );
}

const PRICE_IDS = {
  homeGarden: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY,
  },
  seriousHobby: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_YEARLY,
  },
};

export function LandingPage() {
  const { user } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    if (!priceId) return;
    setLoadingPriceId(priceId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          customerEmail: user?.email ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoadingPriceId(null);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Hero Section */}
      <section id="hero" className="py-16 md:py-24 lg:py-32 relative overflow-hidden bg-[#166534]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#86efac] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#bbf7d0] rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
            Your simple seed inventory & <span className="text-[#bbf7d0]">&apos;use-first&apos; list</span>, on your phone.
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto">
            No garden planning. No calendars. Just store your seed info and get it back when you need it.
          </p>
          <a
            href="#signup"
            className="inline-block bg-white hover:bg-gray-100 text-[#166534] font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
          >
            Get started
          </a>
          <p className="mt-4 text-sm text-gray-300">Free to use. Enter your email and password to get started.</p>
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
              <div className="w-16 h-16 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Rebuying duplicates</h3>
              <p className="text-gray-600 text-sm">
                Can&apos;t remember what you own, so you buy the same seeds again.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Lost seed info</h3>
              <p className="text-gray-600 text-sm">
                Can&apos;t find planting depth or spacing when you need it.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Wasted seeds</h3>
              <p className="text-gray-600 text-sm">
                Don&apos;t know which are still viable, so old packets go unused.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simplicity message */}
      <section className="py-16 md:py-24 bg-[#166534]">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-white text-xl md:text-2xl text-center">
            <span className="font-bold">No garden planning.</span> No calendars. No design tools.
            <br />
            <span className="text-[#bbf7d0]">Just your seed inventory, simple and fast.</span>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-16 bg-gradient-to-b from-white to-gray-50 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The simplest way to track your seed collection
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#dcfce7] rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl mb-2">Quick Inventory</h3>
              <p className="text-gray-600 text-sm">
                Add seeds in seconds. Just name, variety, and source. Add details later if you want.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#dcfce7] rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl mb-2">Instant Search</h3>
              <p className="text-gray-600 text-sm">
                Find any seed in under 10 seconds. Search by name, variety, or category.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#dcfce7] rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl mb-2">Use-First List</h3>
              <p className="text-gray-600 text-sm">
                See which seeds are expiring soon, so you use them before they go bad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-4 py-16 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple plans for real‑life gardeners</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start free, stay free as long as you like, and only upgrade if you need a little extra help.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Seed Stash Starter – Free */}
            <div className="rounded-xl border-2 border-gray-200 bg-white p-6 flex flex-col">
              <h3 className="text-xl font-bold text-[#101828] mb-1">Seed Stash Starter</h3>
              <p className="text-sm text-[#16a34a] font-semibold mb-4">Free, forever</p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6 flex-1">
                <li className="flex gap-2">
                  <span className="text-[#16a34a] shrink-0">✓</span>
                  50 seed packets
                </li>
                <li className="flex gap-2">
                  <span className="text-[#16a34a] shrink-0">✓</span>
                  5 AI packets/month
                </li>
              </ul>
              <p className="text-lg font-bold text-[#101828]">Free, forever</p>
              <a
                href="#signup"
                className="mt-4 block w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors"
              >
                Get started
              </a>
            </div>

            {/* Home Garden */}
            <PricingCard
              title="Home Garden"
              subTitle="Seed + Planting Calendar"
              badge="Most popular"
              highlight
              features={['300 seed packets', '20 AI packets/month']}
              monthlyPrice="$5"
              yearlyPrice="$49"
              yearlyDiscount="18% off"
              priceIds={PRICE_IDS.homeGarden}
              onSubscribe={handleSubscribe}
              loadingPriceId={loadingPriceId}
            />

            {/* Serious Hobby */}
            <PricingCard
              title="Serious Hobby"
              subTitle="Succession & Microclimate"
              features={['Unlimited seed packets', 'Unlimited AI packets/month']}
              monthlyPrice="$15"
              yearlyPrice="$144"
              yearlyDiscount="20% off"
              priceIds={PRICE_IDS.seriousHobby}
              onSubscribe={handleSubscribe}
              loadingPriceId={loadingPriceId}
            />
          </div>
        </div>
      </section>

      {/* Auth - one form for new and returning users */}
      <section id="signup" className="px-4 py-16 bg-gray-50 scroll-mt-20">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Get started for free</h2>
            <p className="text-gray-600">
              Enter your email and password. Same flow for new and returning users.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <AuthForm onSuccess={() => {}} embedded />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 bg-gray-800 text-gray-400">
        <div className="max-w-4xl mx-auto text-center">
          <p className="mb-4">© 2025 Simple Seed Organizer. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-[#86efac] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#86efac] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#86efac] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
