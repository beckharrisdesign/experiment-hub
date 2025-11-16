"use client";

import { useState, useEffect } from "react";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function Tabs({ tabs, defaultTab }: TabsProps) {
  // Check URL hash on mount to set initial tab
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1); // Remove the #
      if (hash && tabs.find((tab) => tab.id === hash)) {
        return hash;
      }
    }
    return defaultTab || tabs[0]?.id;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Update tab when hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && tabs.find((tab) => tab.id === hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [tabs]);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Update URL hash without scrolling
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.hash = tab.id;
                  window.history.replaceState(null, "", url.toString());
                }
              }}
              className={`
                whitespace-nowrap border-b-2 px-1 py-4 text-xs font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-text-secondary hover:border-text-secondary hover:text-text-primary"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">{activeTabContent}</div>
    </div>
  );
}

