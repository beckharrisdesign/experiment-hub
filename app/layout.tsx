import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
