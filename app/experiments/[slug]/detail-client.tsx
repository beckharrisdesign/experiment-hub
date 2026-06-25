"use client";

import { useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import ExperimentTypeBadge from "@/components/ExperimentTypeBadge";
import TabsContent from "./tabs-content";
import type { Experiment, ExperimentPullRequest } from "@/types";
import type { parsePRD, parseMarketResearch } from "@/lib/data";
import type { OpenSpecLifecycle } from "@/lib/openspec-shared";
import type { Note } from "@/lib/supabase";
import NotesList from "@/components/NotesList";
import PullRequestsList from "@/components/PullRequestsList";
import {
  buildExperimentDetailTabs,
  formatBhdPhaseLabel,
  resolveDefaultDetailTab,
} from "@/lib/openspec-shared";

interface ExperimentDetailClientProps {
  experiment: Experiment;
  slug: string;
  prd: ReturnType<typeof parsePRD> | null;
  prdRawContent: string | null;
  mr: ReturnType<typeof parseMarketResearch> | null;
  businessCaseContent: string | null;
  openSpecLifecycle: OpenSpecLifecycle | null;
  isEditor: boolean;
  notes: Note[];
  pullRequests: ExperimentPullRequest[];
}

export default function ExperimentDetailClient({
  experiment,
  slug,
  prd,
  prdRawContent,
  mr,
  businessCaseContent,
  openSpecLifecycle,
  isEditor,
  notes,
  pullRequests,
}: ExperimentDetailClientProps) {
  const tabs = buildExperimentDetailTabs({
    openSpecLifecycle,
    businessCaseContent,
    prdRawContent,
  });

  const [activeTab, setActiveTab] = useState(
    () => resolveDefaultDetailTab(tabs, openSpecLifecycle) ?? tabs[0]?.id ?? "",
  );

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
          {openSpecLifecycle && (
            <span className="inline-flex items-center rounded-md border border-accent-primary/40 bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
              BHD · {formatBhdPhaseLabel(openSpecLifecycle.currentPhase)}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          {experiment.statement}
        </p>

        {tabs.length > 0 && (
          <div className="flex mt-6 overflow-x-auto">
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
        )}
      </section>

      {/* Body: two columns */}
      <div className="flex flex-1">
        {/* Main content */}
        <main className="flex-1 bg-background-light px-4 md:px-8 lg:px-16 py-12 min-w-0">
          {tabs.length === 0 ? (
            <p className="text-sm text-text-dark-secondary">
              No documentation or OpenSpec artifacts yet for this experiment.
            </p>
          ) : (
            <TabsContent
              experiment={experiment}
              prd={prd}
              prdRawContent={prdRawContent}
              mr={mr}
              businessCaseContent={businessCaseContent}
              openSpecLifecycle={openSpecLifecycle}
              isEditor={isEditor}
              activeTab={activeTab}
              slug={slug}
            />
          )}

          {(notes.length > 0 || isEditor) && (
            <div className="mt-12 pt-12 border-t border-border-dark">
              <NotesList
                experimentId={experiment.id}
                initialNotes={notes}
                isEditor={isEditor}
              />
            </div>
          )}

          {(pullRequests.length > 0 || isEditor) && (
            <div className="mt-8">
              <PullRequestsList
                slug={slug}
                initialPullRequests={pullRequests}
                isEditor={isEditor}
              />
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
