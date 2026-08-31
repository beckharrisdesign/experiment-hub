import type { Metadata } from "next";

/**
 * Post-purchase delivery page. Overrides the segment title so GA4 (which reads
 * `document.title`) can tell "landed on the landing page" apart from "reached
 * delivery" without parsing paths.
 *
 * noindex: the URL carries an order id and the page renders a buyer's paid
 * images — it must never end up in a search index.
 */
export const metadata: Metadata = {
  title: "Your listing images · Etsy Listing Kit",
  description: "Download your six Etsy-ready listing images.",
  robots: { index: false, follow: false },
};

interface EtsyListingKitResultLayoutProps {
  children: React.ReactNode;
}

export default function EtsyListingKitResultLayout({
  children,
}: EtsyListingKitResultLayoutProps) {
  return children;
}
