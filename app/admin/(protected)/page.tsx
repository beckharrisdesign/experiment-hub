import { getExperiments } from "@/lib/data";
import type { ExperimentStatus } from "@/types";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<ExperimentStatus, string> = {
  Active: "text-green-400",
  Completed: "text-blue-400",
  Abandoned: "text-text-secondary",
  "On Hold": "text-yellow-400",
  Archived: "text-text-secondary",
  Graduated: "text-purple-400",
};

export default async function AdminPage() {
  const experiments = await getExperiments();
  const sorted = [...experiments].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <h1 className="text-text-primary text-2xl font-semibold mb-6">
        Experiments
      </h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-secondary border-b border-border-dark">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 font-medium">Modified</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((exp) => (
            <tr
              key={exp.id}
              className="border-b border-border-dark hover:bg-background-secondary transition-colors"
            >
              <td className="py-3 pr-4">
                <a
                  href={`/experiments/${exp.id}`}
                  className="text-text-primary hover:text-accent-primary transition-colors font-medium"
                >
                  {exp.name}
                </a>
                {exp.statement && (
                  <p className="text-text-secondary text-xs mt-0.5 line-clamp-1">
                    {exp.statement}
                  </p>
                )}
              </td>
              <td className={`py-3 pr-4 ${STATUS_COLORS[exp.status]}`}>
                {exp.status}
              </td>
              <td className="py-3 pr-4 text-text-secondary capitalize">
                {exp.type ?? "commercial"}
              </td>
              <td className="py-3 text-text-secondary">{exp.lastModified}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
