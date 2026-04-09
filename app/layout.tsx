import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { getHubGaMeasurementId } from "@/lib/analytics/ga";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["500", "600", "700"],
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
