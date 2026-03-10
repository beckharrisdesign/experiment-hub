interface ScoreBadgeProps {
  value: number | undefined;
  label: string;
  fullName: string;
}

export default function ScoreBadge({ value, label, fullName }: ScoreBadgeProps) {
  if (value === undefined) {
    return <span className="text-sm text-text-muted">—</span>;
  }

  // Color scale for numerals: 5 = green, 4 = lime, 3 = yellow, 2 = orange, 1 = red
  const getNumberColor = (val: number) => {
    if (val === 5) return "text-green-600";
    if (val === 4) return "text-lime-600";
    if (val === 3) return "text-yellow-600";
    if (val === 2) return "text-orange-600";
    return "text-red-600";
  };

  // Minimal gray badge with colored numeral (text-sm for table readability)
  return (
    <span
      className={`inline-flex items-center justify-center h-6 w-6 rounded text-sm font-normal bg-background-tertiary ${getNumberColor(value)}`}
      title={`${fullName}: ${value}/5`}
    >
      {value}
    </span>
  );
}

