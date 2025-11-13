import type { ExperimentStatus, PrototypeStatus } from "@/types";

type Status = ExperimentStatus | PrototypeStatus;

interface StatusBadgeProps {
  status: Status;
}

const statusColors: Record<Status, string> = {
  Active: "bg-success/20 text-success border-success/30",
  Completed: "bg-accent-primary/20 text-accent-primary border-accent-primary/30",
  Abandoned: "bg-error/20 text-error border-error/30",
  "On Hold": "bg-warning/20 text-warning border-warning/30",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
    >
      {status}
    </span>
  );
}

