"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Experiments", href: "/" },
  { label: "Workflow", href: "/workflow" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-background-secondary">
      <div className="flex items-center gap-8 px-16 h-[51px]">
        <Link
          href="/"
          className="font-heading text-xl font-semibold text-text-primary whitespace-nowrap"
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
                    ? "bg-[rgba(20,174,92,0.1)] border-b-2 border-accent-primary text-text-primary"
                    : "text-text-primary hover:bg-background-tertiary"
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
