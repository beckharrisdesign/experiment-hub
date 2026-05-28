"use client";

import Link from "next/link";

/** @figma S8YJQugvMmn5jaRqwFM5XO:180:19450 */

type EntryMethod = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const ENTRY_METHODS: EntryMethod[] = [
  {
    title: "Manual",
    description: "Type the details yourself.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
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
    ),
  },
  {
    title: "Auto photograph",
    description: "Snap front & back, AI fills the fields.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
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
    ),
  },
  {
    title: "Bulk upload",
    description: "Upload existing photos from your device.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
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
    ),
  },
];

export function SeedListEmptyState() {
  return (
    <div className="flex flex-col items-center gap-8 py-8 md:py-16 px-4">
      <h2 className="text-2xl md:text-3xl font-semibold text-[#262626] text-center">
        Let&rsquo;s add your first seeds
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-3xl">
        {ENTRY_METHODS.map((m) => (
          <div key={m.title} className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-[#15803d] flex items-center justify-center">
              {m.icon}
            </div>
            <h3 className="text-xl font-semibold text-[#262626] text-center">
              {m.title}
            </h3>
            <p className="text-sm text-[#64748b] text-center max-w-[260px]">
              {m.description}
            </p>
          </div>
        ))}
      </div>

      <Link
        href="/add"
        className="px-6 py-2 bg-[#15803d] text-white font-medium rounded hover:bg-[#14532d] transition-colors"
      >
        Continue
      </Link>
    </div>
  );
}
