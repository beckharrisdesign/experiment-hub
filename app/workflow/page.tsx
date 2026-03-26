import Header from "@/components/Header";

const steps = [
  {
    number: "01",
    name: "Market Validation",
    unlocks: "PRD",
    description:
      "Run market research to size the opportunity and generate scores across B, P, C, $, S. This is the only step available on a brand-new experiment.",
  },
  {
    number: "02",
    name: "PRD",
    unlocks: "Landing Page + Prototype",
    description:
      "Write a Product Requirements Document from the experiment statement and market research. Unlocks both downstream steps simultaneously.",
  },
  {
    number: "03",
    name: "Landing Page",
    unlocks: "View + iterate",
    description:
      "Build a validation landing page to test demand before writing production code. Can run in parallel with the prototype.",
  },
  {
    number: "04",
    name: "Prototype",
    unlocks: "Start / stop dev server",
    description:
      "Scaffold and build the working prototype. Requires a PRD. Landing page is optional but recommended first.",
  },
];

const rules = [
  "Steps must complete in order — you can't skip to PRD without market validation.",
  "Only the next available step is offered as an action.",
  "Landing Page and Prototype can be built in parallel once the PRD exists.",
  "Market Validation includes both market research and scoring (B, P, C, $, S).",
];

export default function WorkflowPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-background-primary px-16 py-14">
        <h1 className="font-heading text-[48px] font-semibold text-[rgba(247,255,248,0.8)] leading-tight mb-4">
          Workflow
        </h1>
        <p className="text-sm font-light text-text-secondary max-w-xl leading-6">
          Every experiment moves through four stages in strict order. Each step
          gates the next — so the work stays grounded before code gets written.
        </p>
      </section>

      {/* Steps */}
      <section className="bg-background-light px-16 py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-lg border border-border-dark bg-white overflow-hidden divide-y divide-border-dark">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-6 px-6 py-5"
              >
                <span className="font-mono text-xs font-bold text-accent-primary shrink-0 w-6 pt-0.5">
                  {step.number}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2 className="font-heading text-base font-semibold text-text-dark">
                      {step.name}
                    </h2>
                    <span className="text-xs text-text-dark-secondary">
                      unlocks:{" "}
                      <span className="text-accent-primary">
                        {step.unlocks}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-text-dark-secondary leading-5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="rounded-lg border border-border-dark bg-white px-6 py-5">
            <h2 className="font-heading text-base font-semibold text-text-dark mb-3">
              Rules
            </h2>
            <ul className="space-y-2">
              {rules.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-2 text-sm text-text-dark-secondary"
                >
                  <span className="text-accent-primary shrink-0 mt-0.5">·</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
