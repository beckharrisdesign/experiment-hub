"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import MermaidDiagram from "@/components/MermaidDiagram";
import Tooltip from "@/components/Tooltip";
import type { Experiment, Prototype, Documentation } from "@/types";
import { slugify } from "@/lib/utils";
import { calculateTotalScore, parseSOMValue } from "@/lib/scoring";
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
}



interface SortableHeaderProps {
  column: SortColumn;
  children: React.ReactNode;
  tooltip: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
}

function SortableHeader({ 
  column, 
  children, 
  tooltip,
  sortColumn,
  sortDirection,
  onSort,
  className = ""
}: SortableHeaderProps) {
  const isActive = sortColumn === column;
  
  return (
    <th 
      className={`px-2 py-3 text-center text-base font-semibold text-text-primary whitespace-nowrap cursor-pointer hover:bg-background-secondary transition-colors ${
        isActive ? "bg-background-secondary" : ""
      } ${className}`}
      onClick={() => onSort(column)}
    >
      <Tooltip content={tooltip} position="bottom">
        <div className="flex items-center justify-center gap-1">
          <span className="cursor-help">{children}</span>
          {isActive && (
            <span className="text-sm text-accent-primary">
              {sortDirection === "asc" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </Tooltip>
    </th>
  );
}

type ViewTab = "active" | "archived";

const HIDDEN_EXPERIMENT_IDS = ["experience-principles-repository"];

export default function HomePageClient({ initialExperiments }: HomePageClientProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeTab, setActiveTab] = useState<ViewTab>("active");

  const experiments = useMemo(
    () => initialExperiments.filter(e => !HIDDEN_EXPERIMENT_IDS.includes(e.id)),
    [initialExperiments]
  );

  const activeExperiments = useMemo(() => 
    experiments.filter(e => e.status !== "Abandoned"), 
    [experiments]
  );
  
  const archivedExperiments = useMemo(() => 
    experiments.filter(e => e.status === "Abandoned"), 
    [experiments]
  );

  const displayedExperiments = activeTab === "active" ? activeExperiments : archivedExperiments;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedExperiments = useMemo(() => {
    // Sort experiments
    return [...displayedExperiments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "total":
          aValue = calculateTotalScore(a.scores) ?? 0;
          bValue = calculateTotalScore(b.scores) ?? 0;
          break;
        default:
          return 0;
      }

      // Handle null/undefined values - put them at the end
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [displayedExperiments, sortColumn, sortDirection]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex flex-col items-center w-full px-8 py-8">
      <div className="mx-auto w-full max-w-screen-xl">
      {/* BHD Labs Intro */}
      <div className="mx-auto mb-10 max-w-4xl">
        <p className="text-lg text-text-primary leading-relaxed mb-8 font-medium">
          Welcome to my build incubator of one, BHD Labs. It&apos;s my place to experiment with new technologies, techniques, and product ideas while learning and building.
        </p>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          About the Hub
        </h3>
        <p className="text-base text-text-secondary leading-relaxed mb-4">
          The Experiment Hub is a tool I built for myself to support this effort. As someone who&apos;s neurodiverse, I needed a scaffold that could hold all the ideas filling my brain and help me evaluate and build them in a structured way — intuitive where it needs to be and structured where it needs to be.
        </p>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          How I evaluate
        </h3>
        <p className="text-base text-text-secondary leading-relaxed mb-4">
          I evaluate every idea here across three dimensions: personal, market, and community. It&apos;s not enough to have a great idea, it needs to be something that I&apos;m passionate about, something that has a market need, and something that I can build.
          </p>
          
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            My core missions
          </h3>

          <p className="text-base text-text-secondary leading-relaxed mb-4">
            The core missions in my work are: empowering makers, supporting neurodiversity, and facilitating environmental impact.
        </p>
      </div>

      {/* Workflow Diagram */}
      {/* <div className="mx-auto mb-10 max-w-2xl">
        <p className="text-xs text-text-muted italic mb-3">
          The basic workflow
        </p>
        <MermaidDiagram
          chart={`flowchart LR
    A([💡 Idea]) --> B[Market\\nValidation]
    B --> C{Score\\ngood?}
    C -->|yes| D[PRD]
    C -->|no| Z([Archive])
    D --> E[Landing\\nPage]
    E --> V{Validation\\npassed?}
    V -->|yes| F[Prototype]
    V -->|no| Z
    F --> G([🚀 Launch])`}
          className="[&_svg]:max-w-full [&_svg]:h-auto"
        />
      </div> */}

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "active"
              ? "border-b-2 border-accent-primary text-accent-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Active ({activeExperiments.length})
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "archived"
              ? "border-b-2 border-accent-primary text-accent-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Archived ({archivedExperiments.length})
        </button>
      </div>

      {sortedExperiments.length === 0 ? (
        <div className="rounded-lg border border-border bg-background-secondary p-8 text-center">
          <p className="text-base text-text-secondary">
            {activeTab === "active" ? "No active experiments found." : "No archived experiments."}
          </p>
          {activeTab === "active" && (
            <p className="mt-2 text-sm text-text-muted">
              Create your first experiment using @experiment-creator
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background-secondary">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-border bg-background-tertiary">
                <th
                  className="px-4 py-2 text-left text-base font-medium text-text-secondary w-1/2 cursor-pointer hover:bg-background-secondary transition-colors"
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
                  className="px-2 py-2 text-center text-base font-medium text-text-secondary border-l-2 border-accent-primary/30 cursor-pointer hover:bg-background-secondary transition-colors"
                  onClick={() => handleSort("total")}
                >
                  <Tooltip content="Sum of B+P+C+$+S (5-25). Click to sort. Click the score to see the breakdown." position="bottom">
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
                <th className="w-24 px-2 py-2 text-center text-base font-medium text-text-secondary border-l-2 border-accent-primary/30 whitespace-nowrap">
                  <Tooltip content="Product Requirements Document" position="bottom">
                    <span className="cursor-help">PRD</span>
                  </Tooltip>
                </th>
                <th className="w-24 px-2 py-2 text-center text-base font-medium text-text-secondary border-l-2 border-accent-primary/30 whitespace-nowrap">
                  <Tooltip content="Landing page for validation" position="bottom">
                    <span className="cursor-help">Landing</span>
                  </Tooltip>
                </th>
                <th className="w-24 px-2 py-2 text-center text-base font-medium text-text-secondary border-l-2 border-accent-primary/30 whitespace-nowrap">
                  <Tooltip content="Prototype: view or start/stop server" position="bottom">
                    <span className="cursor-help">Prototype</span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedExperiments.map((experiment) => (
                <tr
                  key={experiment.id}
                  className="border-b border-border transition-colors hover:bg-background-tertiary"
                >
                  <td className="px-4 py-3 w-1/2">
                    <Link
                      href={`/experiments/${slugify(experiment.name)}`}
                      className="block hover:text-accent-primary"
                    >
                      <span className="font-heading text-xl font-medium text-text-primary">{experiment.name || experiment.id || "Untitled"}</span>
                      <span className="block text-base text-text-secondary leading-relaxed mt-0.5 line-clamp-1">{experiment.statement}</span>
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-center border-l-2 border-accent-primary/30">
                    {!experiment.hasMRFile ? (
                      <span className="text-sm text-text-muted">—</span>
                    ) : (() => {
                      const total = calculateTotalScore(experiment.scores);
                      const experimentSlug = slugify(experiment.name);
                      const scoreHref = `/experiments/${experimentSlug}#overview`;
                      const getTotalBadgeColor = (score: number) => {
                        if (score >= 20) return "bg-green-600 border-green-500 text-white";
                        if (score >= 15) return "bg-yellow-500/80 border-yellow-400/80 text-white";
                        if (score >= 10) return "bg-orange-500/80 border-orange-400/80 text-white";
                        return "bg-red-500/80 border-red-400/80 text-white";
                      };
                      if (total !== null) {
                        return (
                          <Tooltip content={`${total}/25. Click to see breakdown.`} position="top">
                            <Link
                              href={scoreHref}
                              className={`inline-flex items-center justify-center h-7 min-w-[2rem] rounded-md border text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity ${getTotalBadgeColor(total)}`}
                            >
                              {total}
                            </Link>
                          </Tooltip>
                        );
                      }
                      return (
                        <span className="text-success" title="Market validation done" aria-hidden="true">✓</span>
                      );
                    })()}
                  </td>
                  <td className="w-24 px-2 py-3 text-center border-l-2 border-accent-primary/30">
                    {experiment.hasPRDFile ? (
                      <span className="text-success" title="PRD done" aria-hidden="true">✓</span>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>
                  <td className="w-24 px-2 py-3 text-center border-l-2 border-accent-primary/30">
                    {experiment.hasLandingPage ? (
                      <span className="text-success" title="Landing page done" aria-hidden="true">✓</span>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>
                  <td className="w-24 px-2 py-3 text-center border-l-2 border-accent-primary/30">
                    {experiment.hasPrototypeDir ? (
                      <span className="text-success" title="Prototype built" aria-hidden="true">✓</span>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
