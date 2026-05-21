"use client";

import Link from "next/link";

/** Inline marks so the header never depends on expiring external asset URLs. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 3c-1.2 2.2-3.5 3.8-3.5 6.8 0 1.9 1.1 3.5 2.6 4.4-.9.4-1.6 1.1-2 2-.4-.9-1.1-1.6-2-2 1.5-.9 2.6-2.5 2.6-4.4C9.7 6.8 7.4 5.2 6.2 3c2.1.6 3.8 2.1 4.6 4.1.9-2 2.5-3.5 4.6-4.1z"
        fill="currentColor"
        className="text-[#15803d]"
      />
      <path
        d="M12 14.5c2.2 0 4 1.8 4 4v2.5H8V18.5c0-2.2 1.8-4 4-4z"
        fill="currentColor"
        className="text-[#166534]"
      />
    </svg>
  );
}

function ProfileMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
        fill="currentColor"
        className="text-white"
      />
      <path
        d="M6 19.5v-.5c0-2.2 2-4 6-4s6 1.8 6 4v.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-white"
      />
    </svg>
  );
}

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
            <LogoMark className="size-6" />
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
              <ProfileMark className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
