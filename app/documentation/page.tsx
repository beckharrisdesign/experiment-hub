import Sidebar from "@/components/Sidebar";
import { getDocumentation, getExperimentById } from "@/lib/data";
import { slugify } from "@/lib/utils";
import Link from "next/link";

export default async function DocumentationPage() {
  const docs = await getDocumentation();
  
  // Get experiments to get names for slugs
  const docsWithExperiments = await Promise.all(
    docs.map(async (doc) => {
      const experiment = await getExperimentById(doc.experimentId);
      return {
        ...doc,
        experimentName: experiment?.name || null,
      };
    })
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-2xl font-semibold text-text-primary">Documentation</h2>
          {docsWithExperiments.length === 0 ? (
            <div className="rounded-lg border border-border bg-background-secondary p-8 text-center">
              <p className="text-text-secondary">No documentation found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docsWithExperiments.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-border bg-background-secondary p-4"
                >
                  <h3 className="font-medium text-text-primary">{doc.title}</h3>
                  {doc.experimentName && (
                    <div className="mt-2 text-sm text-text-secondary">
                      <Link
                        href={`/experiments/${slugify(doc.experimentName)}`}
                        className="hover:text-accent-primary"
                      >
                        View Experiment →
                      </Link>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-text-muted">
                    {new Date(doc.lastModified).toLocaleDateString()}
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

