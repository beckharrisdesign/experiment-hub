import Header from "@/components/Header";

const dimensions = [
  {
    key: "B",
    name: "Business Opportunity",
    description: "Market potential and revenue opportunity",
    color: "text-accent-primary border-accent-primary",
    scores: [
      {
        score: 5,
        label: "$1B+ TAM, clear path to $10M+ revenue, validated demand",
      },
      {
        score: 4,
        label: "$500M+ TAM, clear path to $1M+ revenue, good growth",
      },
      {
        score: 3,
        label: "$100M+ TAM, path to $100K+ revenue, uncertain growth",
      },
      {
        score: 2,
        label: "$10M+ TAM, weak market indicators, limited potential",
      },
      {
        score: 1,
        label: "<$10M TAM, unclear revenue path, minimal opportunity",
      },
    ],
  },
  {
    key: "P",
    name: "Personal Impact",
    description: "Would I personally use or benefit from this?",
    color: "text-accent-primary border-accent-primary",
    scores: [
      {
        score: 5,
        label: "Solves a daily problem I face, would use constantly",
      },
      { score: 4, label: "Solves a regular problem, would use frequently" },
      { score: 3, label: "Solves an occasional problem, would use sometimes" },
      { score: 2, label: "Solves a rare problem, would use rarely" },
      { score: 1, label: "No personal use case, wouldn't use it myself" },
    ],
  },
  {
    key: "C",
    name: "Competitive Advantage",
    description: "Market competition and differentiation",
    color: "text-accent-primary border-accent-primary",
    scores: [
      {
        score: 5,
        label:
          "First-mover, unique approach, defensible moat, minimal competition",
      },
      {
        score: 4,
        label: "Clear differentiation, underserved niche, limited competition",
      },
      {
        score: 3,
        label: "Some differentiation, competitive but viable positioning",
      },
      { score: 2, label: "Limited differentiation, highly competitive market" },
      {
        score: 1,
        label: "No differentiation, saturated market, dominant players exist",
      },
    ],
  },
  {
    key: "$",
    name: "Platform Cost",
    description:
      "Solo buildability with AI tools and infrastructure complexity",
    color: "text-accent-primary border-accent-primary",
    scores: [
      {
        score: 5,
        label: "Build solo with AI in <1 month, simple infra, <$50/mo",
      },
      {
        score: 4,
        label: "Build solo in 1–3 months, managed services, $50–200/mo",
      },
      {
        score: 3,
        label: "Build solo in 3–6 months, moderate infra, $200–500/mo",
      },
      {
        score: 2,
        label: "6–12 months even with AI, complex infra, $500–2K/mo",
      },
      { score: 1, label: "12+ months or needs a team, very complex, $2K+/mo" },
    ],
  },
  {
    key: "S",
    name: "Social Impact",
    description: "Fun, joy, and whether the world needs this",
    color: "text-accent-primary border-accent-primary",
    scores: [
      {
        score: 5,
        label:
          "Addresses critical need, serves underserved communities, high joy",
      },
      {
        score: 4,
        label: "Addresses important need, good positive impact, meaningful",
      },
      {
        score: 3,
        label: "Addresses moderate need, some value, neutral contribution",
      },
      { score: 2, label: "Addresses minor need, minimal positive impact" },
      { score: 1, label: "No meaningful impact, no clear benefit to others" },
    ],
  },
];

const scoreColors: Record<number, string> = {
  5: "bg-score-5 text-background-secondary",
  4: "bg-score-4 text-background-secondary",
  3: "bg-score-3 text-background-secondary",
  2: "bg-score-2 text-white",
  1: "bg-score-1 text-white",
};

const totalColors = [
  {
    range: "20–25",
    label: "Strong go",
    color: "bg-score-5 text-background-secondary",
  },
  {
    range: "15–19",
    label: "Promising",
    color: "bg-score-4 text-background-secondary",
  },
  {
    range: "10–14",
    label: "Needs work",
    color: "bg-score-3 text-background-secondary",
  },
  { range: "0–9", label: "Pass", color: "bg-score-1 text-white" },
];

export default function ScoringPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-background-primary px-16 py-14">
        <h1 className="font-heading text-[48px] font-semibold text-[rgba(247,255,248,0.8)] leading-tight mb-4">
          Scoring
        </h1>
        <p className="text-sm font-light text-text-secondary max-w-xl leading-6">
          Every experiment is evaluated across five dimensions. Each dimension
          is scored 1–5, giving a maximum total of 25. Scores are generated
          during market research and inform prioritisation — not perfection.
        </p>
      </section>

      {/* Dimensions */}
      <section className="bg-background-light px-16 py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {dimensions.map((dim) => (
              <div
                key={dim.key}
                className="rounded-lg border border-border-dark bg-white overflow-hidden"
              >
                <div className="flex items-center gap-4 px-6 py-4 border-b border-border-dark">
                  <span className="font-mono font-bold text-lg w-7 text-center text-accent-primary">
                    {dim.key}
                  </span>
                  <div>
                    <h2 className="font-heading text-base font-semibold text-text-dark">
                      {dim.name}
                    </h2>
                    <p className="text-xs text-text-dark-secondary mt-0.5">
                      {dim.description}
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-border-dark">
                  {dim.scores.map(({ score, label }) => (
                    <div
                      key={score}
                      className="flex items-center gap-4 px-6 py-2.5"
                    >
                      <span
                        className={`text-xs font-bold rounded px-2 py-0.5 shrink-0 w-6 text-center ${scoreColors[score]}`}
                      >
                        {score}
                      </span>
                      <p className="text-sm text-text-dark-secondary">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Total score guide */}
          <div className="rounded-lg border border-border-dark bg-white px-6 py-5">
            <h2 className="font-heading text-base font-semibold text-text-dark mb-4">
              Total score
            </h2>
            <div className="flex gap-3 flex-wrap">
              {totalColors.map(({ range, label, color }) => (
                <div key={range} className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold rounded px-2.5 py-1 ${color}`}
                  >
                    {range}
                  </span>
                  <span className="text-sm text-text-dark-secondary">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
