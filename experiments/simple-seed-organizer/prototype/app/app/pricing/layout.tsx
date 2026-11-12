import type { Metadata } from "next";

// The pricing page is a client component, so its metadata lives here.
export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
