"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { LandingFeaturesSection } from "./LandingFeaturesSection";
import { LandingHero } from "./LandingHero";
import { LandingPricingSection } from "./LandingPricingSection";
import { LandingProblemSection } from "./LandingProblemSection";
import { LandingSignupSection } from "./LandingSignupSection";
import { LandingFooter } from "./LandingFooter";

/** @figma S8YJQugvMmn5jaRqwFM5XO:18:2709 */
export function LandingPage() {
  const { user } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

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
    } catch {
      toast.error(
        "I'm having trouble starting checkout right now. Try reloading the page or waiting a few minutes.",
      );
    } finally {
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white text-gray-900">
      <LandingHero />
      <LandingFeaturesSection />
      <LandingPricingSection
        onSubscribe={handleSubscribe}
        loadingPriceId={loadingPriceId}
      />
      <LandingProblemSection />
      <LandingSignupSection />

      <LandingFooter />
    </div>
  );
}
