import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import Script from "next/script";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { getHubGaMeasurementId, GOOGLE_ADS_ID } from "@/lib/analytics/ga";
import "./globals.css";

// Self-hosted rather than fetched from Google at build time. `next/font/google`
// downloads its files during `next build`, so a transient Google Fonts blip
// fails the whole production build — which is how the deploy of d263f99 (#518)
// died on a PR that touched no fonts at all. That now also blocks portfolio CSS
// from shipping, since beckharrisdesign.com loads public/super/site.css off this
// same project. The files live in app/fonts/, vendored and checksummed by
// scripts/fonts/vendor.mjs; run it to pick up a new upstream version.
//
// Both are variable fonts covering 100..900, so the weight range replaces the
// per-weight list the Google loader took and every weight the hub uses is in
// the one file.
const inter = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  style: "normal",
  // Matches Google's own metric fallback for Inter, so layout does not shift
  // when the real file lands.
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "sans-serif"],
});

const fraunces = localFont({
  src: "./fonts/fraunces-latin-variable.woff2",
  variable: "--font-fraunces",
  display: "swap",
  weight: "100 900",
  style: "normal",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: "BHD Labs",
  description: "Manage product experiments from idea to prototype",
  openGraph: {
    title: "BHD Labs",
    description: "Manage product experiments from idea to prototype",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BHD Labs",
    description: "Manage product experiments from idea to prototype",
  },
};

// themeColor belongs in the viewport export, not metadata — Next ignored it here
// and logged an "Unsupported metadata themeColor" warning on every render, so the
// theme-color meta tag was never actually emitted.
export const viewport: Viewport = {
  themeColor: "#113723",
};

const GA_ID = getHubGaMeasurementId();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: false });
                gtag('config', '${GOOGLE_ADS_ID}');
              `}
            </Script>
            <Suspense fallback={null}>
              <AnalyticsTracker />
            </Suspense>
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}
