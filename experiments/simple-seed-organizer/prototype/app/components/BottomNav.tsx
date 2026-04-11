"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ViewMode } from "@/types/seed";

interface BottomNavProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onAddClick: () => void;
  /** When false, Add button is disabled and shows upgrade state */
  canAddSeed?: boolean;
}

export function BottomNav({
  activeView,
  onViewChange,
  onAddClick,
  canAddSeed = true,
}: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const allNavItems: {
    view: ViewMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      view: "type",
      label: "Type",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
      ),
    },
    {
      view: "month",
      label: "Month",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      view: "age",
      label: "Age",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      view: "photo",
      label: "Photos",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  // Temporarily hide Month and Age tabs (zone/zip/planting guidance not in use)
  const navItems = allNavItems.filter(
    (item) => item.view !== "month" && item.view !== "age",
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-center z-50 md:px-6 lg:px-8">
      <div className="flex gap-6 items-center w-full max-w-7xl justify-center">
        {navItems[0] && (
          <button
            onClick={() => onViewChange(navItems[0].view)}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${
              activeView === navItems[0].view
                ? "text-[#16a34a]"
                : "text-[#6a7282]"
            }`}
          >
            {navItems[0].icon}
            <span className="text-xs font-medium">{navItems[0].label}</span>
          </button>
        )}

        {/* Add Button with popup menu */}
        <div className="relative">
          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              {/* Menu */}
              <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-56">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/import");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg
                    className="w-5 h-5 text-[#16a34a] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-[#4a5565]">
                      Bulk photograph
                    </div>
                    <div className="text-xs text-[#99a1af]">
                      Front &amp; back, one by one
                    </div>
                  </div>
                </button>
                <div className="h-px bg-gray-100 mx-4" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/import");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg
                    className="w-5 h-5 text-[#4a5565] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-[#4a5565]">
                      Pile scan
                    </div>
                    <div className="text-xs text-[#99a1af]">
                      Many packets at once
                    </div>
                  </div>
                </button>
                <div className="h-px bg-gray-100 mx-4" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/import");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg
                    className="w-5 h-5 text-[#4a5565] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-[#4a5565]">
                      Upload photos
                    </div>
                    <div className="text-xs text-[#99a1af]">
                      From your device
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => {
              if (!canAddSeed) {
                onAddClick();
              } else {
                setShowMenu((prev) => !prev);
              }
            }}
            title={canAddSeed ? "Add seed" : "Upgrade to add more seeds"}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg -mt-7 relative z-10 transition-colors ${
              canAddSeed
                ? "bg-[#16a34a] text-white hover:bg-[#15803d]"
                : "bg-gray-300 text-gray-500"
            }`}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {navItems[1] && (
          <button
            onClick={() => onViewChange(navItems[1].view)}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${
              activeView === navItems[1].view
                ? "text-[#16a34a]"
                : "text-[#6a7282]"
            }`}
          >
            {navItems[1].icon}
            <span className="text-xs font-medium">{navItems[1].label}</span>
          </button>
        )}

        {/* Import link */}
        <Link
          href="/import"
          className={`flex flex-col items-center gap-1 px-3 py-1 ${
            pathname === "/import" ? "text-[#16a34a]" : "text-[#6a7282]"
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-xs font-medium">Import</span>
        </Link>
      </div>
    </nav>
  );
}
