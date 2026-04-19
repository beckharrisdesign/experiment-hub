"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BatchImport } from "@/components/BatchImport";
import { useState, useEffect } from "react";

export default function ImportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userTier, setUserTier] = useState<string>("Seed Stash Starter");
  const [canUseAI, setCanUseAI] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/usage", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUserTier(data.tier);
          setCanUseAI(data.canUseAI);
        }
      })
      .catch((err) => console.error("Failed to fetch usage:", err));
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <BatchImport userId={user.id} userTier={userTier} canUseAI={canUseAI} />
  );
}
