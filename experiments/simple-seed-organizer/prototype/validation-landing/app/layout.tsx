import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Seed Organizer - Your Simple Seed Inventory on Your Phone",
  description: "No garden planning. No calendars. Just store your seed info and get it back when you need it. Get early access for $12/year.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
