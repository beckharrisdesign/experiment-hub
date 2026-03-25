"use client";

import { useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import TabsContent from "./tabs-content";
import type { Experiment, Prototype, Documentation } from "@/types";
import type { parsePRD, parseMarketResearch } from "@/lib/data";
import type { GitCommit } from "@/lib/git";

interface Tab {
  id: string;
  label: string;
}

interface ExperimentDetailClientProps {
  experiment: Experiment;
  prd: ReturnType<typeof parsePRD> | null;
  mr: ReturnType<typeof parseMarketResearch> | null;
  prototype: Prototype | null;
  documentation: Documentation | null;
  hasPRDFile: boolean;
  hasMRFile: boolean;
  hasPrototypeFiles: boolean;
  recentCommits: GitCommit[];
}

export default function ExperimentDetailClient({
  experiment,
  prd,
  mr,
  prototype,
  documentation,
  hasPRDFile,
  hasMRFile,
  hasPrototypeFiles,
  recentCommits,
}: ExperimentDetailClientProps) {
  // Build available tabs based on what data exists
  const tabs: Tab[] = [
    { id: "overview", label: "Overview" },
    ...(mr ? [{ id: "market-research", label: "Market Research" }] : []),
    ...(prd ? [{ id: "prd", label: "PRD" }] : []),
    ...(hasPRDFile ? [{ id: "landing", label: "Landing Page" }] : []),
    { id: "details", label: "Details" },
  ];

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="bg-background-primary px-16 pt-8 pb-0">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2 text-text-secondary">
            <li>
              <Link
                href="/"
                className="hover:text-text-primary transition-colors"
              >
                Experiments
              </Link>
            </li>
            <li>/</li>
            <li className="text-text-primary">{experiment.name}</li>
          </ol>
        </nav>

        {/* Title + subtitle */}
        <h1 className="font-heading text-[60px] font-semibold text-text-primary leading-tight">
          {experiment.name}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {experiment.statement}
        </p>

        {/* Tab nav */}
        <div className="flex mt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center h-[51px] px-4 text-[15px] font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[rgba(20,174,92,0.1)] border-b-2 border-accent-primary text-text-primary"
                  : "text-text-primary hover:bg-background-tertiary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Body: two columns */}
      <div className="flex flex-1">
        {/* Main content */}
        <main className="flex-1 bg-background-light px-16 py-12 min-w-0">
          <TabsContent
            experiment={experiment}
            prd={prd}
            mr={mr}
            prototype={prototype}
            documentation={documentation}
            hasPRDFile={hasPRDFile}
            hasMRFile={hasMRFile}
            hasPrototypeFiles={hasPrototypeFiles}
            activeTab={activeTab}
          />
        </main>

        {/* Recent Activity sidebar */}
        <aside className="w-[415px] shrink-0 bg-[#f5f5f5] px-12 py-12">
          <h2 className="font-heading text-base font-semibold text-text-dark mb-4">
            Recent activity
          </h2>
          <div className="flex flex-col gap-4">
            {recentCommits.length === 0 ? (
              <p className="text-sm text-text-dark-secondary">
                No recent commits found.
              </p>
            ) : (
              recentCommits.map((commit) => (
                <div
                  key={commit.hash}
                  className="bg-background-primary rounded p-4 min-h-[91px] flex flex-col justify-between"
                >
                  <p className="text-sm text-text-primary leading-snug line-clamp-3">
                    {commit.message}
                  </p>
                  <p className="text-xs text-text-muted font-mono mt-2">
                    {commit.hash} · {commit.date}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
}
