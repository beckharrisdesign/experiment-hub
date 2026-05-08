"use client";

import Link from "next/link";

/** Exported from Figma MCP for node 13:128 — replace from file if assets expire (~7 days). */
const LOGO_MARK =
  "https://www.figma.com/api/mcp/asset/1c08b8a5-131e-42a2-bc27-91a18df674f0";
const PROFILE_ICON =
  "https://www.figma.com/api/mcp/asset/298f3485-0bf2-43a1-80e1-ba79eb6127d3";

/** @figma S8YJQugvMmn5jaRqwFM5XO:13:128 */
interface HeaderProps {
  showProfileLink?: boolean;
}

export function Header({ showProfileLink }: HeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 w-full min-w-0 px-8 py-4 text-white"
      style={{ backgroundColor: "var(--brand-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between">
        <Link
          href="/"
          className="flex h-10 shrink-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
            <img alt="" src={LOGO_MARK} width={24} height={24} className="size-6" />
          </div>
          <span className="whitespace-nowrap text-[18px] font-semibold leading-7">
            Simple Seed Organizer
          </span>
        </Link>

        <div className="relative flex shrink-0 items-center gap-4 md:gap-6">
          {!showProfileLink && (
            <>
              <nav className="hidden items-center gap-4 sm:flex md:gap-6">
                <a
                  href="#features"
                  className="text-sm font-medium text-white/90 transition-colors hover:text-white"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="text-sm font-medium text-white/90 transition-colors hover:text-white"
                >
                  Pricing
                </a>
              </nav>
              <Link
                href="/login"
                className="text-sm font-medium text-white/90 transition-colors hover:text-white"
              >
                Login
              </Link>
            </>
          )}
          {showProfileLink && (
            <Link
              href="/profile"
              className="flex size-9 items-center justify-center rounded-lg bg-[#15803d] p-2 transition-colors hover:bg-[#166534]"
              aria-label="Profile"
            >
              <img
                alt=""
                src={PROFILE_ICON}
                width={20}
                height={20}
                className="block size-5 max-w-none"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
