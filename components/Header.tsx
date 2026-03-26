"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Experiments", href: "/" },
  { label: "Workflow", href: "/workflow" },
  { label: "Scoring", href: "/scoring" },
  { label: "Harness", href: "/harness" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-background-secondary">
      <div className="flex items-center gap-8 px-16 h-[51px]">
        <Link
          href="/"
          className="font-heading text-xl font-semibold text-text-logo whitespace-nowrap"
        >
          BHD Labs
        </Link>
        <nav className="flex items-center h-full">
          {navLinks.map(({ label, href }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
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
      </div>
    </header>
  );
}
