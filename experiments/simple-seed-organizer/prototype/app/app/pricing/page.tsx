"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getTierIndex } from "@/lib/plans";
import toast from "react-hot-toast";

const HOME_GARDEN_PRICE_ID =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY;

function PricingContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
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
    fetch("/api/stripe/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(
        "I'm having trouble reaching billing right now. Try reloading the page or waiting a few minutes.",
      );
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    if (!priceId) return;
    setLoadingPriceId(priceId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          customerEmail: user?.email ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(
        "I'm having trouble starting checkout right now. Try reloading the page or waiting a few minutes.",
      );
    } finally {
      setLoadingPriceId(null);
    }
  };

  const isLoadingPlans = authLoading || (user && subscriptionLoading);

  // "Paid" = a subscription whose price isn't in the current map; treat as Home Garden.
  const isOnPaid =
    getTierIndex(currentTier ?? "") > 0 || currentTier === "Paid";
  const isOnFree = !isOnPaid;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <Link
          href="/"
          className="text-sm text-[#16a34a] hover:underline mb-6 inline-block"
        >
          ← Back to app
        </Link>
        {isLoadingPlans ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#16a34a] border-t-transparent mb-4" />
            <p className="text-sm text-gray-500">Loading your plan…</p>
          </div>
        ) : (
          <>
            {reason === "seeds" && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <p className="font-medium">
                  You&apos;ve reached your seed limit.
                </p>
                <p className="text-sm mt-1">
                  Upgrade to add unlimited seed packets to your collection.
                </p>
              </div>
            )}
            {reason === "ai" && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <p className="font-medium">
                  You&apos;ve reached your AI extraction limit for this month.
                </p>
                <p className="text-sm mt-1">
                  Upgrade for more AI-powered packet extraction.
                </p>
              </div>
            )}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Simple pricing
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Start free. Upgrade to one simple plan when your collection
                outgrows it.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
              {/* Free tier */}
              <div
                className={`rounded-xl border-2 p-6 flex flex-col relative ${
                  isOnFree
                    ? "border-[#15803d] bg-[#dcfce7] ring-2 ring-[#16a34a] ring-offset-2 shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
              >
                {isOnFree && (
                  <span className="absolute -top-3 left-4 px-2.5 py-1 bg-[#15803d] text-white text-xs font-semibold rounded shadow-sm">
                    Current plan
                  </span>
                )}
                <h3 className="text-xl font-bold text-[#101828] mb-1">
                  Seed Stash Starter
                </h3>
                <p className="text-sm text-[#16a34a] font-semibold mb-4">
                  Free, forever
                </p>
                <ul className="space-y-2 text-sm text-gray-700 mb-6 flex-1">
                  <li className="flex gap-2">
                    <span className="text-[#16a34a] shrink-0">✓</span>
                    50 seed packets
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#16a34a] shrink-0">✓</span>
                    10 AI packets/month
                  </li>
                </ul>
                <p className="text-lg font-bold text-[#101828]">Free, forever</p>
                {isOnPaid && customerId ? (
                  <button
                    type="button"
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className="mt-4 py-3 text-center text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-70"
                  >
                    {portalLoading ? "Opening…" : "Switch to Seed Stash Starter"}
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="mt-4 block w-full py-3 text-center bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Back to app
                  </Link>
                )}
              </div>

              {/* Paid tier */}
              <div
                className={`rounded-xl border-2 p-6 flex flex-col relative ${
                  isOnPaid
                    ? "border-[#15803d] bg-[#dcfce7] ring-2 ring-[#16a34a] ring-offset-2 shadow-sm"
                    : "border-[#16a34a] bg-[#f0fdf4]"
                }`}
              >
                {isOnPaid && (
                  <span className="absolute -top-3 left-4 px-2.5 py-1 bg-[#15803d] text-white text-xs font-semibold rounded shadow-sm">
                    Current plan
                  </span>
                )}
                <h3 className="text-xl font-bold text-[#101828] mb-1">
                  Home Garden
                </h3>
                <p className="text-sm text-gray-600 mb-4">Everything unlocked</p>
                <ul className="space-y-2 text-sm text-gray-700 mb-6 flex-1">
                  <li className="flex gap-2">
                    <span className="text-[#16a34a] shrink-0">✓</span>
                    Unlimited seed packets
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#16a34a] shrink-0">✓</span>
                    100 AI packets/month
                  </li>
                </ul>
                <p className="text-lg font-bold text-[#101828] mb-4">
                  $15
                  <span className="text-sm font-normal text-gray-600">
                    /year
                  </span>
                </p>
                {isOnPaid ? (
                  customerId ? (
                    <button
                      type="button"
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                      className="mt-4 py-3 text-center text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-70"
                    >
                      {portalLoading ? "Opening…" : "Manage billing"}
                    </button>
                  ) : (
                    <p className="mt-4 py-3 text-center text-sm font-medium text-gray-500">
                      Current plan
                    </p>
                  )
                ) : HOME_GARDEN_PRICE_ID ? (
                  <button
                    type="button"
                    onClick={() => handleSubscribe(HOME_GARDEN_PRICE_ID)}
                    disabled={loadingPriceId === HOME_GARDEN_PRICE_ID}
                    className="mt-4 w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loadingPriceId === HOME_GARDEN_PRICE_ID
                      ? "Redirecting…"
                      : "Upgrade"}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
