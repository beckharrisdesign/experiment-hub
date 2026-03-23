import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { AppToaster } from "@/components/AppToaster";

const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://simple-seed-organizer.vercel.app';

export const metadata: Metadata = {
  title: {
    default: "Simple Seed Organizer",
    template: "%s | Simple Seed Organizer",
  },
  description:
    "The simplest way to track your seed collection. Know what you own, what's still viable, and avoid rebuying seeds you already have.",
  keywords: ["seed organizer", "seed inventory", "seed tracker", "home gardening", "seed collection"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName: "Simple Seed Organizer",
    title: "Simple Seed Organizer",
    description:
      "The simplest way to track your seed collection. Know what you own, what's still viable, and avoid rebuying seeds you already have.",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "Simple Seed Organizer",
    description:
      "The simplest way to track your seed collection. Know what you own, what's still viable, and avoid rebuying seeds you already have.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Seed Organizer",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#166534",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {GA_ID && (
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
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        <AuthProvider>
          <AppShell>
            <div id="app-container">{children}</div>
          </AppShell>
          <AppToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
