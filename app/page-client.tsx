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
}

interface HomePageClientProps {
  initialExperiments: ExperimentWithRelated[];
}

function ScoreCell({ value }: { value: number | undefined }) {
  if (value === undefined) {
    return <span className="text-text-muted">—</span>;
  }
  return (
    <div className="flex items-center justify-center gap-1">
      <span className="font-medium text-text-primary">{value}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((num) => (
          <div
            key={num}
            className={`h-2 w-2 rounded ${
              num <= value
                ? "bg-accent-primary"
                : "bg-background-tertiary border border-border"
            }`}
          />
        ))}
      </div>
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
                  Business
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Personal
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Competitive
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Cost
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                  Social
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
                  <td className="px-4 py-3">
                    <ScoreCell value={experiment.scores?.businessOpportunity} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCell value={experiment.scores?.personalImpact} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCell value={experiment.scores?.competitiveAdvantage} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCell value={experiment.scores?.platformCost} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCell value={experiment.scores?.socialImpact} />
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
