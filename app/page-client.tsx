"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import Header from "@/components/Header";
import Tooltip from "@/components/Tooltip";
import type { Experiment, Prototype, Documentation } from "@/types";
import { slugify } from "@/lib/utils";
import Link from "next/link";

type SortColumn = "name" | "year1" | "year3" | "businessOpportunity" | "personalImpact" | "competitiveAdvantage" | "platformCost" | "socialImpact" | "total";
type SortDirection = "asc" | "desc";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
  moa?: string | null;
  goNoGo?: string | null;
  somYear1?: string | null;
  somYear3?: string | null;
}

interface HomePageClientProps {
  initialExperiments: ExperimentWithRelated[];
}

function ScoreBadge({ value, label, fullName }: { value: number | undefined; label: string; fullName: string }) {
  if (value === undefined) {
    return <span className="text-text-muted">—</span>;
  }

  const getBadgeColor = (val: number) => {
    if (val === 5) return "bg-green-600 border-green-500";
    if (val === 4) return "bg-lime-500/30 border-lime-400/30";
    return "bg-background-tertiary border-border";
  };

  return (
    <span
      className={`inline-flex items-center justify-center h-6 w-6 rounded-md border text-xs font-medium text-white ${getBadgeColor(
        value
      )}`}
      title={`${fullName}: ${value}/5`}
    >
      {value}
    </span>
  );
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
}

function SortableHeader({ 
  column, 
  children, 
  tooltip,
  sortColumn,
  sortDirection,
  onSort
}: SortableHeaderProps) {
  const isActive = sortColumn === column;
  return (
    <th 
      className={`px-4 py-3 text-center text-sm font-semibold text-text-primary whitespace-nowrap cursor-pointer hover:bg-background-secondary transition-colors ${
        isActive ? "bg-background-secondary" : ""
      }`}
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredAndSortedExperiments = useMemo(() => {
    // First filter
    let filtered = initialExperiments;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = initialExperiments.filter(
        (exp) =>
          exp.name.toLowerCase().includes(query) ||
          exp.statement.toLowerCase().includes(query) ||
          exp.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Then sort
    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "year1":
          aValue = parseSOMValue(a.somYear1);
          bValue = parseSOMValue(b.somYear1);
          break;
        case "year3":
          aValue = parseSOMValue(a.somYear3);
          bValue = parseSOMValue(b.somYear3);
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
  }, [initialExperiments, searchQuery, sortColumn, sortDirection]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="p-8">
        <div className="mb-6">
          <SearchBar placeholder="Search experiments..." onSearch={setSearchQuery} />
        </div>

      {filteredAndSortedExperiments.length === 0 ? (
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
              <tr className="border-b border-border bg-background-tertiary">
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap cursor-pointer hover:bg-background-secondary transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>Experiment</span>
                    {sortColumn === "name" && (
                      <span className="text-xs text-accent-primary">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <SortableHeader 
                  column="year1"
                  tooltip="Year 1 Revenue Estimate: Projected revenue in first year based on market research assumptions (customer acquisition, conversion rates, pricing). Midpoint of range shown."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Year 1
                </SortableHeader>
                <SortableHeader 
                  column="year3"
                  tooltip="Year 3 Revenue Estimate: Projected revenue in third year based on market research assumptions (growth trajectory, market penetration, customer base expansion). Midpoint of range shown."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Year 3
                </SortableHeader>
                <SortableHeader 
                  column="businessOpportunity"
                  tooltip="Business Opportunity: Market potential and revenue opportunity (1-5). Higher is better."
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
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
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary whitespace-nowrap">
                  <Tooltip content="PRD: Product Requirements Document exists" position="bottom">
                    <span className="cursor-help">PRD</span>
                  </Tooltip>
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary whitespace-nowrap">
                  <Tooltip content="Prototype: Prototype code/files exist" position="bottom">
                    <span className="cursor-help">Prototype</span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedExperiments.map((experiment) => (
                <tr
                  key={experiment.id}
                  className="border-b border-border transition-colors hover:bg-background-tertiary"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/experiments/${slugify(experiment.name)}`}
                      className="block hover:text-accent-primary"
                    >
                      <span className="font-medium text-text-primary">{experiment.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {experiment.somYear1 ? (
                      <Tooltip content="Year 1 revenue estimate (midpoint of range). Based on: early adopter phase, limited marketing, MVP validation. Assumes 0.01-0.1% market share with conservative conversion rates." position="top">
                        <span className="text-sm text-text-primary font-mono cursor-help">
                          {experiment.somYear1}
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {experiment.somYear3 ? (
                      <Tooltip content="Year 3 revenue estimate (midpoint of range). Based on: established product, word-of-mouth growth, improved SEO/marketing. Assumes 0.5-1% market share with optimized conversion rates." position="top">
                        <span className="text-sm text-text-primary font-mono cursor-help">
                          {experiment.somYear3}
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge value={experiment.scores?.businessOpportunity} label="B" fullName="Business Opportunity" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge value={experiment.scores?.personalImpact} label="P" fullName="Personal Impact" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge value={experiment.scores?.competitiveAdvantage} label="C" fullName="Competitive Advantage" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge value={experiment.scores?.platformCost} label="$" fullName="Platform Cost" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge value={experiment.scores?.socialImpact} label="S" fullName="Social Impact" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const total = calculateTotalScore(experiment.scores);
                      if (total === null) {
                        return <span className="text-text-muted">—</span>;
                      }
                      const percentage = Math.round((total / 25) * 100);
                      return (
                        <Tooltip content={`Total: ${total}/25 (${percentage}%). Sum of B+P+C+$+S, equally weighted.`} position="top">
                          <span className="text-sm font-semibold text-text-primary cursor-help">
                            {total}/25
                          </span>
                        </Tooltip>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {experiment.hasPRDFile ? (
                      <Link
                        href={`/experiments/${slugify(experiment.name)}`}
                        className="text-accent-primary hover:underline"
                        title="PRD exists"
                      >
                        ✓
                      </Link>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {experiment.hasPrototypeDir ? (
                      <Link
                        href={`/experiments/${slugify(experiment.name)}`}
                        className="text-accent-primary hover:underline"
                        title="Prototype exists"
                      >
                        ✓
                      </Link>
                    ) : (
                      <span className="text-text-muted">—</span>
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
  );
}
