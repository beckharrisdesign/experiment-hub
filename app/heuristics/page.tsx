import Header from "@/components/Header";

const reviewTypes = [
  {
    number: "01",
    name: "Design review",
    agent: "@design-advisor",
    description:
      "Evaluates prototype code and live deployed URLs against design heuristics — layout, spacing, typography, color, and interaction patterns. Invoked automatically by the PRD writer and prototype builder, or on demand for any deployed URL.",
  },
  {
    number: "02",
    name: "PRD review",
    agent: "@prd-writer",
    description:
      "Reviews the product requirements document for completeness, clarity, and scope. Checks that user stories are grounded in the market research and that edge cases are accounted for before prototype work begins.",
  },
  {
    number: "03",
    name: "Market review",
    agent: "@market-research",
    description:
      "Validates the TAM/SAM/SOM analysis using bottom-up methodology — competitor revenue anchors, real-world signals, and explicit assumptions. Generates the experiment score that drives prioritization.",
  },
  {
    number: "04",
    name: "Code review",
    agent: "@commit-message",
    description:
      "Applies conventional commit formatting and reviews changes for scope creep, security issues, and unnecessary complexity before committing. Keeps the Git history readable and the codebase focused.",
  },
];

const principles = [
  "Every significant decision gets written down — not just what was done, but why.",
  "Reviews happen at natural checkpoints, not as interruptions to flow.",
  "The goal is to be able to pick up any experiment cold and understand its current state in under five minutes.",
  "Design reviews use both code-level analysis and live browser evaluation — neither alone is sufficient.",
];

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
          Structured reviews at each stage of the experiment workflow. Design
          and product decisions are captured in writing as work happens — so any
          experiment can be picked back up with full context intact.
        </p>
      </section>

      {/* Review types */}
      <section className="bg-background-light px-16 py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-lg border border-border-dark bg-white overflow-hidden divide-y divide-border-dark">
            {reviewTypes.map((review) => (
              <div
                key={review.number}
                className="flex items-start gap-6 px-6 py-5"
              >
                <span className="font-mono text-xs font-bold text-accent-primary shrink-0 w-6 pt-0.5">
                  {review.number}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2 className="font-heading text-base font-semibold text-text-dark">
                      {review.name}
                    </h2>
                    <span className="font-mono text-xs text-text-dark-secondary">
                      {review.agent}
                    </span>
                  </div>
                  <p className="text-sm text-text-dark-secondary leading-5">
                    {review.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Principles */}
          <div className="rounded-lg border border-border-dark bg-white px-6 py-5">
            <h2 className="font-heading text-base font-semibold text-text-dark mb-3">
              Principles
            </h2>
            <ul className="space-y-2">
              {principles.map((principle) => (
                <li
                  key={principle}
                  className="flex items-start gap-2 text-sm text-text-dark-secondary"
                >
                  <span className="text-accent-primary shrink-0 mt-0.5">·</span>
                  {principle}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
