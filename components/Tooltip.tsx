"use client";

import { useState } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export default function Tooltip({ content, children, className = "", position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 px-3 py-2 text-xs text-text-primary bg-background-tertiary border border-border rounded-md shadow-lg max-w-xs pointer-events-none whitespace-normal ${positionClasses[position]}`}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-background-tertiary border-border ${
              position === "top"
                ? "top-full left-1/2 -translate-x-1/2 border-r border-b"
                : position === "bottom"
                ? "bottom-full left-1/2 -translate-x-1/2 border-l border-t"
                : position === "left"
                ? "left-full top-1/2 -translate-y-1/2 border-r border-t"
                : "right-full top-1/2 -translate-y-1/2 border-l border-b"
            } rotate-45`}
          />
        </div>
      )}
    </div>
  );
}

