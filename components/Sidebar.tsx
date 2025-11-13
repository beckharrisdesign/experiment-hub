"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ContentType } from "@/types";

const navItems: { type: ContentType; label: string; href: string }[] = [
  { type: "experiments", label: "Experiments", href: "/" },
  { type: "prototypes", label: "Prototypes", href: "/prototypes" },
  { type: "documentation", label: "Documentation", href: "/documentation" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-background-secondary">
      <nav className="p-4">
        <h1 className="mb-6 text-xl font-semibold text-text-primary">Experiment Hub</h1>
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === "/" && pathname === "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-background-tertiary text-accent-primary"
                      : "text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

