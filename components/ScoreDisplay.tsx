import ScoreBadge from "./ScoreBadge";
import Tooltip from "./Tooltip";

interface ScoreDisplayProps {
  scores?: {
    businessOpportunity?: number;
    personalImpact?: number;
    competitiveAdvantage?: number;
    platformCost?: number;
    socialImpact?: number;
  } | null;
}

function calculateTotalScore(scores: ScoreDisplayProps["scores"]): number | null {
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

export default function ScoreDisplay({ scores }: ScoreDisplayProps) {
  const total = calculateTotalScore(scores);
  
  // Color scale for total score: 20-25 = green, 15-19 = yellow, 10-14 = orange, 5-9 = red
  const getTotalBadgeColor = (score: number) => {
    if (score >= 20) return "bg-score-5/20 border-score-5/40 text-score-5";
    if (score >= 15) return "bg-score-3/20 border-score-3/40 text-score-3";
    if (score >= 10) return "bg-score-2/20 border-score-2/40 text-score-2";
    return "bg-score-1/20 border-score-1/40 text-score-1";
  };

  return (
    <div className="flex items-center gap-1.5">
      <ScoreBadge value={scores?.businessOpportunity} label="B" fullName="Business Opportunity" />
      <ScoreBadge value={scores?.personalImpact} label="P" fullName="Personal Impact" />
      <ScoreBadge value={scores?.competitiveAdvantage} label="C" fullName="Competitive Advantage" />
      <ScoreBadge value={scores?.platformCost} label="$" fullName="Platform Cost" />
      <ScoreBadge value={scores?.socialImpact} label="S" fullName="Social Impact" />
      {total !== null && (
        <Tooltip content={`Total: ${total}/25 (${Math.round((total / 25) * 100)}%). Sum of B+P+C+$+S, equally weighted.`} position="top">
          <span
            className={`inline-flex items-center justify-center h-6 w-8 rounded-md border text-xs font-semibold cursor-help ${getTotalBadgeColor(total)}`}
          >
            {total}
          </span>
        </Tooltip>
      )}
    </div>
  );
}

