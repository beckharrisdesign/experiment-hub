"use client";

import { useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import ExperimentTypeBadge from "@/components/ExperimentTypeBadge";
import TabsContent from "./tabs-content";
import type { Experiment } from "@/types";
import type { parsePRD, parseMarketResearch } from "@/lib/data";

interface Tab {
  id: string;
  label: string;
}

interface ExperimentDetailClientProps {
  experiment: Experiment;
  slug: string;
  prd: ReturnType<typeof parsePRD> | null;
  prdRawContent: string | null;
  mr: ReturnType<typeof parseMarketResearch> | null;
  businessCaseContent: string | null;
  isEditor: boolean;
}

export default function ExperimentDetailClient({
  experiment,
  slug,
  prd,
  prdRawContent,
  mr,
  businessCaseContent,
  isEditor,
}: ExperimentDetailClientProps) {
  const tabs: Tab[] = [
    { id: "business-case", label: "Business Case" },
    { id: "prd", label: "PRD" },
  ];

  const [activeTab, setActiveTab] = useState("business-case");

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="bg-background-primary px-4 md:px-8 lg:px-16 pt-8 pb-0">
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2 text-text-secondary">
            <li>
              <Link
                href="/"
                data-analytics-event="navigation_click"
                data-analytics-surface="hub"
                data-analytics-label="breadcrumb_experiments"
                className="hover:text-text-primary transition-colors"
              >
                Experiments
              </Link>
            </li>
            <li>/</li>
            <li className="text-text-primary">{experiment.name}</li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-[60px] font-semibold text-text-primary leading-tight">
            {experiment.name}
          </h1>
          <ExperimentTypeBadge type={experiment.type} />
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          {experiment.statement}
        </p>

        <div className="flex mt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center h-[51px] px-4 text-[15px] font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-background-active border-b-[3px] border-accent-primary text-text-primary"
                  : "text-text-primary hover:bg-background-secondary"
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
        <main className="flex-1 bg-background-light px-4 md:px-8 lg:px-16 py-12 min-w-0">
          <TabsContent
            experiment={experiment}
            prd={prd}
            prdRawContent={prdRawContent}
            mr={mr}
            businessCaseContent={businessCaseContent}
            isEditor={isEditor}
            activeTab={activeTab}
            slug={slug}
          />
        </main>
      </div>

      <Footer />
    </div>
  );
}
