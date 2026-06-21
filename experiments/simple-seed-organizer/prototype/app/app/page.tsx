"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Seed, ViewMode } from "@/types/seed";
import { getSeedsWithoutPhotos, getSeedPhotos } from "@/lib/storage";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { SeedList } from "@/components/SeedList";
import { BottomNav } from "@/components/BottomNav";
import { LandingPage } from "@/components/LandingPage";
import { SeedListEmptyState } from "@/components/SeedListEmptyState";
import { PlantNowBanner } from "@/components/PlantNowBanner";
import { SeedType } from "@/types/seed";
import { getSeedAge } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { seedMatchesSearch } from "@/lib/seedFieldRegistry";
import {
  trackSearchPerformed,
  trackSeedOpened,
  trackUseFirstFilter,
} from "@/lib/analytics";
import toast from "react-hot-toast";

const VALID_VIEW_MODES: ViewMode[] = ["type", "month", "age", "photo"];

/** Use-first rule: manually flagged, or 3+ seasons old by pack year. */
function isUseFirstSeed(seed: Seed): boolean {
  const age = getSeedAge(seed);
  return Boolean(seed.useFirst || (seed.year && age >= 3));
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    SeedType | "all" | "use-first"
  >("all");
  const [seedsLoading, setSeedsLoading] = useState(false);
  // Time-to-find instrumentation: marks when a search session began
  // (empty → typed) so we can report search→results and search→open timing.
  const searchStartRef = useRef<number | null>(null);
  const [usage, setUsage] = useState<{
    canAddSeed: boolean;
    canUseAI: boolean;
    seedCount?: number;
    seedLimit?: number | null;
    overSeedLimit?: boolean;
    resetsAt?: string;
  } | null>(null);

  // Sync viewMode with URL ?view= param for deep linking
  const viewParam = searchParams.get("view");
  const viewMode: ViewMode =
    viewParam && VALID_VIEW_MODES.includes(viewParam as ViewMode)
      ? (viewParam as ViewMode)
      : "type";

  const setViewMode = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (viewMode !== "photo") {
      setActiveFilter("all");
    }
  }, [viewMode]);

  useEffect(() => {
    if (!user) {
      setUsage(null);
      return;
    }
    fetch("/api/usage", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data) =>
          data &&
          setUsage({
            canAddSeed: data.canAddSeed,
            canUseAI: data.canUseAI,
            seedCount: data.seedCount,
            seedLimit: data.seedLimit,
            overSeedLimit: data.overSeedLimit,
            resetsAt: data.resetsAt,
          }),
      )
      .catch(() => setUsage(null));
  }, [user]);

  // New-user routing: users with <5 seeds land on /import once per session.
  // sessionStorage flag lets them navigate back to home freely afterward.
  useEffect(() => {
    if (!user || !usage || typeof usage.seedCount !== "number") return;
    if (usage.seedCount >= 5) return;
    const flag = `sso:newUserImportRouted:${user.id}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
    router.replace("/import");
  }, [user, usage, router]);

  // Load seeds from Supabase when user is authenticated
  useEffect(() => {
    if (!user) {
      setSeeds([]);
      setSeedsLoading(false);
      return;
    }

    let cancelled = false;

    const loadSeeds = async () => {
      setSeedsLoading(true);
      try {
        const seedsWithoutPhotos = await getSeedsWithoutPhotos();
        if (cancelled) return;
        setSeeds(seedsWithoutPhotos);
        setSeedsLoading(false);

        const photos = await getSeedPhotos();
        if (cancelled) return;
        setSeeds((prev) =>
          prev.map((seed) => {
            const collection = photos.get(seed.id);
            if (!collection) return seed;
            return { ...seed, photos: collection };
          }),
        );
      } catch (error) {
        if (cancelled) return;
        console.error("[Home] Error loading seeds:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load seeds";
        toast.error(
          "I'm having trouble loading your seeds right now. Try reloading the page or waiting a few minutes.",
        );
        setSeeds([]);
        setSeedsLoading(false);
      }
    };
    loadSeeds();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const availableTypes = useMemo(
    () =>
      new Set(
        seeds
          .map((s) => s.type)
          .filter((t): t is SeedType => !!t && t !== "other"),
      ),
    [seeds],
  );

  // Reset to "all" if the active type filter is no longer in the collection.
  useEffect(() => {
    if (activeFilter === "all" || activeFilter === "use-first") return;
    if (!availableTypes.has(activeFilter as SeedType)) {
      setActiveFilter("all");
    }
  }, [availableTypes, activeFilter]);

  const filteredSeeds = useMemo(() => {
    let filtered = seeds;

    if (activeFilter === "use-first") {
      filtered = filtered.filter(isUseFirstSeed);
    } else if (activeFilter !== "all") {
      filtered = filtered.filter((seed) => seed.type === activeFilter);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((seed) =>
        seedMatchesSearch(seed, searchQuery),
      );
    }

    return filtered;
  }, [seeds, searchQuery, activeFilter]);

  // Fire a single search_performed event once typing settles (PRD: time-to-find).
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const startedAt = searchStartRef.current ?? performance.now();
    const handle = setTimeout(() => {
      trackSearchPerformed({
        queryLength: q.length,
        resultCount: filteredSeeds.length,
        msToResults: performance.now() - startedAt,
      });
    }, 600);
    return () => clearTimeout(handle);
  }, [searchQuery, filteredSeeds.length]);

  const handleSearchChange = (value: string) => {
    if (value.trim() && searchStartRef.current === null) {
      searchStartRef.current = performance.now();
    } else if (!value.trim()) {
      searchStartRef.current = null;
    }
    setSearchQuery(value);
  };

  const handleFilterChange = (next: SeedType | "all" | "use-first") => {
    setActiveFilter(next);
    if (next === "use-first") {
      trackUseFirstFilter({ resultCount: seeds.filter(isUseFirstSeed).length });
    }
  };

  const handleSeedClick = (seed: Seed) => {
    const searching = searchQuery.trim().length > 0;
    trackSeedOpened({
      fromSearch: searching,
      msSinceSearchStart:
        searching && searchStartRef.current !== null
          ? performance.now() - searchStartRef.current
          : undefined,
    });
    router.push(`/seeds/${seed.id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center pt-[72px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen w-full bg-[#f3f4f6] flex flex-col">
      <main className="flex-1 w-full px-4 py-4 pt-24 pb-24 max-w-[1200px] mx-auto">
        {usage?.canAddSeed === false && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-amber-800 font-medium">
              {usage.seedLimit != null && usage.seedCount != null
                ? `You have ${usage.seedCount} seeds (limit ${usage.seedLimit}). Upgrade or remove some to add more.`
                : "You've reached your seed limit. Upgrade to add more seed packets to your collection."}
            </p>
            <Link
              href="/pricing?reason=seeds"
              className="shrink-0 px-4 py-2 bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors text-center"
            >
              Upgrade now
            </Link>
          </div>
        )}
        <PlantNowBanner seeds={seeds} />
        <div className="bg-white rounded-xl shadow-[0px_0px_54px_0px_rgba(0,0,0,0.08)] p-8">
          {seedsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#16a34a] border-t-transparent mb-4" />
              <p className="text-[#6a7282] text-sm">Fetching your seeds…</p>
            </div>
          ) : seeds.length === 0 ? (
            <SeedListEmptyState />
          ) : (
            <>
              <SearchBar value={searchQuery} onChange={handleSearchChange} />
              <div className="mt-3">
                <FilterBar
                  activeType={activeFilter}
                  onTypeChange={handleFilterChange}
                  availableTypes={availableTypes}
                />
              </div>
              <div className="mt-4">
                <SeedList
                  seeds={filteredSeeds}
                  viewMode={viewMode}
                  onSeedClick={handleSeedClick}
                  totalSeedCount={seeds.length}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <BottomNav
        activeView={viewMode}
        onViewChange={setViewMode}
        onAddClick={() => {
          router.push("/pricing?reason=seeds");
        }}
        canAddSeed={usage?.canAddSeed ?? true}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center pt-[72px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
