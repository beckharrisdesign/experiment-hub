"use client";

/** @figma 9VJTxmBWKgeCDTyJLsYM7I:223:1337 */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Experiments", href: "/" },
  { label: "Workflow", href: "/workflow" },
  { label: "Scoring", href: "/scoring" },
  { label: "Heuristics", href: "/heuristics" },
  { label: "Harness", href: "/harness" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-background-secondary relative">
      <div className="flex items-center justify-between px-4 md:px-8 lg:px-16 h-[51px]">
        <Link
          href="/"
          data-analytics-event="navigation_click"
          data-analytics-surface-type="hub"
          data-analytics-surface-name="header"
          data-analytics-link-label="bhd_labs_logo"
          className="font-heading text-xl font-semibold text-text-logo whitespace-nowrap"
        >
          BHD Labs
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center h-full">
          {navLinks.map(({ label, href }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                data-analytics-event="navigation_click"
                data-analytics-surface-type="hub"
                data-analytics-surface-name="header"
                data-analytics-link-label={label.toLowerCase()}
                className={`flex items-center h-full px-4 text-[15px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-background-active border-b-[3px] border-accent-primary text-text-primary"
                    : "text-text-primary hover:bg-background-secondary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex items-center justify-center w-9 h-9 text-text-primary"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown nav */}
      {menuOpen && (
        <nav className="lg:hidden absolute top-[51px] left-0 right-0 bg-background-secondary border-t border-[rgba(20,174,92,0.2)] z-50">
          {navLinks.map(({ label, href }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                data-analytics-event="navigation_click"
                data-analytics-surface-type="hub"
                data-analytics-surface-name="header-mobile"
                data-analytics-link-label={label.toLowerCase()}
                className={`flex items-center px-4 py-3 text-[15px] font-medium transition-colors border-b border-[rgba(20,174,92,0.1)] ${
                  isActive
                    ? "text-accent-primary bg-background-active"
                    : "text-text-primary hover:bg-background-secondary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
