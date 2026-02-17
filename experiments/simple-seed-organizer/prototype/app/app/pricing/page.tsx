'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getTierIndex } from '@/lib/plans';
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

type PlanAction = 'current' | 'upgrade' | 'downgrade' | 'signup';

function PricingCard({
  title,
  subTitle,
  badge,
  highlight,
  isCurrentPlan,
  actionType,
  features,
  monthlyPrice,
  yearlyPrice,
  yearlyDiscount,
  priceIds,
  billing,
  onSubscribe,
  onOpenPortal,
  loadingPriceId,
  customerId,
  portalLoading = false,
}: {
  title: string;
  subTitle?: string;
  badge?: string;
  highlight?: boolean;
  isCurrentPlan?: boolean;
  actionType: PlanAction;
  features: string[];
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyDiscount: string;
  priceIds: { monthly?: string; yearly?: string };
  billing: 'monthly' | 'yearly';
  onSubscribe: (priceId: string) => void;
  onOpenPortal: () => void;
  loadingPriceId: string | null;
  customerId: string | null;
  portalLoading?: boolean;
}) {
  const priceId = billing === 'monthly' ? priceIds.monthly : priceIds.yearly;
  const hasStripe = priceId;

  return (
    <div
      className={`rounded-xl border-2 p-6 flex flex-col relative ${
        isCurrentPlan
          ? 'border-[#15803d] bg-[#dcfce7] ring-2 ring-[#16a34a] ring-offset-2 shadow-sm'
          : highlight
            ? 'border-[#16a34a] bg-[#f0fdf4]'
            : 'border-gray-200 bg-white'
      }`}
    >
      {isCurrentPlan && (
        <span className="absolute -top-3 left-4 px-2.5 py-1 bg-[#15803d] text-white text-xs font-semibold rounded shadow-sm">
          Current plan
        </span>
      )}
      {badge && !isCurrentPlan && (
        <span className="absolute -top-3 left-4 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded border border-gray-200">
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
      <p className="text-lg font-bold text-[#101828]">
        {billing === 'monthly' ? monthlyPrice : yearlyPrice}
        <span className="text-sm font-normal text-gray-600">/{billing === 'monthly' ? 'month' : 'year'}</span>
      </p>
      <p className="text-sm min-h-[1.25rem]">
        {billing === 'yearly' ? <span className="text-[#16a34a]">{yearlyDiscount}</span> : '\u00A0'}
      </p>
      {actionType === 'current' ? (
        customerId ? (
          <p className="mt-4 py-3 text-center text-sm font-medium text-gray-500">Current plan</p>
        ) : (
          <Link href="/" className="mt-4 py-3 block text-center text-xs text-gray-500 hover:text-gray-700 hover:underline">
            Back to app
          </Link>
        )
      ) : actionType === 'upgrade' && hasStripe ? (
        <button
          type="button"
          onClick={() => priceId && onSubscribe(priceId)}
          disabled={!priceId || loadingPriceId === priceId}
          className="mt-4 w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loadingPriceId === priceId ? 'Redirecting…' : 'Upgrade'}
        </button>
      ) : actionType === 'downgrade' && customerId ? (
        <button
          type="button"
          onClick={onOpenPortal}
          disabled={portalLoading}
          className="mt-4 py-3 text-center text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-70"
        >
          {portalLoading ? 'Opening…' : `Switch to ${title}`}
        </button>
      ) : actionType === 'downgrade' ? (
        <Link href="/" className="mt-4 py-3 block text-center text-xs text-gray-500 hover:text-gray-700 hover:underline">
          Switch to {title}
        </Link>
      ) : hasStripe ? (
        <button
          type="button"
          onClick={() => priceId && onSubscribe(priceId)}
          disabled={!priceId || loadingPriceId === priceId}
          className="mt-4 w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loadingPriceId === priceId ? 'Redirecting…' : 'Upgrade'}
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

function PricingContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setCurrentTier(null);
      setCustomerId(null);
      setSubscriptionLoading(false);
      return;
    }
    setSubscriptionLoading(true);
    fetch('/api/stripe/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
      .then((res) => res.json())
      .then((data) => {
        setCurrentTier(data.tier ?? null);
        setCustomerId(data.customerId ?? null);
      })
      .catch(() => {
        setCurrentTier(null);
        setCustomerId(null);
      })
      .finally(() => setSubscriptionLoading(false));
  }, [user?.email]);

  const handleOpenPortal = async () => {
    if (!customerId) return;
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open billing');
    } finally {
      setPortalLoading(false);
    }
  };

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

  const isLoadingPlans = authLoading || (user && subscriptionLoading);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <Link href="/" className="text-sm text-[#16a34a] hover:underline mb-6 inline-block">
          ← Back to app
        </Link>
        {isLoadingPlans ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#16a34a] border-t-transparent mb-4" />
            <p className="text-sm text-gray-500">Loading your plan…</p>
          </div>
        ) : (
        <>
        {reason === 'seeds' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <p className="font-medium">You&apos;ve reached your seed limit.</p>
            <p className="text-sm mt-1">Upgrade to add more seed packets to your collection.</p>
          </div>
        )}
        {reason === 'ai' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <p className="font-medium">You&apos;ve reached your AI extraction limit for this month.</p>
            <p className="text-sm mt-1">Upgrade for more AI-powered packet extraction.</p>
          </div>
        )}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Choose your plan</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Start free, upgrade when you need more seed packets or AI help.
          </p>
          <div className="inline-flex p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billing === 'monthly' ? 'bg-white text-[#101828] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billing === 'yearly' ? 'bg-white text-[#101828] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-[#16a34a] font-medium">Save up to 20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {(() => {
            const currentIdx = getTierIndex(currentTier ?? '');
            const starterAction: PlanAction =
              currentTier === 'Seed Stash Starter' ? 'current' : currentIdx > 0 ? 'downgrade' : 'signup';
            return (
              <div
                className={`rounded-xl border-2 p-6 flex flex-col relative ${
                  currentTier === 'Seed Stash Starter'
                    ? 'border-[#15803d] bg-[#dcfce7] ring-2 ring-[#16a34a] ring-offset-2 shadow-sm'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {currentTier === 'Seed Stash Starter' && (
                  <span className="absolute -top-3 left-4 px-2.5 py-1 bg-[#15803d] text-white text-xs font-semibold rounded shadow-sm">
                    Current plan
                  </span>
                )}
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
                {starterAction === 'current' ? (
                  <Link href="/" className="mt-4 py-3 block text-center text-xs text-gray-500 hover:text-gray-700 hover:underline">
                    Back to app
                  </Link>
                ) : starterAction === 'downgrade' && customerId ? (
                  <button
                    type="button"
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className="mt-4 py-3 text-center text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-70"
                  >
                    {portalLoading ? 'Opening…' : 'Switch to Seed Stash Starter'}
                  </button>
                ) : starterAction === 'downgrade' ? (
                  <Link href="/" className="mt-4 py-3 block text-center text-xs text-gray-500 hover:text-gray-700 hover:underline">
                    Switch to Seed Stash Starter
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="mt-4 block w-full py-3 text-center bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Back to app
                  </Link>
                )}
              </div>
            );
          })()}

          {(() => {
            const currentIdx = getTierIndex(currentTier ?? '');
            const homeAction: PlanAction =
              currentTier === 'Home Garden' || currentTier === 'Paid'
                ? 'current'
                : currentIdx > 1
                  ? 'downgrade'
                  : currentIdx < 1
                    ? 'upgrade'
                    : 'signup';
            return (
              <PricingCard
                title="Home Garden"
                subTitle="Seed + Planting Calendar"
                badge="Most popular"
                highlight
                isCurrentPlan={currentTier === 'Home Garden' || currentTier === 'Paid'}
                actionType={homeAction}
                features={['300 seed packets', '20 AI packets/month']}
                monthlyPrice="$5"
                yearlyPrice="$49"
                yearlyDiscount="18% off"
                priceIds={PRICE_IDS.homeGarden}
                billing={billing}
                onSubscribe={handleSubscribe}
                onOpenPortal={handleOpenPortal}
                loadingPriceId={loadingPriceId}
                customerId={customerId}
                portalLoading={portalLoading}
              />
            );
          })()}

          {(() => {
            const currentIdx = getTierIndex(currentTier ?? '');
            const hobbyAction: PlanAction =
              currentTier === 'Serious Hobby' ? 'current' : currentIdx < 2 ? 'upgrade' : 'signup';
            return (
              <PricingCard
                title="Serious Hobby"
                subTitle="Succession & Microclimate"
                isCurrentPlan={currentTier === 'Serious Hobby'}
                actionType={hobbyAction}
                features={['Unlimited seed packets', 'Unlimited AI packets/month']}
                monthlyPrice="$15"
                yearlyPrice="$144"
                yearlyDiscount="20% off"
                priceIds={PRICE_IDS.seriousHobby}
                billing={billing}
                onSubscribe={handleSubscribe}
                onOpenPortal={handleOpenPortal}
                loadingPriceId={loadingPriceId}
                customerId={customerId}
                portalLoading={portalLoading}
              />
            );
          })()}
        </div>

        {customerId && (currentTier === 'Home Garden' || currentTier === 'Paid' || currentTier === 'Serious Hobby') && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={portalLoading}
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-70"
            >
              {portalLoading ? 'Opening…' : 'Take a break'}
            </button>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
