"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { LandingFeaturesSection } from "./LandingFeaturesSection";
import { LandingHero } from "./LandingHero";
import { LandingPricingSection } from "./LandingPricingSection";
import { LandingProblemSection } from "./LandingProblemSection";
import { LandingSignupSection } from "./LandingSignupSection";

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

      <footer className="px-4 py-8 bg-gray-800 text-gray-400">
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="mb-4">
            © 2026 Simple Seed Organizer. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-[#86efac] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[#86efac] transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-[#86efac] transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
