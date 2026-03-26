interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  note?: string;
}

export default function MetricCard({
  label,
  value,
  description,
  note,
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-background-secondary p-6">
      <div className="mb-2 text-sm font-medium text-text-secondary">
        {label}
      </div>
      <div className="text-3xl font-bold text-accent-primary">{value}</div>
      <div className="mt-2 text-xs text-text-muted">{description}</div>
      {note && (
        <div className="mt-2 border-t border-border pt-2 text-xs italic text-text-secondary">
          {note}
        </div>
      )}
    </div>
  );
}
