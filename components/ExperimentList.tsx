import Link from "next/link";
import type { Experiment } from "@/types";
import { slugify } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import ExperimentScoresDisplay from "./ExperimentScores";

interface ExperimentListProps {
  experiments: Experiment[];
}

function calculateAverageScore(scores?: Experiment["scores"]): number | null {
  if (!scores) return null;
  const values = Object.values(scores);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export default function ExperimentList({ experiments }: ExperimentListProps) {
  if (experiments.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background-secondary p-8 text-center">
        <p className="text-text-secondary">No experiments found.</p>
        <p className="mt-2 text-sm text-text-muted">
          Create your first experiment using @experiment-creator
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {experiments.map((experiment) => {
        const avgScore = calculateAverageScore(experiment.scores);
        return (
          <Link
            key={experiment.id}
            href={`/experiments/${slugify(experiment.name)}`}
            className="block rounded-lg border border-border bg-background-secondary p-4 transition-colors hover:border-accent-primary/50 hover:bg-background-tertiary"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">{experiment.statement}</h3>
                <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
                  <span>{new Date(experiment.createdDate).toLocaleDateString()}</span>
                  {experiment.tags.length > 0 && (
                    <span className="text-text-muted">
                      {experiment.tags.slice(0, 3).join(", ")}
                      {experiment.tags.length > 3 && "..."}
                    </span>
                  )}
                </div>
                {experiment.scores && (
                  <div className="mt-3">
                    <ExperimentScoresDisplay scores={experiment.scores} compact={true} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={experiment.status} />
                {avgScore !== null && (
                  <div className="text-xs">
                    <span className="text-text-muted">Avg: </span>
                    <span className="font-medium text-text-primary">{avgScore}/5</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

