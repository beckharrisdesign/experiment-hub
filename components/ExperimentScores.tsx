import type { ExperimentScores } from "@/types";

interface ExperimentScoresProps {
  scores: ExperimentScores;
  showLabels?: boolean;
  compact?: boolean;
}

const scoreLabels = {
  businessOpportunity: "Business Opportunity",
  personalImpact: "Personal Impact",
  competitiveAdvantage: "Competitive Advantage",
  platformCost: "Platform Cost",
  socialImpact: "Social Impact",
};

const scoreDescriptions = {
  businessOpportunity: "Market potential and revenue opportunity",
  personalImpact: "Would I personally use/benefit from this?",
  competitiveAdvantage: "Market competition and differentiation",
  platformCost: "Solo buildability with AI tools (Cursor) + infrastructure complexity",
  socialImpact: "Fun, joy, and whether the world needs this",
};

export default function ExperimentScoresDisplay({
  scores,
  showLabels = true,
  compact = false,
}: ExperimentScoresProps) {
  const scoreEntries = Object.entries(scores) as [keyof ExperimentScores, number][];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {scoreEntries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-center gap-1 rounded-md bg-background-tertiary px-2 py-1 text-xs"
            title={`${scoreLabels[key]}: ${value}/5 - ${scoreDescriptions[key]}`}
          >
            <span className="text-text-muted">{scoreLabels[key].split(" ")[0]}:</span>
            <span className="font-medium text-text-primary">{value}/5</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scoreEntries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {scoreLabels[key]}
              </span>
              <span className="text-xs text-text-muted">({scoreDescriptions[key]})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <div
                  key={num}
                  className={`h-3 w-3 rounded ${
                    num <= value
                      ? "bg-accent-primary"
                      : "bg-background-tertiary border border-border"
                  }`}
                />
              ))}
            </div>
            <span className="w-8 text-right text-sm font-medium text-text-primary">
              {value}/5
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

