import ScoreBadge from "./ScoreBadge";

interface ScoreCardProps {
  value: number | undefined;
  label: string;
  fullName: string;
  rationale: React.ReactNode;
}

export default function ScoreCard({
  value,
  label,
  fullName,
  rationale,
}: ScoreCardProps) {
  return (
    <div className="rounded-lg border border-border bg-background-secondary p-5">
      <div className="mb-3 flex flex-col items-center">
        <ScoreBadge value={value} label={label} fullName={fullName} />
        <h3 className="mt-3 text-center text-sm font-semibold text-text-primary">
          {fullName}
        </h3>
      </div>
      {rationale && <p className="text-sm text-text-secondary">{rationale}</p>}
    </div>
  );
}
