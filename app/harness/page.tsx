"use client";

import Header from "@/components/Header";
import MermaidDiagram from "@/components/MermaidDiagram";

const architectureDiagram = `
flowchart TB
  subgraph central["/agents/ — hub-level"]
    direction LR
    WF["Workflow\nexperiment-creator\nmarket-research\nprd-writer\nprototype-builder"]
    QA["Quality\ndesign-advisor\ndesign-guidelines\ncommit-message\nscoring-criteria"]
  end

  subgraph exp["/experiments/{slug}/agents/ — experiment-level"]
    EA["Domain-specific\nlisting-generator\nretail-advisor\ntest-generator\n…"]
  end

  central -->|"referenced by"| exp
`;

const centralAgents = [
  {
    category: "Workflow",
    agents: [
      {
        name: "experiment-creator",
        role: "Product Strategist",
        desc: "Turns a raw idea into a structured experiment with metadata and directory.",
      },
      {
        name: "market-research",
        role: "Entrepreneurship Mentor",
        desc: "Researches TAM/SAM/SOM, competitive landscape, and generates experiment scores.",
      },
      {
        name: "prd-writer",
        role: "Product Manager",
        desc: "Produces a comprehensive PRD from the experiment statement and market research.",
      },
      {
        name: "prototype-builder",
        role: "Engineering Lead",
        desc: "Scaffolds the prototype from the PRD and wires up the dev environment.",
      },
    ],
  },
  {
    category: "Quality",
    agents: [
      {
        name: "design-advisor",
        role: "UX Director",
        desc: "Reviews code and live URLs for design quality, accessibility, and heuristics. Auto-invoked by prd-writer and prototype-builder.",
      },
      {
        name: "design-guidelines",
        role: "Reference",
        desc: "Design system and UX principles used by design-advisor and prototype-builder.",
      },
      {
        name: "commit-message",
        role: "Reference",
        desc: "Standards for well-formed commit messages.",
      },
      {
        name: "scoring-criteria",
        role: "Reference",
        desc: "Detailed 1–5 rubric for each scoring dimension.",
      },
    ],
  },
];

export default function HarnessPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-background-primary px-16 py-14">
        <h1 className="font-heading text-[48px] font-semibold text-[rgba(247,255,248,0.8)] leading-tight mb-4">
          Agent Harness
        </h1>
        <p className="text-sm font-light text-text-secondary max-w-xl leading-6">
          A layered system of AI agents that guide each experiment from initial
          idea to shipped prototype. Central agents define workflow standards;
          experiment-specific agents add domain intelligence on top.
        </p>
      </section>

      <section className="bg-background-light px-16 py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Architecture */}
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-dark mb-1">
              Architecture
            </h2>
            <p className="text-sm text-text-dark-secondary mb-4">
              Two layers: hub-level agents shared across all experiments, and
              experiment-specific agents for domain intelligence.
            </p>
            <div className="rounded-lg border border-border-dark bg-white p-6 overflow-x-auto">
              <MermaidDiagram chart={architectureDiagram} />
            </div>
          </div>

          {/* Agent list */}
          {centralAgents.map((group) => (
            <div key={group.category}>
              <h2 className="font-heading text-lg font-semibold text-text-dark mb-3">
                {group.category} agents
              </h2>
              <div className="rounded-lg border border-border-dark bg-white overflow-hidden divide-y divide-border-dark">
                {group.agents.map((agent) => (
                  <div
                    key={agent.name}
                    className="flex items-start gap-4 px-6 py-4"
                  >
                    <code className="text-xs font-mono bg-background-mint text-text-dark px-2 py-1 rounded shrink-0 mt-0.5">
                      @{agent.name}
                    </code>
                    <div>
                      <span className="text-xs text-text-dark-secondary font-medium uppercase tracking-wide">
                        {agent.role}
                      </span>
                      <p className="text-sm text-text-dark mt-0.5">
                        {agent.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Experiment-specific agents */}
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-dark mb-1">
              Experiment-specific agents
            </h2>
            <p className="text-sm text-text-dark-secondary mb-3">
              Live at{" "}
              <code className="text-xs bg-background-mint text-text-dark px-1.5 py-0.5 rounded">
                /experiments/&#123;slug&#125;/agents/
              </code>
              . They extend or compose central agents with domain knowledge
              unique to that experiment.
            </p>
            <div className="rounded-lg border border-border-dark bg-white overflow-hidden divide-y divide-border-dark">
              {[
                {
                  pattern: "Domain agent",
                  example: "listing-generator",
                  desc: "Experiment-specific capability not present in any central agent.",
                },
                {
                  pattern: "Extension",
                  example: "prototype-builder-extensions",
                  desc: "Adds extra steps on top of a central agent for this experiment only.",
                },
                {
                  pattern: "Composition",
                  example: "listing-workflow",
                  desc: "Orchestrates multiple agents into a domain-specific sequence.",
                },
              ].map((row) => (
                <div
                  key={row.pattern}
                  className="flex items-start gap-4 px-6 py-4"
                >
                  <span className="text-xs font-medium text-accent-primary shrink-0 w-28 mt-0.5">
                    {row.pattern}
                  </span>
                  <div>
                    <code className="text-xs font-mono text-text-dark-secondary">
                      {row.example}.md
                    </code>
                    <p className="text-sm text-text-dark mt-0.5">{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
