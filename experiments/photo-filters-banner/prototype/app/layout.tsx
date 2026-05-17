import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photo banner studio",
  description: "Upload a photo, apply filters and banners, download PNG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
