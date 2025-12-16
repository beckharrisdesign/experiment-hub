"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Tooltip from "@/components/Tooltip";
import PrototypeStatus from "@/components/PrototypeStatus";
import Button from "@/components/Button";
import ScoreBadge from "@/components/ScoreBadge";
import type { Experiment, Prototype, Documentation } from "@/types";
import { slugify } from "@/lib/utils";
import Link from "next/link";

type SortColumn = "name" | "businessOpportunity" | "personalImpact" | "competitiveAdvantage" | "platformCost" | "socialImpact" | "total";
type SortDirection = "asc" | "desc";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
  hasMRFile?: boolean;
  moa?: string | null;
  goNoGo?: string | null;
  somYear1?: string | null;
  somYear3?: string | null;
}

function getPrototypeUrl(prototype: Prototype | null | undefined, experimentSlug: string): string | null {
  if (!prototype) return null;
  
  // If prototype has a port, link to localhost:port
  if (prototype.port) {
    return `http://localhost:${prototype.port}`;
  }
  
  // Otherwise, link to the experiment detail page (where prototype info is shown)
  return `/experiments/${experimentSlug}`;
}

interface HomePageClientProps {
  initialExperiments: ExperimentWithRelated[];
}


function calculateTotalScore(scores: ExperimentWithRelated["scores"]): number | null {
  if (!scores) return null;
  
  const { businessOpportunity, personalImpact, competitiveAdvantage, platformCost, socialImpact } = scores;
  
  // Only calculate if all 5 scores are present
  if (
    businessOpportunity === undefined ||
    personalImpact === undefined ||
    competitiveAdvantage === undefined ||
    platformCost === undefined ||
    socialImpact === undefined
  ) {
    return null;
  }
  
  return businessOpportunity + personalImpact + competitiveAdvantage + platformCost + socialImpact;
}

function parseSOMValue(value: string | null | undefined): number {
  if (!value) return 0;
  // Parse values like "$50K", "$1.5M", "$2B"
  const match = value.match(/\$?([\d.]+)([KMkmBb])?/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") return num * 1000;
  if (suffix === "M") return num * 1000000;
  if (suffix === "B") return num * 1000000000;
  return num;
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
  // Compact padding for scoring columns (B, P, C, $, S, Total)
  const isScoringColumn = ['businessOpportunity', 'personalImpact', 'competitiveAdvantage', 'platformCost', 'socialImpact', 'total'].includes(column);
  const paddingClass = isScoringColumn ? 'px-1.5 py-2' : 'px-4 py-3';
  
  return (
    <th 
      className={`${paddingClass} text-center text-sm font-semibold text-text-primary whitespace-nowrap cursor-pointer hover:bg-background-secondary transition-colors ${
        isActive ? "bg-background-secondary" : ""
      } ${className}`}
      onClick={() => onSort(column)}
    >
      <Tooltip content={tooltip} position="bottom">
        <div className="flex items-center justify-center gap-1">
          <span className="cursor-help">{children}</span>
          {isActive && (
            <span className="text-xs text-accent-primary">
              {sortDirection === "asc" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </Tooltip>
    </th>
  );
}

export default function HomePageClient({ initialExperiments }: HomePageClientProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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
    return [...initialExperiments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "businessOpportunity":
          aValue = a.scores?.businessOpportunity ?? 0;
          bValue = b.scores?.businessOpportunity ?? 0;
          break;
        case "personalImpact":
          aValue = a.scores?.personalImpact ?? 0;
          bValue = b.scores?.personalImpact ?? 0;
          break;
        case "competitiveAdvantage":
          aValue = a.scores?.competitiveAdvantage ?? 0;
          bValue = b.scores?.competitiveAdvantage ?? 0;
          break;
        case "platformCost":
          aValue = a.scores?.platformCost ?? 0;
          bValue = b.scores?.platformCost ?? 0;
          break;
        case "socialImpact":
          aValue = a.scores?.socialImpact ?? 0;
          bValue = b.scores?.socialImpact ?? 0;
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
  }, [initialExperiments, sortColumn, sortDirection]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="p-8">
      {sortedExperiments.length === 0 ? (
        <div className="rounded-lg border border-border bg-background-secondary p-8 text-center">
          <p className="text-text-secondary">No experiments found.</p>
          <p className="mt-2 text-sm text-text-muted">
            Create your first experiment using @experiment-creator
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background-secondary">
          <table className="w-full">
            <thead>
              {/* Group Headers Row */}
              <tr className="border-b border-border bg-background-tertiary">
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary w-1/2">
                  Experiment
                </th>
                <th colSpan={6} className="px-4 py-2 text-left text-xs font-medium text-text-secondary border-l-2 border-accent-primary/30">
                  Market Validation
                </th>
                <th colSpan={1} className="px-2 py-2 text-left text-xs font-medium text-text-secondary border-l-2 border-accent-primary/30">
                  PRD
                </th>
                <th colSpan={1} className="px-2 py-2 text-left text-xs font-medium text-text-secondary border-l-2 border-accent-primary/30">
                  Prototype
                </th>
              </tr>
              {/* Column Headers Row */}
              <tr className="border-b border-border bg-background-tertiary">
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap cursor-pointer hover:bg-background-secondary transition-colors w-1/2"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    {sortColumn === "name" && (
                      <span className="text-xs text-accent-primary">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <SortableHeader 
                  column="businessOpportunity"
                  tooltip="Business Opportunity: Market potential and revenue opportunity (1-5). Higher is better."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="border-l-2 border-accent-primary/30"
                >
                  B
                </SortableHeader>
                <SortableHeader 
                  column="personalImpact"
                  tooltip="Personal Impact: Would I personally use/benefit from this? (1-5). Higher is better."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  P
                </SortableHeader>
                <SortableHeader 
                  column="competitiveAdvantage"
                  tooltip="Competitive Advantage: Low competition = 5, High competition = 1. Higher is better."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  C
                </SortableHeader>
                <SortableHeader 
                  column="platformCost"
                  tooltip="Platform Cost: Solo buildability with AI tools (Cursor) + infrastructure complexity (1-5). Higher is better."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  $
                </SortableHeader>
                <SortableHeader 
                  column="socialImpact"
                  tooltip="Social Impact: Fun, joy, and whether the world needs this (1-5). Higher is better."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  S
                </SortableHeader>
                <SortableHeader 
                  column="total"
                  tooltip="Total Score: Sum of all 5 scores (B+P+C+$+S), equally weighted. Range: 5-25. Higher is better. Click to sort."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Total
                </SortableHeader>
                <th className="px-2 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap border-l-2 border-accent-primary/30">
                  <Tooltip content="PRD: Product Requirements Document actions" position="bottom">
                    <span className="cursor-help">PRD</span>
                  </Tooltip>
                </th>
                <th className="px-2 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap border-l-2 border-accent-primary/30">
                  <Tooltip content="Prototype: View prototype (when running) or Start/Stop server" position="bottom">
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
                      <span className="font-medium text-text-primary">{experiment.name}</span>
                      <span className="block text-xs text-text-muted mt-0.5 line-clamp-1">{experiment.statement}</span>
                    </Link>
                  </td>
                  {!experiment.hasMRFile ? (
                    // State 1: New Experiment - show Create button spanning all Market Validation columns
                    <td colSpan={6} className="px-2 py-3 text-center border-l-2 border-accent-primary/30">
                      <Button
                        as="link"
                        variant="secondary"
                        href={`/experiments/${slugify(experiment.name)}#market-research`}
                        title="Create Market Validation"
                      >
                        Create
                      </Button>
                    </td>
                  ) : (
                    // States 2, 3, 4: Market Validation complete - show individual score columns
                    <>
                      <td className="px-1.5 py-2 text-center border-l-2 border-accent-primary/30">
                        <ScoreBadge value={experiment.scores?.businessOpportunity} label="B" fullName="Business Opportunity" />
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <ScoreBadge value={experiment.scores?.personalImpact} label="P" fullName="Personal Impact" />
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <ScoreBadge value={experiment.scores?.competitiveAdvantage} label="C" fullName="Competitive Advantage" />
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <ScoreBadge value={experiment.scores?.platformCost} label="$" fullName="Platform Cost" />
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <ScoreBadge value={experiment.scores?.socialImpact} label="S" fullName="Social Impact" />
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        {(() => {
                          const total = calculateTotalScore(experiment.scores);
                          if (total === null) {
                            return <span className="text-text-muted">—</span>;
                          }
                          const percentage = Math.round((total / 25) * 100);
                          
                          // Color scale for total score: 20-25 = green, 15-19 = yellow, 10-14 = orange, 5-9 = red
                          const getTotalBadgeColor = (score: number) => {
                            if (score >= 20) return "bg-green-600 border-green-500 text-white";
                            if (score >= 15) return "bg-yellow-500/80 border-yellow-400/80 text-white";
                            if (score >= 10) return "bg-orange-500/80 border-orange-400/80 text-white";
                            return "bg-red-500/80 border-red-400/80 text-white";
                          };
                          
                          return (
                            <Tooltip content={`Total: ${total}/25 (${percentage}%). Sum of B+P+C+$+S, equally weighted.`} position="top">
                              <span
                                className={`inline-flex items-center justify-center h-6 w-8 rounded-md border text-xs font-semibold cursor-help ${getTotalBadgeColor(total)}`}
                              >
                                {total}
                              </span>
                            </Tooltip>
                          );
                        })()}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 text-center border-l-2 border-accent-primary/30">
                    {(() => {
                      // PRD column logic
                      // States 1 & 2: No PRD yet - show Create or blank
                      if (!experiment.hasMRFile) {
                        // State 1: Can't create PRD without Market Validation
                        return null;
                      }
                      if (!experiment.hasPRDFile) {
                        // State 2: Market Validation complete - show Create for PRD
                        return (
                          <Button
                            as="link"
                            variant="secondary"
                            href={`/experiments/${slugify(experiment.name)}#prd`}
                            title="Create PRD"
                          >
                            Create
                          </Button>
                        );
                      }
                      // States 3 & 4: PRD complete - show View
                      return (
                        <Button
                          as="link"
                          variant="primary"
                          href={`/experiments/${slugify(experiment.name)}#prd`}
                          title="View PRD"
                        >
                          View
                        </Button>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-3 text-left border-l-2 border-accent-primary/30">
                    {(() => {
                      // Prototype column logic
                      // State 1: No Market Validation yet - blank (enforce workflow order)
                      if (!experiment.hasMRFile) {
                        return null;
                      }
                      // States 1 & 2: No PRD yet - blank
                      if (!experiment.hasPRDFile) {
                        return null;
                      }
                      // State 3: PRD complete, no prototype - show Create for Prototype
                      if (!experiment.hasPrototypeDir) {
                        return (
                          <Button
                            as="link"
                            variant="secondary"
                            href={`/experiments/${slugify(experiment.name)}`}
                            title="Create Prototype"
                          >
                            Create
                          </Button>
                        );
                      }
                      // State 4: Prototype exists - show PrototypeStatus
                      return (
                        <PrototypeStatus
                          port={experiment.prototype?.port}
                          hasPrototype={experiment.hasPrototypeDir || false}
                          prototypeUrl={getPrototypeUrl(experiment.prototype, slugify(experiment.name))}
                          experimentSlug={slugify(experiment.name)}
                          showActions={false}
                        />
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
