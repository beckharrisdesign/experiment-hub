import type { Metadata } from "next";
import Script from "next/script";
import { ELK_GOOGLE_ADS_ID } from "@/lib/analytics/ga";

/**
 * Etsy Listing Kit is its own product surface, not a hub page.
 *
 * Without this segment layout it inherits the root "BHD Labs — Manage product
 * experiments from idea to prototype" metadata, which is wrong three ways:
 *  1. it misdescribes the product to visitors arriving cold from a Google ad,
 *  2. it renders the wrong OG/Twitter card whenever the link is shared, and
 *  3. GA4 reads `document.title`, so every ELK pageview reported as "BHD Labs".
 *
 * The landing page itself is a client component and cannot export metadata, so
 * it lives here. Surface tagging for analytics is in lib/analytics/ga.ts.
 */
export const metadata: Metadata = {
  title: "Etsy Listing Kit — 6 Etsy-ready listing images from one design",
  description:
    "Drop in your embroidery design and get six shop-worthy Etsy listing photos — sized for Etsy and ready to post in minutes. $3 one-time, no subscription.",
  openGraph: {
    title: "Etsy Listing Kit — 6 Etsy-ready listing images from one design",
    description:
      "You made the design. We'll make it look good on Etsy. Six listing photos from one upload, $3 one-time.",
    type: "website",
    siteName: "Etsy Listing Kit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Etsy Listing Kit — 6 Etsy-ready listing images from one design",
    description:
      "You made the design. We'll make it look good on Etsy. Six listing photos from one upload, $3 one-time.",
  },
};

interface EtsyListingKitLayoutProps {
  children: React.ReactNode;
}

export default function EtsyListingKitLayout({
  children,
}: EtsyListingKitLayoutProps) {
  return (
    <>
      {/*
       * ELK's standalone Ads account, scoped to this segment (landing + result)
       * so hub pages never report into it. gtag.js itself is loaded by the root
       * layout; queuing onto dataLayer here is safe regardless of script order —
       * gtag.js drains the queue when it loads.
       */}
      <Script id="elk-google-ads" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('config', '${ELK_GOOGLE_ADS_ID}');
        `}
      </Script>
      {children}
    </>
  );
}
