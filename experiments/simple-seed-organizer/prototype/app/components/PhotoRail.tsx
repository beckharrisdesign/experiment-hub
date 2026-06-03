"use client";

import { useRef } from "react";
import Link from "next/link";

/**
 * Ordered photo rail for the packet edit view.
 *
 * @figma S8YJQugvMmn5jaRqwFM5XO node 156-9525 — left "Frame 32" column (149:1663):
 * a vertical stack of framed packet images (4px radius, object-contain) replacing
 * the old front/back two-pane layout. An add-photo tile sits at the end of the rail.
 *
 * The rail is presentational: the parent owns the photo collection and decides how
 * a newly selected file becomes a SeedPhoto (Change 1 `photos[]` model).
 */
export interface PhotoRailItem {
  id: string;
  /** Directly renderable src — https/data/blob URL (already resolved by the parent). */
  path: string;
}

interface PhotoRailProps {
  photos: PhotoRailItem[];
  /** Append a freshly selected image file to the collection. */
  onAddFile: (file: File) => void;
  /** Run Auto Entry extraction for a single photo (omit when AI is unavailable). */
  onExtract?: (photo: PhotoRailItem) => void;
  /** Ids of photos currently being extracted (loading overlay). */
  extractingIds?: string[];
  /** Whether the Auto Entry affordance should be shown per photo. */
  canExtract?: boolean;
  /** When the user is at their AI limit — shows the upgrade hint instead. */
  atAiLimit?: boolean;
  /** ISO date the AI counter resets (shown in the limit hint). */
  resetsAt?: string;
}

export function PhotoRail({
  photos,
  onAddFile,
  onExtract,
  extractingIds = [],
  canExtract = false,
  atAiLimit = false,
  resetsAt,
}: PhotoRailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4" data-testid="photo-rail">
      {photos.map((photo) => {
        const isExtracting = extractingIds.includes(photo.id);
        return (
          <div
            key={photo.id}
            className="relative rounded border border-gray-200 bg-white"
          >
            {isExtracting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-white/80">
                <div className="flex flex-col items-center gap-2">
                  <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#16a34a] border-t-transparent" />
                  <span className="text-sm font-medium text-[#4a5565]">
                    Reading image…
                  </span>
                </div>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.path}
              alt="Packet photo"
              className="w-full rounded"
              style={{
                filter: "brightness(1.1) contrast(1.1)",
                maxHeight: "400px",
                objectFit: "contain",
              }}
            />
            {canExtract && onExtract && !atAiLimit && !isExtracting && (
              <button
                type="button"
                onClick={() => onExtract(photo)}
                className="absolute right-2 top-2 z-10 rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-600 shadow transition-colors hover:bg-white"
              >
                Auto Entry
              </button>
            )}
            {atAiLimit && !isExtracting && (
              <div className="absolute left-2 right-2 top-2 z-10 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                <p className="mb-1 font-medium">
                  You&apos;ve reached your AI extraction limit for this month.
                </p>
                {resetsAt && (
                  <p className="mb-1 text-[10px] text-amber-700">
                    Resets{" "}
                    {new Date(resetsAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
                <Link
                  href="/pricing?reason=ai"
                  className="inline-block rounded bg-[#16a34a] px-2 py-1 font-semibold text-white transition-colors hover:bg-[#15803d]"
                >
                  Upgrade now
                </Link>
              </div>
            )}
          </div>
        );
      })}

      {/* Add-photo tile — always last in the rail. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAddFile(file);
          // Reset so selecting the same file again re-fires onChange.
          e.target.value = "";
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex h-32 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-[#16a34a] hover:text-[#16a34a]"
        aria-label="Add photo"
      >
        <svg
          className="h-8 w-8"
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
        <span className="text-sm font-medium">Add photo</span>
      </button>
    </div>
  );
}
