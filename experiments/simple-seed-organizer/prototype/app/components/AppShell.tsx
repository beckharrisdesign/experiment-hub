"use client";

import { Header } from "@/components/Header";
import { LandingFooter } from "@/components/LandingFooter";
import { useAuth } from "@/lib/auth-context";

/** @figma S8YJQugvMmn5jaRqwFM5XO:21:4993 */
interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header showProfileLink={!!user} />
      <div className="flex-1 flex flex-col bg-[#f9fafb]">{children}</div>
      {!loading && !user && <LandingFooter />}
    </div>
  );
}
