"use client";

import { useState } from "react";

export interface PricingCardProps {
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
}

/**
 * Paid-tier pricing card (featured reference: Home Garden).
 *
 * @figma S8YJQugvMmn5jaRqwFM5XO:7:119
 * @figma S8YJQugvMmn5jaRqwFM5XO:80:1274 — “Most popular” badge frame (pricing parity pass 3)
 */
export function PricingCard({
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
}: PricingCardProps) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const priceId = billing === "monthly" ? priceIds.monthly : priceIds.yearly;
  const hasStripe = priceId;

  return (
    <div
      className={`rounded-xl border-2 p-6 flex flex-col relative ${
        highlight ? "border-[#16a34a] bg-[#f0fdf4]" : "border-gray-200 bg-white"
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
          onClick={() => setBilling("monthly")}
          className={`flex-1 py-1.5 text-sm font-medium rounded ${
            billing === "monthly"
              ? "bg-[#16a34a] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling("yearly")}
          className={`flex-1 py-1.5 text-sm font-medium rounded ${
            billing === "yearly"
              ? "bg-[#16a34a] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Yearly
        </button>
      </div>
      <p className="text-lg font-bold text-[#101828]">
        {billing === "monthly" ? monthlyPrice : yearlyPrice}
        <span className="text-sm font-normal text-gray-600">
          /{billing === "monthly" ? "month" : "year"}
        </span>
      </p>
      <p className="text-sm min-h-[1.25rem]">
        {billing === "yearly" ? (
          <span className="text-[#16a34a]">{yearlyDiscount}</span>
        ) : (
          "\u00A0"
        )}
      </p>
      {hasStripe ? (
        <button
          type="button"
          onClick={() => priceId && onSubscribe(priceId)}
          disabled={!priceId || loadingPriceId === priceId}
          className="mt-4 w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loadingPriceId === priceId ? "Redirecting…" : "Subscribe"}
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
