import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { listChanges, type ChangeSummary } from "@/lib/change-visualizer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Changes — BHD Labs",
  description: "Every OpenSpec change in the hub, and what stage it is in.",
};

function ChangeRow({ change }: { change: ChangeSummary }) {
  return (
    <li>
      <Link
        href={`/changes/${change.id}`}
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border px-1 py-3 transition-colors hover:bg-background-secondary"
      >
        <span className="font-mono text-[15px] text-text-primary">{change.id}</span>
        <span className="ml-auto font-mono text-[13px] text-text-muted">
          {change.stageLabel}
        </span>
        {change.capabilities > 1 && (
          <span className="font-mono text-[13px] text-text-muted">
            {change.capabilities} capabilities
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * An index, deliberately not a dashboard.
 *
 * The change page's premise is one change at a time, and this does not argue
 * with that — it exists because forty-nine pages nobody can navigate to are
 * forty-nine pages nobody reads. Name, stage, and a link; no scoring, no
 * sorting, no progress bars.
 */
export default async function ChangesIndex() {
  const changes = await listChanges();
  const active = changes.filter((c) => !c.archived);
  const archived = changes.filter((c) => c.archived);

  return (
    <div className="flex min-h-screen flex-col bg-background-primary">
      <Header />
      <main className="flex-1 px-4 py-10 md:px-8 lg:px-16">
        <div className="mx-auto flex max-w-screen-md flex-col gap-10">
          <header className="flex flex-col gap-3">
            <h1 className="font-heading text-3xl font-semibold text-text-primary lg:text-4xl">
              Changes
            </h1>
            <p className="text-[15px] leading-relaxed text-text-muted">
              Every OpenSpec change in the hub. Each one opens as a single page —
              what it is for, the stage it is in, what is actually proven, and
              where it disagrees with itself.
            </p>
          </header>

          <section aria-labelledby="in-flight" className="flex flex-col gap-4">
            <h2
              id="in-flight"
              className="font-mono text-[13px] tracking-[0.09em] text-text-muted"
            >
              IN FLIGHT — {active.length}
            </h2>
            <ul className="flex flex-col">
              {active.map((change) => (
                <ChangeRow key={change.id} change={change} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="archived" className="flex flex-col gap-4">
            <h2
              id="archived"
              className="font-mono text-[13px] tracking-[0.09em] text-text-muted"
            >
              ARCHIVED — {archived.length}
            </h2>
            <ul className="flex flex-col">
              {archived.map((change) => (
                <ChangeRow key={change.id} change={change} />
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
