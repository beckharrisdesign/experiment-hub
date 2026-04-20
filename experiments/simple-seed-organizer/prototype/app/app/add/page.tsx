"use client";

import { useRouter } from "next/navigation";
import { AddSeedForm } from "@/components/AddSeedForm";
import { useAuth } from "@/lib/auth-context";
import { saveSeed } from "@/lib/storage";
import { Seed } from "@/types/seed";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function AddSeedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userTier, setUserTier] = useState<string>("Seed Stash Starter");
  const [canUseAI, setCanUseAI] = useState(true);
  const [resetsAt, setResetsAt] = useState<string | undefined>();
  const [savedSeed, setSavedSeed] = useState<Seed | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/usage", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUserTier(data.tier);
          setCanUseAI(data.canUseAI);
          setResetsAt(data.resetsAt);
        }
      })
      .catch((err) => console.error("Failed to fetch usage:", err));
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center pt-[72px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const handleSubmit = async (
    seedData: Omit<Seed, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) => {
    try {
      const newSeed = await saveSeed(seedData);
      setSavedSeed(newSeed);
    } catch (error) {
      console.error("[AddSeedPage] Error saving seed:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save seed to database";
      toast.error(
        "I'm having trouble saving your seed right now. Your info is still here — try again in a moment.",
      );
    }
  };

  if (savedSeed) {
    const label =
      savedSeed.variety && savedSeed.variety !== savedSeed.name
        ? savedSeed.variety
        : savedSeed.name;
    return (
      <div className="min-h-screen w-full bg-[#f9fafb] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#dcfce7] flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[#16a34a]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#4a5565] mb-1">
            You added {label}
          </h2>
          <p className="text-sm text-[#99a1af] mb-8">
            It's in your collection now
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSavedSeed(null)}
              className="w-full py-3 bg-[#16a34a] text-white font-semibold rounded-xl hover:bg-[#15803d] transition-colors"
            >
              Add another
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 text-[#6a7282] font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col pt-20 pb-24">
      <AddSeedForm
        userId={user.id}
        userTier={userTier}
        canUseAI={canUseAI}
        resetsAt={resetsAt}
        onSubmit={handleSubmit}
        onClose={() => router.push("/")}
        asPage
      />
    </div>
  );
}
