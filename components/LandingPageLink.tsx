"use client";

import { useState, useEffect } from "react";

interface LandingPageLinkProps {
  devPort: number;
}

export default function LandingPageLink({ devPort }: LandingPageLinkProps) {
  const [landingUrl, setLandingUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentHost = window.location.hostname;
      const newUrl = currentHost.replace(/-00-/, `-0${devPort}-`);
      setLandingUrl(`https://${newUrl}`);
    }
  }, [devPort]);

  if (!landingUrl) {
    return null;
  }

  return (
    <div className="mt-4">
      <a
        href={landingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/80 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        View Landing Page (Dev)
      </a>
      <p className="text-xs text-text-muted mt-2">Running on port {devPort}</p>
    </div>
  );
}
