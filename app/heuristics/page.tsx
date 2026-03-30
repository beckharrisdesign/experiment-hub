import Header from "@/components/Header";
import { agentRubrics } from "@/lib/agent-rubrics";

export default function HeuristicsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-background-primary px-16 py-14">
        <h1 className="font-heading text-[48px] font-semibold text-[rgba(247,255,248,0.8)] leading-tight mb-4">
          Heuristics
        </h1>
        <p className="text-sm font-light text-text-secondary max-w-xl leading-6">
          Each agent in the workflow is a specialist reviewer with a defined
          rubric. These are the criteria they apply — and the contract that
          keeps the whole system consistent.
        </p>
      </section>

      {/* Agent rubric cards */}
      <section className="bg-background-light px-16 py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-4">
          {agentRubrics.map((agent) => (
            <div
              key={agent.handle}
              className="rounded-lg border border-border-dark bg-white overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-baseline gap-4 px-6 py-4 border-b border-border-dark bg-[rgba(20,174,92,0.03)]">
                <span className="font-mono text-sm font-bold text-accent-primary">
                  @{agent.handle}
                </span>
                <span className="text-xs text-text-dark-secondary">
                  {agent.role}
                </span>
                <span className="ml-auto text-xs text-text-dark-secondary">
                  {agent.input} → {agent.output}
                </span>
              </div>

              {/* Rubric checklist */}
              <ul className="px-6 py-4 space-y-2">
                {agent.rubric.map((criterion) => (
                  <li
                    key={criterion}
                    className="flex items-start gap-3 text-sm text-text-dark-secondary leading-5"
                  >
                    <span className="text-accent-primary shrink-0 mt-0.5 font-bold">
                      ✓
                    </span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
