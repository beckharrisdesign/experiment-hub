"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import Header from "@/components/Header";
import type { Experiment, Prototype, Documentation } from "@/types";
import { slugify } from "@/lib/utils";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
  tam?: string | null;
}

interface HomePageClientProps {
  initialExperiments: ExperimentWithRelated[];
}

function CompactScores({ scores }: { scores?: Experiment["scores"] }) {
  if (!scores) {
    return <span className="text-text-muted">—</span>;
  }

  const scoreValues = [
    { label: "B", value: scores.businessOpportunity },
    { label: "P", value: scores.personalImpact },
    { label: "C", value: scores.competitiveAdvantage },
    { label: "$", value: scores.platformCost },
    { label: "S", value: scores.socialImpact },
  ];

  const hasUndefined = scoreValues.some((item) => item.value === undefined);

  if (hasUndefined) {
    return <span className="text-text-muted">—</span>;
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      {scoreValues.map((item, index) => {
        const getBadgeColor = (value: number | undefined) => {
          if (value === 5) return "bg-green-600 border-green-500";
          if (value === 4) return "bg-lime-500 border-lime-400";
          return "bg-background-tertiary border-border";
        };

        return (
          <div
            key={index}
            className="flex flex-col items-center gap-0.5"
            title={`${item.label === "B" ? "Business" : item.label === "P" ? "Personal" : item.label === "C" ? "Competitive" : item.label === "$" ? "Cost" : "Social"}: ${item.value}/5`}
          >
            <span className="text-xs text-text-muted">{item.label}</span>
            <span
              className={`inline-flex items-center justify-center h-6 w-6 rounded-md border text-xs font-medium text-white ${getBadgeColor(
                item.value
              )}`}
            >
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePageClient({ initialExperiments }: HomePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExperiments = useMemo(() => {
    if (!searchQuery.trim()) {
      return initialExperiments;
    }

    const query = searchQuery.toLowerCase();
    return initialExperiments.filter(
      (exp) =>
        exp.name.toLowerCase().includes(query) ||
        exp.statement.toLowerCase().includes(query) ||
        exp.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [initialExperiments, searchQuery]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="p-8">
        <div className="mb-6">
          <SearchBar placeholder="Search experiments..." onSearch={setSearchQuery} />
        </div>

      {filteredExperiments.length === 0 ? (
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                  Experiment
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  TAM
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Scores
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  PRD
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Prototype
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredExperiments.map((experiment) => (
                <tr
                  key={experiment.id}
                  className="border-b border-border transition-colors hover:bg-background-tertiary"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/experiments/${slugify(experiment.name)}`}
                      className="block hover:text-accent-primary"
                    >
                      <div className="font-medium text-text-primary">{experiment.name}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={experiment.status} />
                        <span className="text-xs text-text-muted">
                          {new Date(experiment.createdDate).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {experiment.tam ? (
                      <span className="text-sm text-text-primary font-mono">{experiment.tam}</span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CompactScores scores={experiment.scores} />
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
