import Sidebar from "@/components/Sidebar";
import { getPrototypes, getExperimentById } from "@/lib/data";
import { slugify } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default async function PrototypesPage() {
  const prototypes = await getPrototypes();
  
  // Get experiments to get names for slugs
  const prototypesWithExperiments = await Promise.all(
    prototypes.map(async (prototype) => {
      const experiment = await getExperimentById(prototype.experimentId);
      return {
        ...prototype,
        experimentName: experiment?.name || null,
      };
    })
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-2xl font-semibold text-text-primary">Prototypes</h2>
          {prototypesWithExperiments.length === 0 ? (
            <div className="rounded-lg border border-border bg-background-secondary p-8 text-center">
              <p className="text-text-secondary">No prototypes found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prototypesWithExperiments.map((prototype) => (
                <div
                  key={prototype.id}
                  className="rounded-lg border border-border bg-background-secondary p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-text-primary">{prototype.title}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{prototype.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {prototype.port && (
                          <a
                            href={`http://localhost:${prototype.port}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-primary text-white rounded hover:opacity-90 transition text-sm font-medium"
                          >
                            Open Prototype →
                            <span className="font-mono text-xs opacity-75">:${prototype.port}</span>
                          </a>
                        )}
                        {prototype.experimentName && (
                          <Link
                            href={`/experiments/${slugify(prototype.experimentName)}`}
                            className="text-sm text-text-muted hover:text-accent-primary"
                          >
                            View Experiment →
                          </Link>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={prototype.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

