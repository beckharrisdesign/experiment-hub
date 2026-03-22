import type { ValidationStatus } from "@/types";

const statusConfig: Record<ValidationStatus, { label: string; className: string }> = {
  complete: { label: "Complete", className: "bg-success/20 text-success border-success/30" },
  live: { label: "Live", className: "bg-success/20 text-success border-success/30" },
  planned: { label: "Planned", className: "bg-warning/20 text-warning border-warning/30" },
  not_started: { label: "Not Started", className: "bg-text-muted/20 text-text-muted border-text-muted/30" },
};

interface ValidationStatusBadgeProps {
  status: ValidationStatus | undefined;
}

export default function ValidationStatusBadge({ status }: ValidationStatusBadgeProps) {
  const config = statusConfig[status ?? "not_started"];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
