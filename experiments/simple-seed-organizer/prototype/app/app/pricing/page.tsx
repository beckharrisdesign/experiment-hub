'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
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
        <Link
          href="/#signup"
          className="mt-4 block w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors"
        >
          Get started
        </Link>
      )}
    </div>
  );
}

export default function PricingPage() {
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
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <Link href="/" className="text-sm text-[#16a34a] hover:underline mb-6 inline-block">
          ← Back to app
        </Link>
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Choose your plan</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free, upgrade when you need more seed packets or AI help.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
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
            <Link
              href="/"
              className="mt-4 block w-full py-3 text-center bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to app
            </Link>
          </div>

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
    </div>
  );
}
