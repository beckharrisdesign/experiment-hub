import type { ExperimentKind } from "@/types";

interface ExperimentTypeBadgeProps {
  type?: ExperimentKind;
}

const typeStyles: Record<ExperimentKind, string> = {
  commercial: "bg-background-secondary text-text-secondary border-border",
  tool: "bg-accent-primary/15 text-accent-primary border-accent-primary/40",
  personal: "bg-warning/15 text-warning border-warning/40",
};

const typeLabels: Record<ExperimentKind, string> = {
  commercial: "Commercial",
  tool: "Tool",
  personal: "Personal",
};

export default function ExperimentTypeBadge({ type }: ExperimentTypeBadgeProps) {
  if (!type || type === "commercial") return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeStyles[type]}`}
    >
      {typeLabels[type]}
    </span>
  );
}
