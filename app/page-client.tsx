"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Tooltip from "@/components/Tooltip";
import type { Experiment, Prototype, Documentation } from "@/types";
import type { GitCommit } from "@/lib/git";
import { slugify } from "@/lib/utils";
import { calculateTotalScore } from "@/lib/scoring";
import Link from "next/link";

type SortColumn = "name" | "total";
type SortDirection = "asc" | "desc";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
  hasMRFile?: boolean;
  hasLandingPage?: boolean;
  moa?: string | null;
  goNoGo?: string | null;
  somYear1?: string | null;
  somYear3?: string | null;
}

interface HomePageClientProps {
  initialExperiments: ExperimentWithRelated[];
  recentCommits: GitCommit[];
}

type ViewTab = "active" | "inactive";

const HIDDEN_EXPERIMENT_IDS = ["experience-principles-repository"];

function getTotalBadgeColor(score: number) {
  if (score >= 20) return "bg-green-600 border-green-500 text-white";
  if (score >= 15) return "bg-yellow-500/80 border-yellow-400/80 text-white";
  if (score >= 10) return "bg-orange-500/80 border-orange-400/80 text-white";
  return "bg-red-500/80 border-red-400/80 text-white";
}

export default function HomePageClient({
  initialExperiments,
  recentCommits,
}: HomePageClientProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeTab, setActiveTab] = useState<ViewTab>("active");

  const experiments = useMemo(
    () =>
      initialExperiments.filter((e) => !HIDDEN_EXPERIMENT_IDS.includes(e.id)),
    [initialExperiments],
  );

  const activeExperiments = useMemo(
    () => experiments.filter((e) => e.status !== "Abandoned"),
    [experiments],
  );

  const inactiveExperiments = useMemo(
    () => experiments.filter((e) => e.status === "Abandoned"),
    [experiments],
  );

  const displayedExperiments =
    activeTab === "active" ? activeExperiments : inactiveExperiments;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedExperiments = useMemo(() => {
    return [...displayedExperiments].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortColumn === "name") {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else {
        aValue = calculateTotalScore(a.scores) ?? 0;
        bValue = calculateTotalScore(b.scores) ?? 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [displayedExperiments, sortColumn, sortDirection]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="bg-background-primary px-16 py-[70px]">
        <div className="flex gap-4 items-start max-w-screen-xl mx-auto">
          {/* Large heading */}
          <div className="w-[411px] pr-5 shrink-0">
            <h1 className="font-heading text-[60px] font-semibold text-[rgba(247,255,248,0.8)] leading-tight">
              Welcome
              <br />
              to BHD Labs
            </h1>
          </div>
          {/* About column */}
          <div className="w-[204px] pr-4 shrink-0">
            <p className="text-sm font-bold text-text-secondary leading-5 mb-2">
              About BHD Labs
            </p>
            <p className="text-sm font-light text-text-secondary leading-5">
              This space helps me evaluate and build out my ideas in a
              structured way — intuitive where it needs to be and structured
              where it needs to be.
            </p>
          </div>
          {/* How I evaluate column */}
          <div className="w-[204px] pr-4 shrink-0">
            <p className="text-sm font-bold text-text-secondary leading-5 mb-2">
              How I evaluate
            </p>
            <p className="text-sm font-light text-text-secondary leading-5">
              It&apos;s not a great idea unless it is something that I&apos;m
              passionate about, something that has a market need, and something
              that makes a difference in the world.
            </p>
          </div>
          {/* Core themes column */}
          <div className="w-[204px] pr-4 shrink-0">
            <p className="text-sm font-bold text-text-secondary leading-5 mb-2">
              My core themes
            </p>
            <p className="text-sm font-light text-text-secondary leading-5 mb-2">
              The core themes in my experiments are:
            </p>
            <ul className="text-sm font-light text-text-secondary leading-5 list-disc list-inside space-y-0.5">
              <li>empowering makers</li>
              <li>supporting neurodiversity</li>
              <li>facilitating environmental impact</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="bg-background-mint px-16 py-[46px]">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="font-heading text-base font-semibold text-text-dark mb-4">
            Recent activity
          </h2>
          <div className="flex gap-[26px]">
            {recentCommits.length === 0 ? (
              <p className="text-sm text-text-dark-secondary">
                No recent commits found.
              </p>
            ) : (
              recentCommits.map((commit) => (
                <div
                  key={commit.hash}
                  className="flex-1 bg-background-primary rounded p-4 min-h-[91px] flex flex-col justify-between"
                >
                  <p className="text-sm text-text-primary leading-snug line-clamp-2">
                    {commit.message}
                  </p>
                  <p className="text-xs text-text-muted font-mono mt-2">
                    {commit.hash} · {commit.date}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Experiment List Section */}
      <section className="bg-background-light px-16 py-[46px] flex-1">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="font-heading text-base font-semibold text-text-dark mb-4">
            All experiments
          </h2>

          {/* Tabs */}
          <div className="flex mb-2">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center h-[51px] px-4 text-[15px] font-medium transition-colors whitespace-nowrap ${
                activeTab === "active"
                  ? "bg-[rgba(20,174,92,0.1)] border-b-2 border-accent-primary text-text-dark"
                  : "text-text-dark hover:bg-[rgba(20,174,92,0.05)]"
              }`}
            >
              Active ({activeExperiments.length})
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`flex items-center h-[51px] px-4 text-[15px] font-medium transition-colors whitespace-nowrap ${
                activeTab === "inactive"
                  ? "bg-[rgba(20,174,92,0.1)] border-b-2 border-accent-primary text-text-dark"
                  : "text-text-dark hover:bg-[rgba(20,174,92,0.05)]"
              }`}
            >
              Inactive ({inactiveExperiments.length})
            </button>
          </div>

          {/* Table */}
          {sortedExperiments.length === 0 ? (
            <div className="border border-border-dark rounded p-8 text-center">
              <p className="text-sm text-text-dark-secondary">
                {activeTab === "active"
                  ? "No active experiments found."
                  : "No inactive experiments."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#194b31]">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-[#194b31]">
                    <th
                      className="px-4 py-4 text-left text-base font-medium text-text-primary w-1/2 cursor-pointer hover:bg-[#1e5c3a] transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Experiment</span>
                        {sortColumn === "name" && (
                          <span className="text-accent-primary">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-2 py-4 text-center text-base font-medium text-text-primary border-l border-[rgba(20,174,92,0.3)] cursor-pointer hover:bg-[#1e5c3a] transition-colors"
                      onClick={() => handleSort("total")}
                    >
                      <Tooltip
                        content="Sum of B+P+C+$+S (5-25). Click to sort."
                        position="bottom"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Score</span>
                          {sortColumn === "total" && (
                            <span className="text-accent-primary">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </th>
                    <th className="w-24 px-2 py-4 text-center text-base font-medium text-text-primary border-l border-[rgba(20,174,92,0.3)]">
                      <Tooltip
                        content="Product Requirements Document"
                        position="bottom"
                      >
                        <span className="cursor-help">PRD</span>
                      </Tooltip>
                    </th>
                    <th className="w-24 px-2 py-4 text-center text-base font-medium text-text-primary border-l border-[rgba(20,174,92,0.3)]">
                      <Tooltip
                        content="Landing page for validation"
                        position="bottom"
                      >
                        <span className="cursor-help">Landing</span>
                      </Tooltip>
                    </th>
                    <th className="w-24 px-2 py-4 text-center text-base font-medium text-text-primary border-l border-[rgba(20,174,92,0.3)]">
                      <Tooltip content="Prototype built" position="bottom">
                        <span className="cursor-help">Prototype</span>
                      </Tooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExperiments.map((experiment) => (
                    <tr
                      key={experiment.id}
                      className="border-t border-[rgba(20,174,92,0.2)] bg-[rgba(255,255,255,0.5)] hover:bg-[rgba(20,174,92,0.04)] transition-colors"
                    >
                      <td className="px-4 py-3 w-1/2">
                        <Link
                          href={`/experiments/${slugify(experiment.name)}`}
                          className="block hover:text-accent-primary"
                        >
                          <span className="font-heading text-xl font-medium text-text-dark">
                            {experiment.name || experiment.id || "Untitled"}
                          </span>
                          <span className="block text-sm text-text-dark-secondary leading-relaxed mt-0.5 line-clamp-1">
                            {experiment.statement}
                          </span>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-center border-l border-[rgba(20,174,92,0.2)]">
                        {!experiment.hasMRFile ? (
                          <span className="text-sm text-text-dark-secondary">
                            —
                          </span>
                        ) : (
                          (() => {
                            const total = calculateTotalScore(
                              experiment.scores,
                            );
                            const experimentSlug = slugify(experiment.name);
                            if (total !== null) {
                              return (
                                <Tooltip
                                  content={`${total}/25. Click to see breakdown.`}
                                  position="top"
                                >
                                  <Link
                                    href={`/experiments/${experimentSlug}#overview`}
                                    className={`inline-flex items-center justify-center h-7 min-w-[2rem] rounded-md border text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity ${getTotalBadgeColor(total)}`}
                                  >
                                    {total}
                                  </Link>
                                </Tooltip>
                              );
                            }
                            return (
                              <span className="text-accent-primary">✓</span>
                            );
                          })()
                        )}
                      </td>
                      <td className="w-24 px-2 py-3 text-center border-l border-[rgba(20,174,92,0.2)]">
                        {experiment.hasPRDFile ? (
                          <span className="text-accent-primary">✓</span>
                        ) : (
                          <span className="text-sm text-text-dark-secondary">
                            —
                          </span>
                        )}
                      </td>
                      <td className="w-24 px-2 py-3 text-center border-l border-[rgba(20,174,92,0.2)]">
                        {experiment.hasLandingPage ? (
                          <span className="text-accent-primary">✓</span>
                        ) : (
                          <span className="text-sm text-text-dark-secondary">
                            —
                          </span>
                        )}
                      </td>
                      <td className="w-24 px-2 py-3 text-center border-l border-[rgba(20,174,92,0.2)]">
                        {experiment.hasPrototypeDir ? (
                          <span className="text-accent-primary">✓</span>
                        ) : (
                          <span className="text-sm text-text-dark-secondary">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
